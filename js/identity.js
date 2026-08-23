// js/identity.js
// Sistema completo usando Firebase Auth (email/senha) + RTDB para dados
// Admin: posseydom@gmail.com / manu123@ (UID added to /admins in Database)

import { ref, onValue, set, update, remove, get, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { db, auth } from "./firebase-config.js";
import { escapeHtml } from "./utils.js";

const NICK_KEY = "counteritz_nick";
const ADMIN_SESSION_KEY = "counteritz_admin_session";

let currentNick = null;
let currentUser = null; // Firebase User
let isAdminUser = false;
let playersCache = {};
let bannedCache = [];
let mixesCache = {};
let listenersInitialized = false;
let authReady = false;

// Callbacks
const listeners = new Set();
function notifyListeners() {
  listeners.forEach(cb => cb());
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---- Níveis / cores ----
export function getLevelColor(level) {
  const levels = [
    { max: 1000, color: "#38bdf8" }, { max: 10000, color: "#0c4a6e" },
    { max: 15000, color: "#ec4899" }, { max: 20000, color: "#a855f7" },
    { max: 25000, color: "#ef4444" }, { max: 30000, color: "#eab308" },
  ];
  if (level <= 1000) return levels[0].color;
  if (level >= 30000) return levels[5].color;
  for (let i = 0; i < levels.length - 1; i++) {
    if (level >= levels[i].max && level <= levels[i + 1].max) {
      const ratio = (level - levels[i].max) / (levels[i + 1].max - levels[i].max);
      return interpolateColor(levels[i].color, levels[i + 1].color, ratio);
    }
  }
  return levels[5].color;
}

function interpolateColor(c1, c2, r) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r1 = (a >> 16) & 255, g1 = (a >> 8) & 255, b1 = a & 255;
  const r2 = (b >> 16) & 255, g2 = (b >> 8) & 255, b2 = b & 255;
  const rr = Math.round(r1 + (r2 - r1) * r);
  const gg = Math.round(g1 + (g2 - g1) * r);
  const bb = Math.round(b1 + (b2 - b1) * r);
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, "0")}`;
}

export function formatLevel(level) {
  if (level >= 1000000) return `${(level / 1000000).toFixed(1)}M`;
  if (level >= 1000) return `${(level / 1000).toFixed(0)}k`;
  return level.toString();
}

// ---- Session ----
export function getNick() {
  if (currentNick) return currentNick;
  try { currentNick = localStorage.getItem(NICK_KEY) || null; } catch { currentNick = null; }
  return currentNick;
}

export function setNick(nick) {
  try { localStorage.setItem(NICK_KEY, nick); currentNick = nick; } catch {}
}

export function clearSession() {
  try { localStorage.removeItem(NICK_KEY); currentNick = null; } catch {}
}

// ---- Firebase Listeners ----
function startListeners() {
  if (listenersInitialized) return;
  onValue(ref(db, "players"), snap => { playersCache = snap.val() || {}; notifyListeners(); });
  onValue(ref(db, "banned"), snap => { bannedCache = snap.val() || []; notifyListeners(); });
  onValue(ref(db, "mixes"), snap => { mixesCache = snap.val() || {}; notifyListeners(); });
  listenersInitialized = true;
}

// ---- Auth ----
export function isAdminLoggedIn() { return isAdminUser && auth.currentUser !== null; }

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerUser(email, password, nick) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: nick });
  // Create player profile in RTDB
  await set(ref(db, `players/${cred.user.uid}`), {
    nick, email, level: 1000, createdAt: Date.now()
  });
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
  clearSession();
}

function checkAdminStatus(uid) {
  return get(ref(db, `admins/${uid}`)).then(snap => snap.exists());
}

function setupAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      isAdminUser = await checkAdminStatus(user.uid);
      authReady = true;
      // Load nick from profile or RTDB
      const playerSnap = await get(ref(db, `players/${user.uid}`));
      if (playerSnap.exists()) {
        currentNick = playerSnap.val().nick;
        setNick(currentNick);
      } else if (user.displayName) {
        currentNick = user.displayName;
        setNick(currentNick);
      }
      startListeners();
      notifyListeners();
    } else {
      isAdminUser = false;
      authReady = true;
      currentNick = null;
      playersCache = {}; bannedCache = []; mixesCache = {};
      notifyListeners();
    }
  });
}
setupAuthListener();

// ---- Players ----
export function getAllPlayers() {
  const arr = [];
  for (const [uid, data] of Object.entries(playersCache)) {
    if (data.nick) arr.push({ uid, nick: data.nick, level: data.level || 1000, banned: bannedCache.includes(data.nick) });
  }
  arr.sort((a, b) => b.level - a.level);
  return arr;
}

export function getPlayerByNick(nick) {
  for (const [uid, data] of Object.entries(playersCache)) if (data.nick === nick) return { uid, ...data };
  return null;
}

export function nickExists(nick) { return getPlayerByNick(nick) !== null; }

// Admin-only operations
export async function setPlayerLevel(nick, level) {
  if (!isAdminLoggedIn()) throw new Error("Apenas admin");
  const p = getPlayerByNick(nick);
  if (!p) throw new Error("Player não encontrado");
  await update(ref(db, `players/${p.uid}`), { level: Math.max(1000, Math.min(30000, level)) });
}

export async function banNick(nick) {
  if (!isAdminLoggedIn()) throw new Error("Apenas admin");
  if (bannedCache.includes(nick)) return;
  await set(ref(db, "banned"), [...bannedCache, nick]);
}

export async function unbanNick(nick) {
  if (!isAdminLoggedIn()) throw new Error("Apenas admin");
  await set(ref(db, "banned"), bannedCache.filter(n => n !== nick));
}

export function getBannedNicks() { return [...bannedCache]; }
export function isBanned(nick) { return bannedCache.includes(nick); }

// ---- Mixes ----
export function getMix(dateKey) { return mixesCache[dateKey] || { type: "none", slots: {}, complete: {} }; }
export function countSlots(dateKey) { const d = mixesCache[dateKey]; return d?.slots ? Object.values(d.slots).filter(Boolean).length : 0; }
export function countComplete(dateKey) { const d = mixesCache[dateKey]; return d?.complete ? Object.values(d.complete).filter(Boolean).length : 0; }

export async function setMixType(dateKey, type) {
  if (!currentUser) throw new Error("Faça login primeiro");
  await update(ref(db, `mixes/${dateKey}`), { type });
}

export async function joinSlot(dateKey, slot, nick) {
  if (!currentUser) throw new Error("Faça login primeiro");
  await set(ref(db, `mixes/${dateKey}/slots/${slot}`), nick);
}

export async function leaveSlot(dateKey, slot, nick) {
  if (!currentUser) throw new Error("Faça login primeiro");
  const snap = await get(ref(db, `mixes/${dateKey}/slots/${slot}`));
  if (snap.val() === nick) await remove(ref(db, `mixes/${dateKey}/slots/${slot}`));
}

export async function joinComplete(dateKey, slot, nick) {
  if (!currentUser) throw new Error("Faça login primeiro");
  await set(ref(db, `mixes/${dateKey}/complete/${slot}`), nick);
}

export async function leaveComplete(dateKey, slot, nick) {
  if (!currentUser) throw new Error("Faça login primeiro");
  const snap = await get(ref(db, `mixes/${dateKey}/complete/${slot}`));
  if (snap.val() === nick) await remove(ref(db, `mixes/${dateKey}/complete/${slot}`));
}
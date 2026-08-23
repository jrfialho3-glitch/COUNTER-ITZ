// js/identity.js
// Sistema de identidade, níveis e admin usando Firebase Auth + RTDB
// TODOS OS DADOS AGORA SÃO SINCRONIZADOS EM TEMPO REAL VIA FIREBASE

import { ref, onValue, set, update, remove, get, push, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { db, auth } from "./firebase-config.js";
import { escapeHtml } from "./utils.js";

// Chaves do localStorage (apenas para sessão atual do nick)
const NICK_KEY = "counteritz_nick";
const PASS_KEY = "counteritz_pass";

let currentNick = null;
let currentPass = null;
let adminUnsubscribe = null;
let playersUnsubscribe = null;
let bannedUnsubscribe = null;
let mixesUnsubscribe = null;
let isAdminUser = false;
let playersCache = {};
let bannedCache = [];
let mixesCache = {};
let authReady = false;

// Callbacks para notificar UI de mudanças
const listeners = new Set();
function notifyListeners() {
  listeners.forEach(cb => cb());
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---- Sistema de níveis (cores degradadas) ----
export function getLevelColor(level) {
  // 1k = azul claro, 10k = azul escuro, 15k = rosa, 20k = roxo, 25k = vermelho, 30k = amarelo
  const levels = [
    { max: 1000, color: "#38bdf8" },    // azul claro
    { max: 10000, color: "#0c4a6e" },   // azul escuro
    { max: 15000, color: "#ec4899" },   // rosa
    { max: 20000, color: "#a855f7" },   // roxo
    { max: 25000, color: "#ef4444" },   // vermelho
    { max: 30000, color: "#eab308" },   // amarelo
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

function interpolateColor(color1, color2, ratio) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;

  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function formatLevel(level) {
  if (level >= 1000000) return `${(level / 1000000).toFixed(1)}M`;
  if (level >= 1000) return `${(level / 1000).toFixed(0)}k`;
  return level.toString();
}

// ---- Session local (nick atual) ----
export function getNick() {
  if (currentNick) return currentNick;
  try {
    currentNick = localStorage.getItem(NICK_KEY) || null;
    currentPass = localStorage.getItem(PASS_KEY) || null;
  } catch {
    currentNick = null;
    currentPass = null;
  }
  return currentNick;
}

export function getPass() {
  if (currentPass) return currentPass;
  try {
    currentPass = localStorage.getItem(PASS_KEY) || null;
  } catch {
    currentPass = null;
  }
  return currentPass;
}

export function setNick(nick) {
  try {
    localStorage.setItem(NICK_KEY, nick);
    currentNick = nick;
  } catch {}
}

export function setPass(pass) {
  try {
    localStorage.setItem(PASS_KEY, pass);
    currentPass = pass;
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(NICK_KEY);
    localStorage.removeItem(PASS_KEY);
    currentNick = null;
    currentPass = null;
  } catch {}
}

// ---- Firebase Listeners (tempo real) ----
function startListeners() {
  if (playersUnsubscribe) return; // já iniciado

  // Players registry
  const playersRef = ref(db, "players");
  playersUnsubscribe = onValue(playersRef, (snap) => {
    playersCache = snap.val() || {};
    notifyListeners();
  });

  // Banned nicks
  const bannedRef = ref(db, "banned");
  bannedUnsubscribe = onValue(bannedRef, (snap) => {
    bannedCache = snap.val() || [];
    notifyListeners();
  });

  // Mixes
  const mixesRef = ref(db, "mixes");
  mixesUnsubscribe = onValue(mixesRef, (snap) => {
    mixesCache = snap.val() || {};
    notifyListeners();
  });
}

function stopListeners() {
  if (playersUnsubscribe) { playersUnsubscribe(); playersUnsubscribe = null; }
  if (bannedUnsubscribe) { bannedUnsubscribe(); bannedUnsubscribe = null; }
  if (mixesUnsubscribe) { mixesUnsubscribe(); mixesUnsubscribe = null; }
  if (adminUnsubscribe) { adminUnsubscribe(); adminUnsubscribe = null; }
}

// ---- Auth Admin ----
export function isAdminLoggedIn() {
  return isAdminUser && auth.currentUser !== null;
}

export async function loginAdmin(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Verifica se é admin no banco
    const adminRef = ref(db, `admins/${cred.user.uid}`);
    const snap = await get(adminRef);
    if (snap.exists()) {
      isAdminUser = true;
      return true;
    } else {
      await signOut(auth);
      return false;
    }
  } catch (e) {
    console.error("Admin login error:", e);
    return false;
  }
}

export function logoutAdmin() {
  signOut(auth);
  isAdminUser = false;
}

function setupAuthListener() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Verifica se é admin
      const adminRef = ref(db, `admins/${user.uid}`);
      get(adminRef).then(snap => {
        isAdminUser = snap.exists();
        authReady = true;
        startListeners();
        notifyListeners();
      });
    } else {
      isAdminUser = false;
      authReady = true;
      stopListeners();
      playersCache = {};
      bannedCache = [];
      mixesCache = {};
      notifyListeners();
    }
  });
}

// Inicializa listener de auth
setupAuthListener();

// ---- Players Registry (Firebase) ----
export function getAllPlayers() {
  const players = [];
  for (const [uid, data] of Object.entries(playersCache)) {
    if (data.nick) {
      players.push({
        uid,
        nick: data.nick,
        level: data.level || 1000,
        pass: data.pass || "",
        createdAt: data.createdAt || Date.now(),
        banned: bannedCache.includes(data.nick)
      });
    }
  }
  // Ordena por level (maior primeiro)
  players.sort((a, b) => b.level - a.level);
  return players;
}

export function getPlayerByNick(nick) {
  for (const [uid, data] of Object.entries(playersCache)) {
    if (data.nick === nick) return { uid, ...data };
  }
  return null;
}

export function nickExists(nick) {
  return getPlayerByNick(nick) !== null;
}

export function checkPassword(nick, pass) {
  const player = getPlayerByNick(nick);
  return player && player.pass === pass;
}

// Registra novo nick no Firebase (cria entrada em players)
export async function registerNick(nick, pass) {
  // Verifica se já existe
  if (nickExists(nick)) throw new Error("Nick já existe");

  // Cria entrada no Firebase usando UID gerado
  const newRef = push(ref(db, "players"));
  await set(newRef, {
    nick,
    pass,
    level: 1000,
    createdAt: Date.now()
  });
}

// Atualiza level do player (apenas admin)
export async function setPlayerLevel(nick, level) {
  const player = getPlayerByNick(nick);
  if (!player) throw new Error("Player não encontrado");
  if (!isAdminLoggedIn()) throw new Error("Apenas admin pode alterar level");

  const playerRef = ref(db, `players/${player.uid}`);
  await update(playerRef, { level: Math.max(1000, Math.min(30000, level)) });
}

// Reseta senha do player (apenas admin)
export async function resetPlayerPassword(nick, newPass) {
  const player = getPlayerByNick(nick);
  if (!player) throw new Error("Player não encontrado");
  if (!isAdminLoggedIn()) throw new Error("Apenas admin pode resetar senha");

  const playerRef = ref(db, `players/${player.uid}`);
  await update(playerRef, { pass: newPass });
}

// ---- Ban System (Firebase) ----
export function getBannedNicks() {
  return [...bannedCache];
}

export function isBanned(nick) {
  return bannedCache.includes(nick);
}

export async function banNick(nick) {
  if (!isAdminLoggedIn()) throw new Error("Apenas admin pode banir");
  if (bannedCache.includes(nick)) return;

  const newBanned = [...bannedCache, nick];
  await set(ref(db, "banned"), newBanned);
}

export async function unbanNick(nick) {
  if (!isAdminLoggedIn()) throw new Error("Apenas admin pode desbanir");
  if (!bannedCache.includes(nick)) return;

  const newBanned = bannedCache.filter(n => n !== nick);
  await set(ref(db, "banned"), newBanned);
}

// ---- Mixes (Firebase) ----
export function getMixes() {
  return { ...mixesCache };
}

export function getMix(dateKey) {
  return mixesCache[dateKey] || { type: "none", slots: {}, complete: {} };
}

export async function setMixType(dateKey, type) {
  const nick = getNick();
  if (!nick) throw new Error("Defina seu nick primeiro");

  const mixRef = ref(db, `mixes/${dateKey}`);
  await update(mixRef, { type });
}

export async function joinSlot(dateKey, slotNum, nick) {
  const mixRef = ref(db, `mixes/${dateKey}/slots/${slotNum}`);
  await set(mixRef, nick);
}

export async function leaveSlot(dateKey, slotNum, nick) {
  const mixRef = ref(db, `mixes/${dateKey}/slots/${slotNum}`);
  const snap = await get(mixRef);
  if (snap.val() === nick) {
    await remove(mixRef);
  }
}

export async function joinComplete(dateKey, compNum, nick) {
  const mixRef = ref(db, `mixes/${dateKey}/complete/${compNum}`);
  await set(mixRef, nick);
}

export async function leaveComplete(dateKey, compNum, nick) {
  const mixRef = ref(db, `mixes/${dateKey}/complete/${compNum}`);
  const snap = await get(mixRef);
  if (snap.val() === nick) {
    await remove(mixRef);
  }
}

export function countSlots(dateKey) {
  const day = mixesCache[dateKey];
  if (!day || !day.slots) return 0;
  return Object.values(day.slots).filter(Boolean).length;
}

export function countComplete(dateKey) {
  const day = mixesCache[dateKey];
  if (!day || !day.complete) return 0;
  return Object.values(day.complete).filter(Boolean).length;
}

// Inicialização: carrega nick local se existir
getNick();
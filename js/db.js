// js/db.js
// Wrappers de leitura/escrita no Realtime Database. Mantém a UI
// desacoplada do Firebase: trocar de backend seria só mexer aqui.

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  off,
  once,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { db } from "./firebase-config.js";
import { countPlayers, sanitizeNick } from "./utils.js";

// ---- Paths ----
const listsPath   = (dateKey) => `lists/${dateKey}`;
const listPath    = (dateKey, listId) => `lists/${dateKey}/${listId}`;
const historyPath = (dateKey) => `history/${dateKey}`;
const historyListPath = (dateKey, listId) => `history/${dateKey}/${listId}`;
const metaLastRollover = "meta/lastRollover";

// ---- Listeners ----
// onListChange(dateKey, cb) — cb recebe Map<listId, listObj>.
export function onDayChange(dateKey, cb) {
  const r = ref(db, listsPath(dateKey));
  onValue(r, (snap) => cb(snap.val() || {}));
  return () => off(r);
}

export function onAllListsChange(cb) {
  const r = ref(db, "lists");
  onValue(r, (snap) => cb(snap.val() || {}));
  return () => off(r);
}

export function onAllHistoryChange(cb) {
  const r = ref(db, "history");
  onValue(r, (snap) => cb(snap.val() || {}));
  return () => off(r);
}

// ---- Criar lista ----
export async function createList(dateKey, { type, time, creator }) {
  const cleanCreator = sanitizeNick(creator);
  if (!cleanCreator) throw new Error("Apelido inválido");

  const newRef = push(ref(db, listsPath(dateKey)));
  const list = {
    type,
    time,
    creator: cleanCreator,
    createdAt: Date.now(),
    players: {},
    waitlist: {},
  };
  await set(newRef, list);
  return newRef.key;
}

// ---- Entrar / Sair ----
export async function joinList(dateKey, listId, nick) {
  const cleanNick = sanitizeNick(nick);
  if (!cleanNick) throw new Error("Apelido inválido");

  const r = ref(db, listPath(dateKey, listId));
  const snap = await once(r, "value");
  const list = snap.val();
  if (!list) throw new Error("Lista não encontrada");

  if (list.players && list.players[cleanNick]) {
    return { alreadyIn: "players" };
  }
  if (list.waitlist && list.waitlist[cleanNick]) {
    return { alreadyIn: "waitlist" };
  }

  const playersCount = countPlayers(list);
  const updates = {};

  if (playersCount < 10) {
    updates[`lists/${dateKey}/${listId}/players/${cleanNick}`] = { joinedAt: Date.now() };
  } else {
    const waitCount = list.waitlist ? Object.keys(list.waitlist).length : 0;
    if (waitCount >= 5) throw new Error("Lista cheia (10 confirmados + 5 reservas)");
    updates[`lists/${dateKey}/${listId}/waitlist/${cleanNick}`] = { joinedAt: Date.now() };
  }
  await update(ref(db), updates);
  return { alreadyIn: null, wentTo: playersCount < 10 ? "players" : "waitlist" };
}

export async function leaveList(dateKey, listId, nick) {
  const cleanNick = sanitizeNick(nick);
  if (!cleanNick) throw new Error("Apelido inválido");

  const r = ref(db, listPath(dateKey, listId));
  const snap = await once(r, "value");
  const list = snap.val();
  if (!list) return;

  const updates = {};
  if (list.players && list.players[cleanNick]) {
    updates[`lists/${dateKey}/${listId}/players/${cleanNick}`] = null;
  } else if (list.waitlist && list.waitlist[cleanNick]) {
    updates[`lists/${dateKey}/${listId}/waitlist/${cleanNick}`] = null;
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

// ---- Apagar lista (apenas o criador) ----
export async function deleteList(dateKey, listId, nick) {
  const cleanNick = sanitizeNick(nick);
  const r = ref(db, listPath(dateKey, listId));
  const snap = await once(r, "value");
  const list = snap.val();
  if (!list) return;
  if (list.creator !== cleanNick) {
    throw new Error("Só o criador pode apagar a lista");
  }
  await remove(r);
}

// ---- Virada de dia (idempotente) ----
export async function runDayRolloverIfNeeded() {
  const today = ymd(new Date());
  const lastSnap = await once(ref(db, metaLastRollover), "value");
  const last = lastSnap.val();

  if (last === today) return { skipped: true };
  if (!last) {
    await set(ref(db, metaLastRollover), today);
    return { skipped: true, firstRun: true };
  }

  const allSnap = await once(ref(db, "lists"), "value");
  const all = allSnap.val() || {};
  const updates = {};

  Object.keys(all)
    .filter((dayKey) => dayKey > last && dayKey < today)
    .forEach((dayKey) => {
      const dayObj = all[dayKey] || {};
      Object.keys(dayObj).forEach((listId) => {
        const list = dayObj[listId];
        if (!list) return;
        const count = countPlayers(list);
        if (count >= 10) {
          // vai pro histórico
          updates[historyListPath(dayKey, listId)] = {
            ...list,
            closedAt: Date.now(),
          };
        }
        // apaga do lists (seja por ir pro histórico ou por não ter fechado)
        updates[listPath(dayKey, listId)] = null;
      });
    });

  updates[metaLastRollover] = today;
  await update(ref(db), updates);
  return { skipped: false, processed: Object.keys(all).length };
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

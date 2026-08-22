// js/utils.js
// Helpers compartilhados: datas, status, sanitização.

export const DAYS = [
  { id: 1, short: "Seg", long: "Segunda-feira" },
  { id: 2, short: "Ter", long: "Terça-feira" },
  { id: 3, short: "Qua", long: "Quarta-feira" },
  { id: 4, short: "Qui", long: "Quinta-feira" },
  { id: 5, short: "Sex", long: "Sexta-feira" },
  { id: 6, short: "Sáb", long: "Sábado" },
  { id: 0, short: "Dom", long: "Domingo" },
];

// JavaScript: 0=Dom, 1=Seg, ..., 6=Sáb. Convertemos para Seg=0..Dom=6.
export function dayIndexMondayFirst(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function formatDateKey(date) {
  // "YYYY-MM-DD" no fuso local.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateBR(dateKey) {
  // "2026-08-22" -> "22/08"
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

export function formatDateLong(dateKey) {
  // "2026-08-22" -> "Sexta, 22/08"
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const idx = dayIndexMondayFirst(date.getDay());
  const day = DAYS.find((x) => x.id === date.getDay());
  return `${day.long}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export function todayKey() {
  return formatDateKey(new Date());
}

export function dayKeyForOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateKey(d);
}

export function dayInfoForOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const idx = dayIndexMondayFirst(d.getDay());
  const day = DAYS.find((x) => x.id === d.getDay());
  return { key: formatDateKey(d), short: day.short, long: day.long, dayOfWeek: d.getDay() };
}

// ---- Status (cores) ----
// Faixas: 1-4 verde, 5-9 amarelo, 10 vermelho hot.
export function getStatus(playerCount) {
  if (playerCount >= 10) {
    return { id: "closed", color: "#ef4444", label: "Lista fechada", dot: "🔥" };
  }
  if (playerCount >= 5) {
    return { id: "ready", color: "#eab308", label: "Time formado", dot: "⚡" };
  }
  return { id: "open", color: "#22c55e", label: "Faltam players", dot: "●" };
}

// ---- Sanitização ----
// Firebase proíbe [ ] . # $ / em chaves. Também limita tamanho.
const FORBIDDEN = /[.#$\/\[\]]/g;

export function sanitizeNick(raw) {
  if (!raw) return "";
  return raw
    .toString()
    .trim()
    .replace(FORBIDDEN, "_")
    .slice(0, 24);
}

export function isValidNick(raw) {
  const s = sanitizeNick(raw);
  return s.length >= 2 && s.length <= 24;
}

// ---- Misc ----
export function countPlayers(list) {
  return list && list.players ? Object.keys(list.players).length : 0;
}

export function countWaitlist(list) {
  return list && list.waitlist ? Object.keys(list.waitlist).length : 0;
}

export function isCreator(list, nick) {
  return list && nick && list.creator === nick;
}

export function isInList(list, nick) {
  if (!list || !nick) return false;
  return Boolean(list.players && list.players[nick]);
}

export function isInWaitlist(list, nick) {
  if (!list || !nick) return false;
  return Boolean(list.waitlist && list.waitlist[nick]);
}

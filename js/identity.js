// js/identity.js
// Gerencia o nick do jogador em localStorage.

const NICK_KEY = "counteritz_nick";

let currentNick = null;

export function getNick() {
  if (currentNick) return currentNick;
  try {
    currentNick = localStorage.getItem(NICK_KEY) || null;
  } catch {
    currentNick = null;
  }
  return currentNick;
}

export function setNick(nick) {
  try {
    localStorage.setItem(NICK_KEY, nick);
    currentNick = nick;
  } catch {}
  return nick;
}

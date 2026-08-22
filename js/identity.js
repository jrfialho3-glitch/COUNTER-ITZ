// js/identity.js
// Gerencia o nick e senha do jogador em localStorage.

const NICK_KEY = "counteritz_nick";
const PASS_KEY = "counteritz_pass";
const ADMIN_KEY = "counteritz_admin";

// Credenciais do admin
const ADMIN_USER = "JuninN";
const ADMIN_PASS = "manu123@";

let currentNick = null;
let currentPass = null;
let isAdmin = false;

// Lista de nicks banidos (salva no localStorage)
const BANNED_KEY = "counteritz_banned";

export function getBannedNicks() {
  try {
    return JSON.parse(localStorage.getItem(BANNED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function banNick(nick) {
  const banned = getBannedNicks();
  if (!banned.includes(nick)) {
    banned.push(nick);
    localStorage.setItem(BANNED_KEY, JSON.stringify(banned));
  }
}

export function unbanNick(nick) {
  const banned = getBannedNicks().filter(n => n !== nick);
  localStorage.setItem(BANNED_KEY, JSON.stringify(banned));
}

export function isBanned(nick) {
  return getBannedNicks().includes(nick);
}

// Registro de nicks e senhas (salva no localStorage)
const REGISTRY_KEY = "counteritz_registry";

export function getRegistry() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function registerNick(nick, pass) {
  const registry = getRegistry();
  registry[nick] = { pass, createdAt: Date.now() };
  saveRegistry(registry);
}

export function checkPassword(nick, pass) {
  const registry = getRegistry();
  return registry[nick]?.pass === pass;
}

export function nickExists(nick) {
  const registry = getRegistry();
  return registry[nick] !== undefined;
}

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
  return nick;
}

export function setPass(pass) {
  try {
    localStorage.setItem(PASS_KEY, pass);
    currentPass = pass;
  } catch {}
  return pass;
}

export function clearIdentity() {
  try {
    localStorage.removeItem(NICK_KEY);
    localStorage.removeItem(PASS_KEY);
    currentNick = null;
    currentPass = null;
  } catch {}
}

export function checkAdmin() {
  return isAdmin;
}

export function setAdmin(value) {
  isAdmin = value;
  if (value) {
    sessionStorage.setItem(ADMIN_KEY, "true");
  } else {
    sessionStorage.removeItem(ADMIN_KEY);
  }
}

export function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_KEY) === "true";
}

export function validateAdmin(user, pass) {
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

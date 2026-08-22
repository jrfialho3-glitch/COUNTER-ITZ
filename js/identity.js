// js/identity.js
// Apelido salvo em localStorage. Modal aparece na primeira visita
// e quando o usuário clica em "Trocar".

import { isValidNick, sanitizeNick } from "./utils.js";

const NICK_KEY = "omni_nick";

let currentNick = null;
let onChangeCbs = [];

function getStored() {
  try {
    return localStorage.getItem(NICK_KEY) || null;
  } catch {
    return null;
  }
}

function setStored(nick) {
  try {
    localStorage.setItem(NICK_KEY, nick);
  } catch {
    // localStorage indisponível (modo privado extremo) — sem persistência.
  }
}

export function getNick() {
  if (currentNick) return currentNick;
  currentNick = getStored();
  return currentNick;
}

export function setNick(nick) {
  const clean = sanitizeNick(nick);
  if (!isValidNick(clean)) throw new Error("Apelido inválido (2 a 24 caracteres)");
  setStored(clean);
  currentNick = clean;
  onChangeCbs.forEach((cb) => cb(clean));
  return clean;
}

export function onNickChange(cb) {
  onChangeCbs.push(cb);
  return () => {
    onChangeCbs = onChangeCbs.filter((x) => x !== cb);
  };
}

// Inicialização: mostra modal se ainda não tem nick, e conecta o botão "Trocar".
function ensureIdentityUI() {
  const nick = getNick();
  const nickEl = document.getElementById("current-nick");
  const changeBtn = document.getElementById("change-nick");
  const modal = document.getElementById("modal-nick");
  const form = document.getElementById("form-nick");
  const input = document.getElementById("input-nick");
  const saveBtn = document.getElementById("btn-save-nick");

  if (nickEl) nickEl.textContent = nick || "—";

  if (changeBtn) {
    changeBtn.addEventListener("click", () => {
      input.value = getNick() || "";
      input.focus();
      input.select();
      modal.showModal();
      saveBtn.textContent = "Salvar";
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value;
      try {
        const final = setNick(v);
        if (nickEl) nickEl.textContent = final;
        modal.close();
      } catch (err) {
        input.focus();
        input.select();
        input.setCustomValidity(err.message);
        input.reportValidity();
        setTimeout(() => input.setCustomValidity(""), 2000);
      }
    });
  }

  if (!nick) {
    setTimeout(() => {
      if (modal && !modal.open) modal.showModal();
    }, 100);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureIdentityUI);
} else {
  ensureIdentityUI();
}

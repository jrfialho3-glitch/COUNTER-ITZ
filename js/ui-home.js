// js/ui-home.js
// Render da home: 10 cards de mix, botão copiar, modal de nick com senha, área admin.

import {
  getNick,
  setNick,
  setPass,
  getPass,
  nickExists,
  checkPassword,
  registerNick,
  isBanned,
  checkAdmin,
  setAdmin,
  isAdminLoggedIn,
  validateAdmin,
  getBannedNicks,
  banNick,
  unbanNick,
} from "./identity.js";
import { getNext10Days, getStatus, sanitizeNick, escapeHtml } from "./utils.js";

// Referências DOM
const grid = document.getElementById("mixes-grid");
const modalNick = document.getElementById("modal-nick");
const formNick = document.getElementById("form-nick");
const inputNick = document.getElementById("input-nick");
const inputPass = document.getElementById("input-pass");
const nickDisplay = document.getElementById("current-nick");
const changeNickBtn = document.getElementById("change-nick");
const modalType = document.getElementById("modal-type");
const formType = document.getElementById("form-type");
const modalTypeDay = document.getElementById("modal-type-day");
const toastArea = document.getElementById("toast-area");
const adminBtn = document.getElementById("admin-btn");

// Estado local
let mixState = {};
let pendingTypeDate = null;

// Carrega/salva estado
function loadState() {
  try {
    const saved = localStorage.getItem("counteritz_mixes");
    if (saved) mixState = JSON.parse(saved);
  } catch {
    mixState = {};
  }
}

function saveState() {
  try {
    localStorage.setItem("counteritz_mixes", JSON.stringify(mixState));
  } catch {}
}

function ensureDay(dateKey) {
  if (!mixState[dateKey]) {
    mixState[dateKey] = { type: "none", slots: {}, complete: {} };
  }
}

function countSlots(dateKey) {
  const day = mixState[dateKey];
  if (!day) return 0;
  return Object.keys(day.slots || {}).filter((k) => day.slots[k]).length;
}

function countComplete(dateKey) {
  const day = mixState[dateKey];
  if (!day) return 0;
  return Object.keys(day.complete || {}).filter((k) => day.complete[k]).length;
}

// Copiar lista para WhatsApp
function copyListToClipboard(dateKey) {
  ensureDay(dateKey);
  const data = mixState[dateKey];
  const day = getNext10Days().find((d) => d.key === dateKey);
  const typeLabel = data.type === "online" ? "ONLINE" : data.type === "presencial" ? "PRESENCIAL" : "A DEFINIR";

  let text = `MIX ${day.dayName} ${day.dateBR} ${typeLabel}\n`;

  for (let i = 1; i <= 10; i++) {
    const nick = data.slots[i];
    text += `${i} ${nick || ""}\n`;
  }

  const completeCount = countComplete(dateKey);
  if (completeCount > 0) {
    text += `\nCOMPLETE:\n`;
    for (let i = 1; i <= 5; i++) {
      const nick = data.complete[i];
      if (nick) text += `${i} ${nick}\n`;
    }
  }

  navigator.clipboard.writeText(text.trim()).then(() => {
    toast("Lista copiada!", "success");
  }).catch(() => {
    toast("Erro ao copiar", "error");
  });
}

// Renderiza card
function renderMixCard(day) {
  ensureDay(day.key);
  const data = mixState[day.key];
  const count = countSlots(day.key);
  const status = getStatus(count);
  const completeCount = countComplete(day.key);

  const typeLabel =
    data.type === "online" ? "Online" : data.type === "presencial" ? "Presencial" : "Clique para definir";
  const typeIcon = data.type === "online" ? "🌐" : data.type === "presencial" ? "📍" : "❓";
  const typeBadgeClass = data.type === "online" ? "online" : data.type === "presencial" ? "presencial" : "none";

  let slotsHtml = "";
  for (let i = 1; i <= 10; i++) {
    const nick = data.slots[i];
    const isMe = nick && nick === getNick();
    const isBannedUser = nick && isBanned(nick);
    slotsHtml += `
      <div class="slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""} ${isBannedUser ? "banned" : ""}"
           data-date="${day.key}" data-slot="${i}" title="${nick ? escapeHtml(nick) : `Slot ${i}`}">
        ${nick ? escapeHtml(nick) : i}
      </div>
    `;
  }

  let completeHtml = "";
  for (let i = 1; i <= 5; i++) {
    const nick = data.complete[i];
    const isMe = nick && nick === getNick();
    completeHtml += `
      <div class="complete-slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}"
           data-date="${day.key}" data-complete="${i}" title="${nick ? escapeHtml(nick) : `Complete ${i}`}">
        ${nick ? escapeHtml(nick) : i}
      </div>
    `;
  }

  return `
    <article class="mix-card status-${status.id}" data-date="${day.key}">
      <header class="mix-card-header">
        <div class="mix-day-name">${escapeHtml(day.dayName)}</div>
        <div class="mix-date">${escapeHtml(day.dateBR)}${day.isToday ? " • HOJE" : ""}</div>
      </header>

      <div class="mix-type-badge ${typeBadgeClass}" data-action="set-type" data-date="${day.key}">
        ${typeIcon} ${typeLabel}
      </div>

      <section class="slots-section">
        <div class="slots-label">SLOTS (${count}/10)</div>
        <div class="slots-grid">${slotsHtml}</div>
      </section>

      <section class="complete-section">
        <div class="complete-label">COMPLETE <span>(${completeCount}/5)</span> — em dúvida</div>
        <div class="complete-grid">${completeHtml}</div>
      </section>

      <div class="mix-actions-row">
        <button class="btn-copy" data-action="copy" data-date="${day.key}" title="Copiar lista">📋 Copiar</button>
        <div class="mix-counter status-${status.id}">${count}/10 — ${status.label}</div>
      </div>
    </article>
  `;
}

function render() {
  if (!grid) return;
  const days = getNext10Days();
  grid.innerHTML = days.map(renderMixCard).join("");
}

function toast(msg, kind = "") {
  if (!toastArea) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toastArea.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .2s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 2200);
}

// Modal de nick com senha
function setupNickModal() {
  const nick = getNick();

  if (!nick && modalNick) {
    modalNick.showModal();
  }

  if (nickDisplay) {
    nickDisplay.textContent = nick || "—";
  }

  if (changeNickBtn) {
    changeNickBtn.addEventListener("click", () => {
      if (inputNick) inputNick.value = getNick() || "";
      if (inputPass) inputPass.value = "";
      if (modalNick) modalNick.showModal();
    });
  }

  if (formNick) {
    formNick.addEventListener("submit", (e) => {
      e.preventDefault();
      const nickVal = sanitizeNick(inputNick.value);
      const passVal = inputPass ? inputPass.value.trim() : "";

      if (nickVal.length < 2) {
        inputNick.setCustomValidity("Mínimo 2 caracteres");
        inputNick.reportValidity();
        return;
      }

      if (isBanned(nickVal)) {
        toast("Esse nick está banido", "error");
        return;
      }

      // Se o nick já existe
      if (nickExists(nickVal)) {
        if (!passVal || passVal.length !== 4) {
          inputPass?.setCustomValidity("Digite a senha de 4 números");
          inputPass?.reportValidity();
          return;
        }
        if (!checkPassword(nickVal, passVal)) {
          inputPass?.setCustomValidity("Senha incorreta");
          inputPass?.reportValidity();
          return;
        }
        // Senha correta
        setNick(nickVal);
        setPass(passVal);
        if (nickDisplay) nickDisplay.textContent = nickVal;
        if (modalNick) modalNick.close();
        render();
        toast("Bem-vindo de volta!", "success");
        return;
      }

      // Novo nick - precisa criar senha
      if (!passVal || passVal.length !== 4 || !/^\d{4}$/.test(passVal)) {
        inputPass?.setCustomValidity("Crie uma senha de 4 números");
        inputPass?.reportValidity();
        return;
      }

      registerNick(nickVal, passVal);
      setNick(nickVal);
      setPass(passVal);
      if (nickDisplay) nickDisplay.textContent = nickVal;
      if (modalNick) modalNick.close();
      render();
      toast("Nick registrado!", "success");
    });
  }
}

// Modal de tipo
function setupTypeModal() {
  const cancelBtn = modalType?.querySelector("[data-close]");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => modalType?.close());
  }

  if (formType) {
    formType.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!pendingTypeDate) return;

      const fd = new FormData(formType);
      const type = fd.get("mix-type");

      ensureDay(pendingTypeDate);
      mixState[pendingTypeDate].type = type;
      saveState();
      render();
      modalType?.close();
      toast(`Mix definido como ${type}!`, "success");
    });
  }

  document.addEventListener("click", (e) => {
    const badge = e.target.closest('[data-action="set-type"]');
    if (!badge) return;

    pendingTypeDate = badge.dataset.date;
    const day = getNext10Days().find((d) => d.key === pendingTypeDate);

    if (modalTypeDay) {
      modalTypeDay.textContent = day ? `${day.dayLong} (${day.dateBR})` : pendingTypeDate;
    }

    const currentType = mixState[pendingTypeDate]?.type || "online";
    formType?.querySelectorAll('input[name="mix-type"]').forEach((r) => {
      r.checked = r.value === currentType;
    });

    modalType?.showModal();
  });
}

// Clique em slot/complete
function setupSlotClick() {
  document.addEventListener("click", (e) => {
    const slot = e.target.closest(".slot");
    const complete = e.target.closest(".complete-slot");
    const copyBtn = e.target.closest('[data-action="copy"]');

    if (copyBtn) {
      const dateKey = copyBtn.dataset.date;
      copyListToClipboard(dateKey);
      return;
    }

    if (!slot && !complete) return;

    const nick = getNick();
    if (!nick) {
      toast("Define teu nick primeiro!", "error");
      modalNick?.showModal();
      return;
    }

    if (slot) {
      const dateKey = slot.dataset.date;
      const slotNum = parseInt(slot.dataset.slot, 10);
      handleSlotClick(dateKey, slotNum, nick);
    } else if (complete) {
      const dateKey = complete.dataset.date;
      const compNum = parseInt(complete.dataset.complete, 10);
      handleCompleteClick(dateKey, compNum, nick);
    }
  });
}

function handleSlotClick(dateKey, slotNum, nick) {
  ensureDay(dateKey);
  const current = mixState[dateKey].slots[slotNum];

  if (current === nick) {
    delete mixState[dateKey].slots[slotNum];
    saveState();
    render();
    toast("Você saiu do slot", "success");
  } else if (!current) {
    // Remove de outros slots/complete
    Object.entries(mixState[dateKey].slots).forEach(([k, n]) => {
      if (n === nick) delete mixState[dateKey].slots[k];
    });
    Object.entries(mixState[dateKey].complete || {}).forEach(([k, n]) => {
      if (n === nick) delete mixState[dateKey].complete[k];
    });

    mixState[dateKey].slots[slotNum] = nick;
    saveState();
    render();
    toast(`Slot ${slotNum} reservado!`, "success");
  } else {
    toast("Esse slot já está ocupado", "error");
  }
}

function handleCompleteClick(dateKey, compNum, nick) {
  ensureDay(dateKey);
  if (!mixState[dateKey].complete) mixState[dateKey].complete = {};

  const current = mixState[dateKey].complete[compNum];

  if (current === nick) {
    delete mixState[dateKey].complete[compNum];
    saveState();
    render();
    toast("Você saiu do complete", "success");
  } else if (!current) {
    // Remove de outros lugares
    Object.entries(mixState[dateKey].slots).forEach(([k, n]) => {
      if (n === nick) delete mixState[dateKey].slots[k];
    });
    Object.entries(mixState[dateKey].complete).forEach(([k, n]) => {
      if (n === nick) delete mixState[dateKey].complete[k];
    });

    mixState[dateKey].complete[compNum] = nick;
    saveState();
    render();
    toast(`Complete ${compNum} reservado!`, "success");
  } else {
    toast("Esse complete já está ocupado", "error");
  }
}

// Modal Admin
function setupAdminModal() {
  const modalAdmin = document.getElementById("modal-admin");
  const formAdmin = document.getElementById("form-admin");
  const adminUser = document.getElementById("admin-user");
  const adminPass = document.getElementById("admin-pass");
  const adminPanel = document.getElementById("admin-panel");
  const banInput = document.getElementById("ban-nick");
  const btnBan = document.getElementById("btn-ban");
  const btnUnban = document.getElementById("btn-unban");
  const bannedList = document.getElementById("banned-list");
  const cancelBtn = modalAdmin?.querySelector("[data-close]");

  if (!modalAdmin || !adminBtn) return;

  // Abrir modal admin
  adminBtn.addEventListener("click", () => {
    if (isAdminLoggedIn()) {
      showAdminPanel();
    } else {
      if (adminPanel) adminPanel.style.display = "none";
      modalAdmin.showModal();
    }
  });

  // Fechar modal
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => modalAdmin.close());
  }

  // Login admin
  if (formAdmin) {
    formAdmin.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = adminUser?.value.trim();
      const pass = adminPass?.value;

      if (validateAdmin(user, pass)) {
        setAdmin(true);
        toast("Login admin realizado!", "success");
        showAdminPanel();
      } else {
        toast("Usuário ou senha incorretos", "error");
      }
    });
  }

  function showAdminPanel() {
    if (adminPanel) adminPanel.style.display = "block";
    if (formAdmin) formAdmin.style.display = "none";
    renderBannedList();
    modalAdmin.showModal();
  }

  function renderBannedList() {
    if (!bannedList) return;
    const banned = getBannedNicks();
    if (banned.length === 0) {
      bannedList.innerHTML = '<li style="color: var(--text-faint);">Nenhum nick banido</li>';
      return;
    }
    bannedList.innerHTML = banned.map(nick => `
      <li>
        <span>${escapeHtml(nick)}</span>
        <button class="unban-btn" data-unban="${escapeHtml(nick)}">Desbanir</button>
      </li>
    `).join("");
  }

  // Banir nick
  if (btnBan) {
    btnBan.addEventListener("click", () => {
      const nick = sanitizeNick(banInput?.value);
      if (!nick) {
        toast("Digite um nick", "error");
        return;
      }
      banNick(nick);
      toast(`${nick} foi banido!`, "success");
      renderBannedList();
      render();
      if (banInput) banInput.value = "";
    });
  }

  // Desbanir nick
  if (btnUnban) {
    btnUnban.addEventListener("click", () => {
      const nick = sanitizeNick(banInput?.value);
      if (!nick) {
        toast("Digite um nick", "error");
        return;
      }
      unbanNick(nick);
      toast(`${nick} foi desbanido!`, "success");
      renderBannedList();
      if (banInput) banInput.value = "";
    });
  }

  // Desbanir pelo botão na lista
  document.addEventListener("click", (e) => {
    const unbanBtn = e.target.closest("[data-unban]");
    if (!unbanBtn) return;
    const nick = unbanBtn.dataset.unban;
    unbanNick(nick);
    toast(`${nick} foi desbanido!`, "success");
    renderBannedList();
    render();
  });
}

// Inicialização
function boot() {
  loadState();
  render();
  setupNickModal();
  setupTypeModal();
  setupSlotClick();
  setupAdminModal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

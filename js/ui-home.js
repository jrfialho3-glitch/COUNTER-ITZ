// js/ui-home.js
// Render da home: 10 cards de mix, 5 em cima e 5 embaixo.
// Cada card tem 10 slots + 5 complete. Usuário escolhe online/presencial.

import { getNick, setNick } from "./identity.js";
import { getNext10Days, getStatus, sanitizeNick, escapeHtml } from "./utils.js";

// Referências DOM
const grid = document.getElementById("mixes-grid");
const modalNick = document.getElementById("modal-nick");
const formNick = document.getElementById("form-nick");
const inputNick = document.getElementById("input-nick");
const nickDisplay = document.getElementById("current-nick");
const changeNickBtn = document.getElementById("change-nick");
const modalType = document.getElementById("modal-type");
const formType = document.getElementById("form-type");
const modalTypeDay = document.getElementById("modal-type-day");
const toastArea = document.getElementById("toast-area");

// Estado local: { dateKey: { type: "online"|"presencial"|"none", slots: {1..10: nick|null}, complete: {1..5: nick|null} } }
let mixState = {};

// Carrega do localStorage
function loadState() {
  try {
    const saved = localStorage.getItem("counteritz_mixes");
    if (saved) mixState = JSON.parse(saved);
  } catch {
    mixState = {};
  }
}

// Salva no localStorage
function saveState() {
  try {
    localStorage.setItem("counteritz_mixes", JSON.stringify(mixState));
  } catch {}
}

// Inicializa um dia se não existir
function ensureDay(dateKey) {
  if (!mixState[dateKey]) {
    mixState[dateKey] = {
      type: "none",
      slots: {},
      complete: {}
    };
  }
}

// Conta slots preenchidos (sem complete)
function countSlots(dateKey) {
  const day = mixState[dateKey];
  if (!day) return 0;
  return Object.keys(day.slots || {}).filter(k => day.slots[k]).length;
}

// Conta complete preenchidos
function countComplete(dateKey) {
  const day = mixState[dateKey];
  if (!day) return 0;
  return Object.keys(day.complete || {}).filter(k => day.complete[k]).length;
}

// Renderiza um card de mix
function renderMixCard(day) {
  ensureDay(day.key);
  const data = mixState[day.key];
  const count = countSlots(day.key);
  const status = getStatus(count);
  const completeCount = countComplete(day.key);

  const typeLabel = data.type === "online" ? "Online"
                  : data.type === "presencial" ? "Presencial"
                  : "Clique para definir";

  const typeIcon = data.type === "online" ? "🌐"
                 : data.type === "presencial" ? "📍"
                 : "❓";

  const typeBadgeClass = data.type === "online" ? "online"
                       : data.type === "presencial" ? "presencial"
                       : "none";

  // Slots 1-10
  let slotsHtml = "";
  for (let i = 1; i <= 10; i++) {
    const nick = data.slots[i];
    const isMe = nick && nick === getNick();
    slotsHtml += `
      <div class="slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}"
           data-date="${day.key}" data-slot="${i}" title="${nick ? escapeHtml(nick) : `Slot ${i}`}">
        ${nick ? escapeHtml(nick) : i}
      </div>
    `;
  }

  // Complete 1-5
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

      <div class="mix-counter status-${status.id}">${count}/10 — ${status.label}</div>
    </article>
  `;
}

// Renderiza todos os cards
function render() {
  if (!grid) return;

  const days = getNext10Days();

  // Primeiro gera os cards
  const cardsHtml = days.map(renderMixCard).join("");

  // Envolve em duas linhas de 5
  grid.innerHTML = cardsHtml;
}

// Toast
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

// Modal de nick
function setupNickModal() {
  // Mostra se não tem nick
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
      if (modalNick) modalNick.showModal();
    });
  }

  if (formNick) {
    formNick.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = sanitizeNick(inputNick.value);
      if (val.length < 2) {
        inputNick.setCustomValidity("Mínimo 2 caracteres");
        inputNick.reportValidity();
        return;
      }
      setNick(val);
      if (nickDisplay) nickDisplay.textContent = val;
      if (modalNick) modalNick.close();
      render();
    });
  }
}

// Modal de tipo (online/presencial)
let pendingTypeDate = null;

function setupTypeModal() {
  const cancelBtn = modalType?.querySelector("[data-close]");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (modalType) modalType.close();
    });
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
      if (modalType) modalType.close();
      toast(`Mix definido como ${type}!`, "success");
    });
  }

  // Abre modal ao clicar no badge
  document.addEventListener("click", (e) => {
    const badge = e.target.closest('[data-action="set-type"]');
    if (!badge) return;

    const dateKey = badge.dataset.date;
    pendingTypeDate = dateKey;

    const day = getNext10Days().find(d => d.key === dateKey);
    if (modalTypeDay) {
      modalTypeDay.textContent = day ? `${day.dayLong} (${day.dateBR})` : dateKey;
    }

    // Marca o tipo atual
    const currentType = mixState[dateKey]?.type || "online";
    const radios = formType?.querySelectorAll('input[name="mix-type"]');
    radios?.forEach(r => {
      r.checked = r.value === currentType;
    });

    if (modalType) modalType.showModal();
  });
}

// Clique em slot
function setupSlotClick() {
  document.addEventListener("click", (e) => {
    const slot = e.target.closest(".slot");
    const complete = e.target.closest(".complete-slot");

    if (!slot && !complete) return;

    const nick = getNick();
    if (!nick) {
      toast("Define teu nick primeiro!", "error");
      if (modalNick) modalNick.showModal();
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
    // Sai do slot
    delete mixState[dateKey].slots[slotNum];
    saveState();
    render();
    toast("Você saiu do slot", "success");
  } else if (!current) {
    // Verifica se já está em outro slot
    const existingSlot = Object.entries(mixState[dateKey].slots).find(([_, n]) => n === nick);
    const existingComplete = Object.entries(mixState[dateKey].complete || {}).find(([_, n]) => n === nick);

    if (existingSlot) {
      // Move de um slot pro outro
      delete mixState[dateKey].slots[existingSlot[0]];
    }
    if (existingComplete) {
      // Remove do complete se estava
      delete mixState[dateKey].complete[existingComplete[0]];
    }

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
    const existingSlot = Object.entries(mixState[dateKey].slots).find(([_, n]) => n === nick);
    const existingComplete = Object.entries(mixState[dateKey].complete).find(([_, n]) => n === nick);

    if (existingSlot) {
      delete mixState[dateKey].slots[existingSlot[0]];
    }
    if (existingComplete) {
      delete mixState[dateKey].complete[existingComplete[0]];
    }

    mixState[dateKey].complete[compNum] = nick;
    saveState();
    render();
    toast(`Complete ${compNum} reservado!`, "success");
  } else {
    toast("Esse complete já está ocupado", "error");
  }
}

// Inicialização
function boot() {
  loadState();
  render();
  setupNickModal();
  setupTypeModal();
  setupSlotClick();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

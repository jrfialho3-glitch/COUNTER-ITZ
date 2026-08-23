// js/ui-home.js
// Render da home: 10 cards de mix, botão copiar, modal de nick com senha, área admin.
// USA FIREBASE REALTIME DATABASE - SINCRONISMO EM TEMPO REAL

import {
  getNick,
  setNick,
  setPass,
  nickExists,
  checkPassword,
  registerNick,
  isBanned,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  getBannedNicks,
  banNick,
  unbanNick,
  resetPlayerPassword,
  getAllPlayers,
  setPlayerLevel,
  getLevelColor,
  formatLevel,
  getMix,
  setMixType,
  joinSlot,
  leaveSlot,
  joinComplete,
  leaveComplete,
  countSlots,
  countComplete,
  subscribe
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
let pendingTypeDate = null;

// Re-render quando dados mudam
subscribe(() => render());

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

// Renderiza card
function renderMixCard(day) {
  const data = getMix(day.key);
  const count = countSlots(day.key);
  const status = getStatus(count);
  const completeCount = countComplete(day.key);

  const typeLabel =
    data.type === "online" ? "Online" : data.type === "presencial" ? "Presencial" : "Clique para definir";
  const typeIcon = data.type === "online" ? "🌐" : data.type === "presencial" ? "📍" : "❓";
  const typeBadgeClass = data.type === "online" ? "online" : data.type === "presencial" ? "presencial" : "none";

  let slotsHtml = "";
  for (let i = 1; i <= 10; i++) {
    const nick = data.slots?.[i];
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
    const nick = data.complete?.[i];
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
  updateNickDisplay();
}

// Modal de nick com senha
function setupNickModal() {
  const nick = getNick();

  if (!nick && modalNick) {
    modalNick.showModal();
  }

  if (changeNickBtn) {
    changeNickBtn.addEventListener("click", () => {
      if (inputNick) inputNick.value = "";
      if (inputPass) inputPass.value = "";
      if (modalNick) modalNick.showModal();
    });
  }

  if (formNick) {
    formNick.addEventListener("submit", async (e) => {
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

      // Verifica se nick já existe
      if (nickExists(nickVal)) {
        // Precisa da senha correta
        if (!passVal || passVal.length !== 4 || !/^\d{4}$/.test(passVal)) {
          inputPass.setCustomValidity("Digite a senha de 4 números");
          inputPass.reportValidity();
          return;
        }
        if (!checkPassword(nickVal, passVal)) {
          inputPass.setCustomValidity("Senha incorreta");
          inputPass.reportValidity();
          return;
        }
        // Senha correta - loga
        setNick(nickVal);
        setPass(passVal);
        updateNickDisplay();
        if (modalNick) modalNick.close();
        toast("Bem-vindo de volta!", "success");
        return;
      }

      // Novo nick - precisa criar senha de 4 números
      if (!passVal || passVal.length !== 4 || !/^\d{4}$/.test(passVal)) {
        inputPass.setCustomValidity("Crie uma senha de 4 números");
        inputPass.reportValidity();
        return;
      }

      try {
        await registerNick(nickVal, passVal);
        setNick(nickVal);
        setPass(passVal);
        updateNickDisplay();
        if (modalNick) modalNick.close();
        toast("Nick registrado!", "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }
}

function updateNickDisplay() {
  if (nickDisplay) {
    nickDisplay.textContent = getNick() || "—";
  }
}

// Modal de tipo (online/presencial)
function setupTypeModal() {
  const cancelBtn = modalType?.querySelector("[data-close]");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => modalType?.close());
  }

  if (formType) {
    formType.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!pendingTypeDate) return;

      const fd = new FormData(formType);
      const type = fd.get("mix-type");

      try {
        await setMixType(pendingTypeDate, type);
        toast(`Mix definido como ${type}!`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
      modalType?.close();
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

    const currentType = getMix(pendingTypeDate)?.type || "online";
    formType?.querySelectorAll('input[name="mix-type"]').forEach((r) => {
      r.checked = r.value === currentType;
    });

    modalType?.showModal();
  });
}

// Clique em slot/complete/copiar
function setupSlotClick() {
  document.addEventListener("click", async (e) => {
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
      await handleSlotClick(dateKey, slotNum, nick);
    } else if (complete) {
      const dateKey = complete.dataset.date;
      const compNum = parseInt(complete.dataset.complete, 10);
      await handleCompleteClick(dateKey, compNum, nick);
    }
  });
}

async function handleSlotClick(dateKey, slotNum, nick) {
  const current = getMix(dateKey).slots?.[slotNum];

  if (current === nick) {
    await leaveSlot(dateKey, slotNum, nick);
    toast("Você saiu do slot", "success");
  } else if (!current) {
    // Remove de outros slots/complete do mesmo dia
    const dayData = getMix(dateKey);
    if (dayData.slots) {
      for (const [k, n] of Object.entries(dayData.slots)) {
        if (n === nick) await leaveSlot(dateKey, parseInt(k, 10), nick);
      }
    }
    if (dayData.complete) {
      for (const [k, n] of Object.entries(dayData.complete)) {
        if (n === nick) await leaveComplete(dateKey, parseInt(k, 10), nick);
      }
    }

    await joinSlot(dateKey, slotNum, nick);
    toast(`Slot ${slotNum} reservado!`, "success");
  } else {
    toast("Esse slot já está ocupado", "error");
  }
}

async function handleCompleteClick(dateKey, compNum, nick) {
  const current = getMix(dateKey).complete?.[compNum];

  if (current === nick) {
    await leaveComplete(dateKey, compNum, nick);
    toast("Você saiu do complete", "success");
  } else if (!current) {
    // Remove de outros lugares
    const dayData = getMix(dateKey);
    if (dayData.slots) {
      for (const [k, n] of Object.entries(dayData.slots)) {
        if (n === nick) await leaveSlot(dateKey, parseInt(k, 10), nick);
      }
    }
    if (dayData.complete) {
      for (const [k, n] of Object.entries(dayData.complete)) {
        if (n === nick) await leaveComplete(dateKey, parseInt(k, 10), nick);
      }
    }

    await joinComplete(dateKey, compNum, nick);
    toast(`Complete ${compNum} reservado!`, "success");
  } else {
    toast("Esse complete já está ocupado", "error");
  }
}

// Copiar lista para WhatsApp
function copyListToClipboard(dateKey) {
  const data = getMix(dateKey);
  const day = getNext10Days().find((d) => d.key === dateKey);
  const typeLabel = data.type === "online" ? "ONLINE" : data.type === "presencial" ? "PRESENCIAL" : "A DEFINIR";

  let text = `MIX ${day.dayName} ${day.dateBR} ${typeLabel}\n`;

  for (let i = 1; i <= 10; i++) {
    const nick = data.slots?.[i];
    text += `${i} ${nick || ""}\n`;
  }

  const completeCount = countComplete(dateKey);
  if (completeCount > 0) {
    text += `\nCOMPLETE:\n`;
    for (let i = 1; i <= 5; i++) {
      const nick = data.complete?.[i];
      if (nick) text += `${i} ${nick}\n`;
    }
  }

  navigator.clipboard.writeText(text.trim()).then(() => {
    toast("Lista copiada!", "success");
  }).catch(() => {
    toast("Erro ao copiar", "error");
  });
}

// Modal Admin
function setupAdminModal() {
  const modalAdmin = document.getElementById("modal-admin");
  const formAdmin = document.getElementById("form-admin");
  const adminEmail = document.getElementById("admin-email");
  const adminPass = document.getElementById("admin-pass");
  const adminPanel = document.getElementById("admin-panel");
  const banInput = document.getElementById("ban-nick");
  const btnBan = document.getElementById("btn-ban");
  const btnUnban = document.getElementById("btn-unban");
  const resetInput = document.getElementById("reset-nick");
  const resetPassInput = document.getElementById("reset-pass");
  const btnReset = document.getElementById("btn-reset");
  const bannedList = document.getElementById("banned-list");
  const cancelBtn = modalAdmin?.querySelector("[data-close]");

  if (!modalAdmin || !adminBtn) return;

  // Abrir modal admin
  adminBtn.addEventListener("click", () => {
    if (isAdminLoggedIn()) {
      showAdminPanel();
    } else {
      if (adminPanel) adminPanel.style.display = "none";
      if (formAdmin) formAdmin.style.display = "block";
      if (formAdmin) formAdmin.reset();
      modalAdmin.showModal();
    }
  });

  // Fechar modal
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => modalAdmin.close());
  }

  // Login admin (posseydom@gmail.com / manu123@)
  if (formAdmin) {
    formAdmin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = adminEmail?.value.trim();
      const pass = adminPass?.value;

      const success = await loginAdmin(email, pass);
      if (success) {
        toast("Login admin realizado!", "success");
        showAdminPanel();
      } else {
        toast("Email ou senha incorretos", "error");
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
    bannedList.innerHTML = banned
      .map(
        (nick) => `
      <li>
        <span>${escapeHtml(nick)}</span>
        <button class="unban-btn" data-unban="${escapeHtml(nick)}">Desbanir</button>
      </li>
    `
      )
      .join("");
  }

  // Banir nick
  if (btnBan) {
    btnBan.addEventListener("click", async () => {
      const nick = sanitizeNick(banInput?.value);
      if (!nick) {
        toast("Digite um nick", "error");
        return;
      }
      try {
        await banNick(nick);
        toast(`${nick} foi banido!`, "success");
        renderBannedList();
      } catch (err) {
        toast(err.message, "error");
      }
      if (banInput) banInput.value = "";
    });
  }

  // Desbanir nick
  if (btnUnban) {
    btnUnban.addEventListener("click", async () => {
      const nick = sanitizeNick(banInput?.value);
      if (!nick) {
        toast("Digite um nick", "error");
        return;
      }
      try {
        await unbanNick(nick);
        toast(`${nick} foi desbanido!`, "success");
        renderBannedList();
      } catch (err) {
        toast(err.message, "error");
      }
      if (banInput) banInput.value = "";
    });
  }

  // Resetar senha
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      const nick = sanitizeNick(resetInput?.value);
      const newPass = resetPassInput?.value.trim();

      if (!nick) {
        toast("Digite um nick", "error");
        return;
      }
      if (!newPass || newPass.length !== 4 || !/^\d{4}$/.test(newPass)) {
        toast("Senha deve ter 4 números", "error");
        return;
      }

      try {
        await resetPlayerPassword(nick, newPass);
        toast(`Senha de ${nick} resetada!`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
      if (resetInput) resetInput.value = "";
      if (resetPassInput) resetPassInput.value = "";
    });
  }

  // Desbanir pelo botão na lista
  document.addEventListener("click", async (e) => {
    const unbanBtn = e.target.closest("[data-unban]");
    if (!unbanBtn) return;
    const nick = unbanBtn.dataset.unban;
    try {
      await unbanNick(nick);
      toast(`${nick} foi desbanido!`, "success");
      renderBannedList();
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

// Inicialização
function boot() {
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
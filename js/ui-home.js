// js/ui-home.js
// Render da home - Firebase Auth + RTDB

import {
  getNick, setNick, clearSession,
  isBanned, isAdminLoggedIn, loginUser, registerUser, logoutUser,
  getBannedNicks, banNick, unbanNick,
  getAllPlayers, setPlayerLevel, getLevelColor, formatLevel,
  getMix, setMixType,
  joinSlot, leaveSlot, joinComplete, leaveComplete,
  countSlots, countComplete,
  subscribe, auth
} from "./identity.js";
import { getNext10Days, getStatus, sanitizeNick, escapeHtml } from "./utils.js";

const grid = document.getElementById("mixes-grid");
const modalNick = document.getElementById("modal-nick");
const modalLogin = document.getElementById("modal-login");
const formRegister = document.getElementById("form-register");
const formLogin = document.getElementById("form-login");
const regNick = document.getElementById("reg-nick");
const regEmail = document.getElementById("reg-email");
const regPass = document.getElementById("reg-pass");
const loginEmail = document.getElementById("login-email");
const loginPass = document.getElementById("login-pass");
const btnShowLogin = document.getElementById("btn-show-login");
const btnBackRegister = document.getElementById("btn-back-register");
const nickDisplay = document.getElementById("current-nick");
const changeNickBtn = document.getElementById("change-nick");
const modalType = document.getElementById("modal-type");
const formType = document.getElementById("form-type");
const modalTypeDay = document.getElementById("modal-type-day");
const toastArea = document.getElementById("toast-area");
const adminBtn = document.getElementById("admin-btn");

let pendingTypeDate = null;

subscribe(() => render());

function toast(msg, kind = "") {
  if (!toastArea) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toastArea.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 2200);
}

function renderMixCard(day) {
  const data = getMix(day.key);
  const count = countSlots(day.key);
  const status = getStatus(count);
  const completeCount = countComplete(day.key);

  const typeLabel = data.type === "online" ? "Online" : data.type === "presencial" ? "Presencial" : "Clique para definir";
  const typeIcon = data.type === "online" ? "🌐" : data.type === "presencial" ? "📍" : "❓";
  const typeBadgeClass = data.type === "online" ? "online" : data.type === "presencial" ? "presencial" : "none";

  let slotsHtml = "";
  for (let i = 1; i <= 10; i++) {
    const nick = data.slots?.[i];
    const isMe = nick && nick === getNick();
    const isBannedUser = nick && isBanned(nick);
    slotsHtml += `<div class="slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""} ${isBannedUser ? "banned" : ""}" data-date="${day.key}" data-slot="${i}" title="${nick ? escapeHtml(nick) : `Slot ${i}`}">${nick ? escapeHtml(nick) : i}</div>`;
  }

  let completeHtml = "";
  for (let i = 1; i <= 5; i++) {
    const nick = data.complete?.[i];
    const isMe = nick && nick === getNick();
    completeHtml += `<div class="complete-slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}" data-date="${day.key}" data-complete="${i}" title="${nick ? escapeHtml(nick) : `Complete ${i}`}">${nick ? escapeHtml(nick) : i}</div>`;
  }

  return `
    <article class="mix-card status-${status.id}" data-date="${day.key}">
      <header class="mix-card-header">
        <div class="mix-day-name">${escapeHtml(day.dayName)}</div>
        <div class="mix-date">${escapeHtml(day.dateBR)}${day.isToday ? " • HOJE" : ""}</div>
      </header>
      <div class="mix-type-badge ${typeBadgeClass}" data-action="set-type" data-date="${day.key}">${typeIcon} ${typeLabel}</div>
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
  grid.innerHTML = getNext10Days().map(renderMixCard).join("");
  updateUI();
}

function updateUI() {
  if (!auth?.currentUser) {
    if (nickDisplay) nickDisplay.textContent = "—";
    if (changeNickBtn) changeNickBtn.textContent = "Entrar";
  } else {
    if (nickDisplay) nickDisplay.textContent = getNick() || "—";
    if (changeNickBtn) changeNickBtn.textContent = "Sair";
  }
}

// ---- Auth modals ----
function setupAuth() {
  // Show register modal if not logged in
  if (!auth?.currentUser) {
    setTimeout(() => modalNick?.showModal(), 300);
  } else {
    updateUI();
  }

  // Botão ao lado de "Jogando como" → Entrar / Sair
  if (changeNickBtn) {
    changeNickBtn.addEventListener("click", async () => {
      if (auth?.currentUser) {
        if (confirm(`Sair da conta ${getNick()}?`)) {
          await logoutUser();
          toast("Você saiu", "success");
          updateUI();
          modalNick.showModal();
        }
      } else {
        modalNick.showModal();
      }
    });
  }

  // Já possuo conta → abre modal login
  if (btnShowLogin) {
    btnShowLogin.addEventListener("click", () => {
      modalNick.close();
      modalLogin.showModal();
    });
  }

  // Voltar para criar conta
  if (btnBackRegister) {
    btnBackRegister.addEventListener("click", () => {
      modalLogin.close();
      modalNick.showModal();
    });
  }

  // CRIAR conta
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nick = sanitizeNick(regNick.value);
      const email = regEmail.value.trim();
      const pass = regPass.value;

      if (nick.length < 2) { toast("Nick: mínimo 2 caracteres", "error"); return; }
      if (pass.length < 6) { toast("Senha: mínimo 6 caracteres", "error"); return; }

      try {
        await registerUser(email, pass, nick);
        setNick(nick);
        modalNick.close();
        toast("Conta criada! Bem-vindo!", "success");
        updateUI();
        render();
      } catch (err) {
        console.error(err);
        toast(err.message.replace("Firebase: ", ""), "error");
      }
    });
  }

  // ENTRAR na conta existente
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const pass = loginPass.value;

      try {
        await loginUser(email, pass);
        modalLogin.close();
        toast("Login realizado!", "success");
        updateUI();
        render();
      } catch (err) {
        console.error(err);
        toast(err.message.replace("Firebase: ", ""), "error");
      }
    });
  }
}

// ---- Type modal ----
function setupTypeModal() {
  const cancelBtn = modalType?.querySelector("[data-close]");
  if (cancelBtn) cancelBtn.addEventListener("click", () => modalType?.close());

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

    if (!auth?.currentUser) {
      toast("Faça login primeiro!", "error");
      modalNick?.showModal();
      return;
    }

    pendingTypeDate = badge.dataset.date;
    const day = getNext10Days().find((d) => d.key === pendingTypeDate);
    if (modalTypeDay) modalTypeDay.textContent = day ? `${day.dayLong} (${day.dateBR})` : pendingTypeDate;
    const currentType = getMix(pendingTypeDate)?.type || "online";
    formType?.querySelectorAll('input[name="mix-type"]').forEach((r) => { r.checked = r.value === currentType; });
    modalType?.showModal();
  });
}

// ---- Slot / complete / copy ----
function setupSlotClick() {
  document.addEventListener("click", async (e) => {
    const slot = e.target.closest(".slot");
    const complete = e.target.closest(".complete-slot");
    const copyBtn = e.target.closest('[data-action="copy"]');

    if (copyBtn) { copyListToClipboard(copyBtn.dataset.date); return; }
    if (!slot && !complete) return;

    if (!auth?.currentUser) {
      toast("Faça login primeiro!", "error");
      modalNick?.showModal();
      return;
    }

    const nick = getNick();
    if (slot) await handleSlotClick(slot.dataset.date, parseInt(slot.dataset.slot, 10), nick);
    else if (complete) await handleCompleteClick(complete.dataset.date, parseInt(complete.dataset.complete, 10), nick);
  });
}

async function handleSlotClick(dateKey, slotNum, nick) {
  const current = getMix(dateKey).slots?.[slotNum];
  if (current === nick) {
    await leaveSlot(dateKey, slotNum, nick);
    toast("Você saiu do slot", "success");
  } else if (!current) {
    const dayData = getMix(dateKey);
    if (dayData.slots) for (const [k, n] of Object.entries(dayData.slots)) if (n === nick) await leaveSlot(dateKey, parseInt(k, 10), nick);
    if (dayData.complete) for (const [k, n] of Object.entries(dayData.complete)) if (n === nick) await leaveComplete(dateKey, parseInt(k, 10), nick);
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
    const dayData = getMix(dateKey);
    if (dayData.slots) for (const [k, n] of Object.entries(dayData.slots)) if (n === nick) await leaveSlot(dateKey, parseInt(k, 10), nick);
    if (dayData.complete) for (const [k, n] of Object.entries(dayData.complete)) if (n === nick) await leaveComplete(dateKey, parseInt(k, 10), nick);
    await joinComplete(dateKey, compNum, nick);
    toast(`Complete ${compNum} reservado!`, "success");
  } else {
    toast("Esse complete já está ocupado", "error");
  }
}

function copyListToClipboard(dateKey) {
  const data = getMix(dateKey);
  const day = getNext10Days().find((d) => d.key === dateKey);
  const typeLabel = data.type === "online" ? "ONLINE" : data.type === "presencial" ? "PRESENCIAL" : "A DEFINIR";
  let text = `MIX ${day.dayName} ${day.dateBR} ${typeLabel}\n`;
  for (let i = 1; i <= 10; i++) text += `${i} ${data.slots?.[i] || ""}\n`;
  if (countComplete(dateKey) > 0) {
    text += "\nCOMPLETE:\n";
    for (let i = 1; i <= 5; i++) { if (data.complete?.[i]) text += `${i} ${data.complete[i]}\n`; }
  }
  navigator.clipboard.writeText(text.trim()).then(() => toast("Lista copiada!", "success")).catch(() => toast("Erro ao copiar", "error"));
}

// ---- Admin modal ----
function setupAdmin() {
  const modalAdmin = document.getElementById("modal-admin");
  const formAdmin = document.getElementById("form-admin");
  const adminEmail = document.getElementById("admin-email");
  const adminPass = document.getElementById("admin-pass");
  const adminPanel = document.getElementById("admin-panel");
  const banInput = document.getElementById("ban-nick");
  const btnBan = document.getElementById("btn-ban");
  const btnUnban = document.getElementById("btn-unban");
  const bannedList = document.getElementById("banned-list");
  const cancelBtn = modalAdmin?.querySelector("[data-close]");

  if (!modalAdmin || !adminBtn) return;

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

  if (cancelBtn) cancelBtn.addEventListener("click", () => modalAdmin.close());

  if (formAdmin) {
    formAdmin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = adminEmail?.value.trim();
      const pass = adminPass?.value;
      try {
        await loginUser(email, pass);
        // Espera onAuthStateChanged setar isAdminUser
        await new Promise(r => setTimeout(r, 500));
        if (isAdminLoggedIn()) {
          toast("Login admin realizado!", "success");
          showAdminPanel();
        } else {
          toast("Este email não é admin", "error");
        }
      } catch (err) {
        toast(err.message.replace("Firebase: ", ""), "error");
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
    if (banned.length === 0) { bannedList.innerHTML = '<li style="color: var(--text-faint);">Nenhum nick banido</li>'; return; }
    bannedList.innerHTML = banned.map((nick) => `<li><span>${escapeHtml(nick)}</span><button class="unban-btn" data-unban="${escapeHtml(nick)}">Desbanir</button></li>`).join("");
  }

  if (btnBan) btnBan.addEventListener("click", async () => {
    const nick = sanitizeNick(banInput?.value);
    if (!nick) { toast("Digite um nick", "error"); return; }
    try { await banNick(nick); toast(`${nick} banido!`, "success"); renderBannedList(); }
    catch (err) { toast(err.message, "error"); }
    if (banInput) banInput.value = "";
  });

  if (btnUnban) btnUnban.addEventListener("click", async () => {
    const nick = sanitizeNick(banInput?.value);
    if (!nick) { toast("Digite um nick", "error"); return; }
    try { await unbanNick(nick); toast(`${nick} desbanido!`, "success"); renderBannedList(); }
    catch (err) { toast(err.message, "error"); }
    if (banInput) banInput.value = "";
  });

  document.addEventListener("click", async (e) => {
    const unbanBtn = e.target.closest("[data-unban]");
    if (!unbanBtn) return;
    try { await unbanNick(unbanBtn.dataset.unban); toast("Desbanido!", "success"); renderBannedList(); }
    catch (err) { toast(err.message, "error"); }
  });
}

function boot() {
  setupAuth();
  setupTypeModal();
  setupSlotClick();
  setupAdmin();
  // Aguarda um momento para o Firebase Auth inicializar
  setTimeout(render, 200);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
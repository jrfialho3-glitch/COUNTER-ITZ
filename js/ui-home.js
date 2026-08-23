// js/ui-home.js
// Render da home — fluxo de auth + área do usuário + mixes em tempo real.

import {
  isLoggedIn, isAuthReady, getPlayer, getEmail, getUid,
  registerUser, loginUser, logoutUser,
  changeNick, setMyLevel,
  getMix, setMixType,
  joinSlot, leaveSlot, joinComplete, leaveComplete,
  countSlots, countComplete, getPlayerByNick,
  subscribe
} from "./identity.js";
import { getNext10Days, getStatus, escapeHtml, getLevelColor, formatLevel } from "./utils.js";

// ---- Elementos do DOM ----
const grid = document.getElementById("mixes-grid");
const userPanel = document.getElementById("user-panel");
const userEmailEl = document.getElementById("user-email");
const userNickEl = document.getElementById("user-nick");
const nickLockInfoEl = document.getElementById("nick-lock-info");
const btnChangeNick = document.getElementById("btn-change-nick");
const btnLogout = document.getElementById("btn-logout");
const levelSelect = document.getElementById("user-level");

// Header
const nickDisplay = document.getElementById("current-nick");
const changeNickBtn = document.getElementById("change-nick");

// Modais
const modalRegister = document.getElementById("modal-register");
const modalLogin = document.getElementById("modal-login");
const modalSetNick = document.getElementById("modal-setnick");
const modalType = document.getElementById("modal-type");
const modalAccount = document.getElementById("modal-account");
const acctEmail = document.getElementById("acct-email");
const acctNick = document.getElementById("acct-nick");
const acctLevel = document.getElementById("acct-level");
const acctLevelPreview = document.getElementById("acct-level-preview");
const acctChangeNick = document.getElementById("acct-change-nick");
const acctLogout = document.getElementById("acct-logout");
const formRegister = document.getElementById("form-register");
const formLogin = document.getElementById("form-login");
const formSetNick = document.getElementById("form-setnick");
const formType = document.getElementById("form-type");
const regEmail = document.getElementById("reg-email");
const regPass = document.getElementById("reg-pass");
const loginEmail = document.getElementById("login-email");
const loginPass = document.getElementById("login-pass");
const newNick = document.getElementById("new-nick");
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const modalTypeDay = document.getElementById("modal-type-day");

const toastArea = document.getElementById("toast-area");

let pendingTypeDate = null;
let suppressSetNickPrompt = false; // impede modal de nick quando o próprio user acabou de salvar

subscribe(() => render());

// ---- Toast ----
function toast(msg, kind = "") {
  if (!toastArea) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toastArea.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 2400);
}

// ---- Render dos cards de mix ----
function renderMixCard(day) {
  const data = getMix(day.key);
  const count = countSlots(day.key);
  const status = getStatus(count);
  const completeCount = countComplete(day.key);
  const me = getPlayer();
  const myNick = me?.nick || "";
  const myLevel = me?.level || 1000;
  const myColor = getLevelColor(myLevel);

  const typeLabel = data.type === "online" ? "Online" : data.type === "presencial" ? "Presencial" : "Clique para definir";
  const typeIcon = data.type === "online" ? "🌐" : data.type === "presencial" ? "📍" : "❓";
  const typeBadgeClass = data.type === "online" ? "online" : data.type === "presencial" ? "presencial" : "none";

  // Pega a cor do level de quem está no slot pra colorir o quadrado
  function playerColor(nick) {
    if (!nick) return null;
    if (nick === myNick) return myColor;
    const other = getPlayerByNick(nick);
    if (other && other.level) return getLevelColor(other.level);
    return null;
  }

  let slotsHtml = "";
  for (let i = 1; i <= 10; i++) {
    const nick = data.slots?.[i];
    const isMe = nick && nick === myNick;
    const color = playerColor(nick);
    const style = color ? `style="--slot-color:${color};border-color:${color};color:${color};"` : "";
    slotsHtml += `<div class="slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}" data-date="${day.key}" data-slot="${i}" ${style} title="${nick ? escapeHtml(nick) + (isMe ? " (tu)" : "") : `Slot ${i}`}">${nick ? escapeHtml(nick) : i}</div>`;
  }

  let completeHtml = "";
  for (let i = 1; i <= 5; i++) {
    const nick = data.complete?.[i];
    const isMe = nick && nick === myNick;
    const color = playerColor(nick);
    const style = color ? `style="--slot-color:${color};border-color:${color};color:${color};"` : "";
    completeHtml += `<div class="complete-slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}" data-date="${day.key}" data-complete="${i}" ${style} title="${nick ? escapeHtml(nick) + (isMe ? " (tu)" : "") : `Complete ${i}`}">${nick ? escapeHtml(nick) : i}</div>`;
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
  // Render user panel + header
  renderUserArea();

  if (grid) {
    grid.innerHTML = getNext10Days().map(renderMixCard).join("");
  }
}

function renderUserArea() {
  const me = getPlayer();
  const logged = isLoggedIn();

  if (userPanel) userPanel.hidden = !logged;
  if (logged && me) {
    if (userEmailEl) userEmailEl.textContent = me.email || getEmail();
    if (userNickEl) userNickEl.textContent = me.nick;
    if (nickLockInfoEl) {
      nickLockInfoEl.textContent = me.nickChanged ? "🔒 Nick travado (já trocaste)" : "";
    }
    if (btnChangeNick) {
      btnChangeNick.disabled = !!me.nickChanged;
      btnChangeNick.textContent = me.nickChanged ? "Nick travado" : "Trocar Nick";
    }
    if (levelSelect) levelSelect.value = String(me.level);
  }

  if (nickDisplay) nickDisplay.textContent = logged && me ? me.nick : "—";
  if (changeNickBtn) changeNickBtn.textContent = logged ? "Minha Conta" : "Entrar";
}

// Abre modal "Minha Conta" pré-preenchido
function openAccountModal() {
  if (!isLoggedIn()) { modalLogin?.showModal(); return; }
  const me = getPlayer();
  if (!me) return;
  if (acctEmail) acctEmail.textContent = me.email || getEmail();
  if (acctNick) acctNick.textContent = me.nick;
  // popula o select se ainda não foi populado
  if (acctLevel && acctLevel.options.length === 0) {
    for (let v = 1000; v <= 30000; v += 1000) {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = `${(v / 1000).toFixed(0)}k`;
      acctLevel.appendChild(opt);
    }
  }
  if (acctLevel) acctLevel.value = String(me.level);
  updateLevelPreview(me.level);
  if (acctChangeNick) {
    acctChangeNick.disabled = !!me.nickChanged;
    acctChangeNick.textContent = me.nickChanged ? "Nick travado" : "Trocar Nick";
  }
  modalAccount?.showModal();
}

function updateLevelPreview(level) {
  if (!acctLevelPreview) return;
  const color = getLevelColor(level);
  acctLevelPreview.textContent = formatLevel(level);
  acctLevelPreview.style.background = color;
  acctLevelPreview.style.color = "#fff";
}

// ---- Modal fluxo: NÃO abre automaticamente. Usuário clica no botão pra abrir. ----
function maybeOpenAuthModal() {
  // No-op: o usuário abre o modal quando quiser, clicando no botão "Entrar" / "Minha Conta" do header.
}

// ---- Auth (criar / entrar) ----
function setupAuth() {
  // Não abre modal sozinho — usuário clica no botão.

  // Botão "Entrar" / "Minha Conta" no header
  if (changeNickBtn) {
    changeNickBtn.addEventListener("click", () => {
      if (isLoggedIn()) {
        openAccountModal();
      } else {
        // Abre a caixa de LOGIN primeiro (não mais a de registro)
        modalLogin?.showModal();
      }
    });
  }

  // Botão "Sair" dentro do modal "Minha Conta"
  if (acctLogout) {
    acctLogout.addEventListener("click", async () => {
      if (!confirm(`Sair da conta ${getEmail()}?`)) return;
      try {
        await logoutUser();
        modalAccount?.close();
        toast("Sessão encerrada", "success");
      } catch (e) { toast(e.message, "error"); }
    });
  }

  // Botão "Trocar Nick" dentro do modal "Minha Conta"
  if (acctChangeNick) {
    acctChangeNick.addEventListener("click", () => {
      const me = getPlayer();
      if (!me) return;
      if (me.nickChanged) {
        toast("Já trocaste teu nick. Não dá pra trocar de novo.", "error");
        return;
      }
      if (newNick) newNick.value = me.nick;
      modalAccount?.close();
      modalSetNick?.showModal();
    });
  }

  // Select de level dentro do modal "Minha Conta"
  if (acctLevel) {
    acctLevel.addEventListener("change", async () => {
      const me = getPlayer();
      if (!me) { toast("Faça login primeiro", "error"); return; }
      const newLevel = parseInt(acctLevel.value, 10);
      try {
        await setMyLevel(newLevel);
        updateLevelPreview(newLevel);
        if (levelSelect) levelSelect.value = String(newLevel);
        toast(`Level atualizado pra ${(newLevel / 1000).toFixed(0)}k!`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // Botão "Fechar" do modal conta (qualquer data-close)
  modalAccount?.querySelectorAll("[data-close]").forEach((b) => {
    b.addEventListener("click", () => modalAccount?.close());
  });

  // Botão "Já possuo conta" no modal de registro → abre modal de login
  if (btnShowLogin) {
    btnShowLogin.addEventListener("click", () => {
      modalRegister.close();
      modalLogin.showModal();
    });
  }

  // Botão verde "CRIAR CONTA" no rodapé do modal de login → abre modal de registro
  if (btnShowRegister) {
    btnShowRegister.addEventListener("click", () => {
      modalLogin.close();
      modalRegister.showModal();
    });
  }

  // (removido btnBackRegister — agora o fluxo é: login → "CRIAR CONTA" verde → registro)

  // Submit CRIAR conta
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = regEmail.value.trim();
      const pass = regPass.value;
      if (!email || !pass) return;
      if (pass.length < 6) { toast("Senha precisa ter no mínimo 6 caracteres", "error"); return; }
      try {
        await registerUser(email, pass);
        modalRegister.close();
        toast("Conta criada! 🎉", "success");
        // Após login o onAuthStateChanged dispara ensurePlayerProfile
        // que cria o perfil com nick padrão (parte do email antes do @)
      } catch (err) {
        console.error(err);
        toast(cleanMsg(err.message), "error");
      }
    });
  }

  // Submit ENTRAR na conta existente
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const pass = loginPass.value;
      try {
        await loginUser(email, pass);
        modalLogin.close();
        toast("Login feito! Bem-vindo de volta 👋", "success");
      } catch (err) {
        console.error(err);
        toast(cleanMsg(err.message), "error");
      }
    });
  }

  // Sair (botão da área do usuário)
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try { await logoutUser(); toast("Sessão encerrada", "success"); }
      catch (e) { toast(e.message, "error"); }
    });
  }

  // Trocar nick (botão da área do usuário)
  if (btnChangeNick) {
    btnChangeNick.addEventListener("click", () => {
      const me = getPlayer();
      if (!me) return;
      if (me.nickChanged) {
        toast("Já trocaste teu nick. Não dá pra trocar de novo.", "error");
        return;
      }
      if (newNick) newNick.value = me.nick;
      modalSetNick.showModal();
    });
  }

  // Submit troca de nick
  if (formSetNick) {
    formSetNick.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await changeNick(newNick.value);
        suppressSetNickPrompt = true;
        modalSetNick.close();
        toast("Nick atualizado! 🔒", "success");
        render();
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }
}

function cleanMsg(msg) {
  return String(msg || "").replace(/^Firebase:\s*/i, "").replace(/^Error:\s*/i, "");
}

// ---- Modal de tipo (online/presencial) ----
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
    if (!isLoggedIn()) {
      toast("Faça login primeiro", "error");
      modalLogin?.showModal();
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

// ---- Clique em slot / complete / copiar ----
function setupSlotClick() {
  document.addEventListener("click", async (e) => {
    const slot = e.target.closest(".slot");
    const complete = e.target.closest(".complete-slot");
    const copyBtn = e.target.closest('[data-action="copy"]');

    if (copyBtn) { copyListToClipboard(copyBtn.dataset.date); return; }
    if (!slot && !complete) return;

    if (!isLoggedIn()) {
      toast("Faça login primeiro", "error");
      modalLogin?.showModal();
      return;
    }

    // Espera o profile ficar pronto (caso o usuário clique rápido após login)
    let me = getPlayer();
    let waited = 0;
    while (!me && waited < 3000) {
      await new Promise((r) => setTimeout(r, 100));
      me = getPlayer();
      waited += 100;
    }
    if (!me) {
      toast("Perfil carregando, tenta de novo em 1 segundo", "error");
      return;
    }
    const nick = me.nick;
    if (slot) await handleSlotClick(slot.dataset.date, parseInt(slot.dataset.slot, 10), nick);
    else if (complete) await handleCompleteClick(complete.dataset.date, parseInt(complete.dataset.complete, 10), nick);
  });
}

async function handleSlotClick(dateKey, slotNum, nick) {
  const current = getMix(dateKey).slots?.[slotNum];
  try {
    if (current === nick) {
      await leaveSlot(dateKey, slotNum, nick);
      toast("Saiu do slot", "success");
    } else if (!current) {
      // Limpa o nick de qualquer outro slot/complete do mesmo dia
      const dayData = getMix(dateKey);
      if (dayData.slots) for (const [k, n] of Object.entries(dayData.slots)) if (n === nick) await leaveSlot(dateKey, parseInt(k, 10), nick);
      if (dayData.complete) for (const [k, n] of Object.entries(dayData.complete)) if (n === nick) await leaveComplete(dateKey, parseInt(k, 10), nick);
      await joinSlot(dateKey, slotNum, nick);
      toast(`Slot ${slotNum} reservado!`, "success");
    } else {
      toast("Esse slot já tá ocupado", "error");
    }
  } catch (err) { toast(err.message, "error"); }
}

async function handleCompleteClick(dateKey, compNum, nick) {
  const current = getMix(dateKey).complete?.[compNum];
  try {
    if (current === nick) {
      await leaveComplete(dateKey, compNum, nick);
      toast("Saiu do complete", "success");
    } else if (!current) {
      const dayData = getMix(dateKey);
      if (dayData.slots) for (const [k, n] of Object.entries(dayData.slots)) if (n === nick) await leaveSlot(dateKey, parseInt(k, 10), nick);
      if (dayData.complete) for (const [k, n] of Object.entries(dayData.complete)) if (n === nick) await leaveComplete(dateKey, parseInt(k, 10), nick);
      await joinComplete(dateKey, compNum, nick);
      toast(`Complete ${compNum} reservado!`, "success");
    } else {
      toast("Esse complete já tá ocupado", "error");
    }
  } catch (err) { toast(err.message, "error"); }
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

// ---- Level (1k–30k) na área do usuário ----
function setupLevelSelect() {
  if (!levelSelect) return;
  // Preenche as opções 1k..30k em passos de 1k
  levelSelect.innerHTML = "";
  for (let v = 1000; v <= 30000; v += 1000) {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = `${(v / 1000).toFixed(0)}k`;
    levelSelect.appendChild(opt);
  }
  levelSelect.addEventListener("change", async () => {
    const me = getPlayer();
    if (!me) { toast("Faça login primeiro", "error"); return; }
    const newLevel = parseInt(levelSelect.value, 10);
    try {
      await setMyLevel(newLevel);
      toast(`Level atualizado pra ${(newLevel / 1000).toFixed(0)}k!`, "success");
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

// ---- Boot ----
function boot() {
  setupAuth();
  setupTypeModal();
  setupSlotClick();
  setupLevelSelect();
  render();
  // Re-render depois que o auth inicializar (pega perfil)
  setTimeout(render, 500);
  setTimeout(render, 1500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

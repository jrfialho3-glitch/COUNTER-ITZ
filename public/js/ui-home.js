// js/ui-home.js
// Home CSMIX — seleção de modo, mixes em tempo real e modal de perfil.

import {
  isLoggedIn, isAuthReady, getPlayer, getEmail,
  registerUser, loginUser, logoutUser,
  changeNick,
  getMix, setMixType,
  joinSlot, leaveSlot, joinComplete, leaveComplete,
  countSlots, countComplete,
  subscribe
} from "./identity.js";
import { getNext10Days, getStatus, escapeHtml } from "./utils.js";

// ---- Elementos ----
const homeScreen = document.getElementById("homeScreen");
const mixesScreen = document.getElementById("mixesScreen");
const mixesTitle = document.getElementById("mixesTitle");
const mixesSubtitle = document.getElementById("mixesSubtitle");
const grid = document.getElementById("cardsGrid");
const onlineButton = document.getElementById("onlineButton");
const lanButton = document.getElementById("lanButton");
const backHomeButton = document.getElementById("backHomeButton");

const profileButton = document.getElementById("profileButton");
const profileModal = document.getElementById("profileModal");
const closeProfileButton = document.getElementById("closeProfileButton");
const profileHomeView = document.getElementById("profileHomeView");
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const loggedProfileView = document.getElementById("loggedProfileView");
const showLoginButton = document.getElementById("showLoginButton");
const showRegisterButton = document.getElementById("showRegisterButton");
const backFromLoginButton = document.getElementById("backFromLoginButton");
const backFromRegisterButton = document.getElementById("backFromRegisterButton");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const loggedEmail = document.getElementById("loggedEmail");
const nickInput = document.getElementById("nickInput");
const nickMessage = document.getElementById("nickMessage");
const saveNickButton = document.getElementById("saveNickButton");
const logoutButton = document.getElementById("logoutButton");
const toastHost = document.getElementById("toast");

let currentMode = null; // "online" | "presencial" | null

// ---- Toast ----
function showToast(msg, kind = "") {
  if (!toastHost) return;
  const el = document.createElement("div");
  el.className = `toast-item ${kind}`;
  el.textContent = msg;
  toastHost.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

function cleanMsg(msg = "") {
  return String(msg)
    .replace("Firebase: ", "")
    .replace(/\(auth\/[^)]+\)\.?/, "")
    .trim() || "Algo deu errado";
}

// ---- Telas ----
function openMixes(mode) {
  currentMode = mode;
  homeScreen.classList.add("is-hidden");
  mixesScreen.classList.add("is-active");
  mixesTitle.textContent = mode === "presencial" ? "LAN" : "ONLINE";
  mixesSubtitle.textContent = "Próximos 10 dias";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backHome() {
  currentMode = null;
  mixesScreen.classList.remove("is-active");
  homeScreen.classList.remove("is-hidden");
}

onlineButton?.addEventListener("click", () => openMixes("online"));
lanButton?.addEventListener("click", () => openMixes("presencial"));
backHomeButton?.addEventListener("click", backHome);

// ---- Modal de perfil ----
function setView(view) {
  [profileHomeView, loginView, registerView, loggedProfileView].forEach((v) => v?.classList.remove("active"));
  view?.classList.add("active");
}

function openProfile() {
  profileModal.classList.add("open");
  if (isLoggedIn()) {
    setView(loggedProfileView);
    fillProfile();
  } else {
    setView(profileHomeView);
  }
}

function closeProfile() {
  profileModal.classList.remove("open");
  if (loginMessage) loginMessage.textContent = "";
  if (registerMessage) registerMessage.textContent = "";
  if (nickMessage) nickMessage.textContent = "";
}

function fillProfile() {
  const p = getPlayer();
  if (loggedEmail) loggedEmail.textContent = getEmail() || "—";
  if (nickInput) {
    nickInput.value = p?.nick || "";
    nickInput.disabled = !!p?.nickChanged;
  }
  if (saveNickButton) {
    saveNickButton.textContent = p?.nickChanged ? "NICK TRAVADO" : "SALVAR NICK";
    saveNickButton.disabled = !!p?.nickChanged;
  }
}

profileButton?.addEventListener("click", openProfile);
closeProfileButton?.addEventListener("click", closeProfile);
profileModal?.addEventListener("click", (e) => {
  if (e.target === profileModal) closeProfile();
});
showLoginButton?.addEventListener("click", () => setView(loginView));
showRegisterButton?.addEventListener("click", () => setView(registerView));
backFromLoginButton?.addEventListener("click", () => setView(profileHomeView));
backFromRegisterButton?.addEventListener("click", () => setView(profileHomeView));

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "";
  try {
    await loginUser(document.getElementById("loginEmail").value.trim(), document.getElementById("loginPassword").value);
    showToast("Login feito! Bem-vindo de volta 👋", "success");
    loginForm.reset();
    setView(loggedProfileView);
    fillProfile();
  } catch (err) {
    loginMessage.textContent = cleanMsg(err.message);
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerMessage.textContent = "";
  const pass = document.getElementById("registerPassword").value;
  if (pass.length < 6) {
    registerMessage.textContent = "A senha precisa ter no mínimo 6 caracteres";
    return;
  }
  try {
    await registerUser(document.getElementById("registerEmail").value.trim(), pass);
    showToast("Conta criada! 🎉", "success");
    registerForm.reset();
    setView(loggedProfileView);
    fillProfile();
  } catch (err) {
    registerMessage.textContent = cleanMsg(err.message);
  }
});

saveNickButton?.addEventListener("click", async () => {
  if (!nickInput) return;
  nickMessage.textContent = "";
  try {
    await changeNick(nickInput.value);
    showToast("Nick atualizado! 🔒", "success");
    fillProfile();
  } catch (err) {
    nickMessage.textContent = cleanMsg(err.message);
  }
});

logoutButton?.addEventListener("click", async () => {
  try {
    await logoutUser();
    showToast("Sessão encerrada", "success");
    setView(profileHomeView);
  } catch (err) {
    showToast(cleanMsg(err.message), "error");
  }
});

// ---- Cards de mix ----
function renderSkeletonCard() {
  return `
    <article class="mix-card skeleton">
      <header class="mix-card-header">
        <div class="mix-day-name skeleton-line"></div>
        <div class="mix-date skeleton-line"></div>
      </header>
      <div class="mix-type-badge skeleton-line"></div>
      <section class="slots-section">
        <div class="slots-label skeleton-line"></div>
        <div class="slots-grid skeleton-grid"></div>
      </section>
      <div class="mix-counter skeleton-line"></div>
    </article>`;
}

function typeInfo(type) {
  if (type === "online") return { cls: "online", label: "ONLINE", icon: "🌐" };
  if (type === "presencial") return { cls: "presencial", label: "LAN", icon: "🏠" };
  return { cls: "none", label: "DEFINIR", icon: "❔" };
}

function renderCard(day) {
  const mix = getMix(day.key);
  const count = countSlots(day.key);
  const completeCount = countComplete(day.key);
  const status = getStatus(count);
  const me = getPlayer()?.nick || null;
  const t = typeInfo(mix.type);

  let slotsHtml = "";
  for (let i = 1; i <= 10; i++) {
    const nick = mix.slots?.[i] || "";
    const isMe = !!nick && nick === me;
    slotsHtml += `<div class="slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}" data-date="${day.key}" data-slot="${i}" title="${nick ? escapeHtml(nick) : "Slot " + i}">${nick ? escapeHtml(nick) : i}</div>`;
  }

  let completeHtml = "";
  for (let i = 1; i <= 5; i++) {
    const nick = mix.complete?.[i] || "";
    const isMe = !!nick && nick === me;
    completeHtml += `<div class="complete-slot ${nick ? "filled" : ""} ${isMe ? "is-me" : ""}" data-date="${day.key}" data-complete="${i}" title="${nick ? escapeHtml(nick) : "Complete " + i}">${nick ? escapeHtml(nick) : i}</div>`;
  }

  return `
    <article class="mix-card status-${status.id}" data-date="${day.key}">
      <header class="mix-card-header">
        <div class="mix-day-name">${escapeHtml(day.dayName)}</div>
        <div class="mix-date">${escapeHtml(day.dateBR)}${day.isToday ? " • HOJE" : ""}</div>
      </header>
      <button class="mix-type-badge ${t.cls}" data-action="set-type" data-date="${day.key}" type="button">${t.icon} ${t.label}</button>
      <section class="slots-section">
        <div class="slots-label">SLOTS (${count}/10)</div>
        <div class="slots-grid">${slotsHtml}</div>
      </section>
      <section class="complete-section">
        <div class="complete-label">COMPLETE <span>(${completeCount}/5)</span></div>
        <div class="complete-grid">${completeHtml}</div>
      </section>
      <div class="mix-actions-row">
        <button class="btn-copy" data-action="copy" data-date="${day.key}" type="button">📋 Copiar</button>
        <div class="mix-counter status-${status.id}">${count}/10 — ${status.label}</div>
      </div>
    </article>`;
}

function render() {
  if (!grid || !currentMode) return;
  const days = getNext10Days();

  if (!isAuthReady()) {
    grid.innerHTML = days.map(renderSkeletonCard).join("");
    return;
  }

  const visible = days.filter((day) => {
    const type = getMix(day.key).type;
    return type === currentMode || !type || type === "none";
  });

  const list = visible.length ? visible : days;
  grid.innerHTML = list.map(renderCard).join("");
  if (mixesSubtitle) mixesSubtitle.textContent = `${list.length} mixes`;
}

subscribe(() => render());

// ---- Interações nos cards ----
grid?.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-slot], [data-complete], [data-action]");
  if (!target) return;

  const date = target.dataset.date;
  const player = getPlayer();

  if (target.dataset.action === "copy") {
    const mix = getMix(date);
    const nicks = Object.values(mix.slots || {}).filter(Boolean);
    try {
      await navigator.clipboard.writeText(nicks.join("\n"));
      showToast("Lista copiada!", "success");
    } catch { showToast("Não deu pra copiar", "error"); }
    return;
  }

  if (!isLoggedIn() || !player?.nick) {
    showToast("Faça login primeiro", "error");
    openProfile();
    return;
  }

  try {
    if (target.dataset.action === "set-type") {
      await setMixType(date, currentMode);
      showToast(`Mix definido como ${currentMode === "presencial" ? "LAN" : "ONLINE"}!`, "success");
      return;
    }

    if (target.dataset.slot) {
      const slot = Number(target.dataset.slot);
      const nick = getMix(date).slots?.[slot];
      if (nick === player.nick) {
        await leaveSlot(date, slot, player.nick);
        showToast("Saiu do slot", "success");
      } else if (nick) {
        showToast("Esse slot já tá ocupado", "error");
      } else {
        await joinSlot(date, slot, player.nick);
        showToast(`Slot ${slot} reservado!`, "success");
      }
      return;
    }

    if (target.dataset.complete) {
      const slot = Number(target.dataset.complete);
      const nick = getMix(date).complete?.[slot];
      if (nick === player.nick) {
        await leaveComplete(date, slot, player.nick);
        showToast("Saiu do complete", "success");
      } else if (nick) {
        showToast("Esse complete já tá ocupado", "error");
      } else {
        await joinComplete(date, slot, player.nick);
        showToast("Entrou no complete!", "success");
      }
    }
  } catch (err) {
    showToast(cleanMsg(err.message), "error");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && profileModal?.classList.contains("open")) closeProfile();
});

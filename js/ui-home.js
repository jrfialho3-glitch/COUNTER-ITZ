// js/ui-home.js
// Render da home: 7 cards de dia, modal de criar lista, entrar/sair, cores.

import {
  onAllListsChange,
  createList,
  joinList,
  leaveList,
  deleteList,
} from "./db.js";
import {
  dayInfoForOffset,
  todayKey,
  getStatus,
  countPlayers,
  countWaitlist,
  isCreator,
  isInList,
  isInWaitlist,
  sanitizeNick,
} from "./utils.js";
import { getNick } from "./identity.js";

// ---- Estado em memória: todas as listas por dateKey ----
let allLists = {}; // { dateKey: { listId: list } }

// ---- Dias visíveis na home: hoje + 6 próximos ----
function visibleDays() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    out.push(dayInfoForOffset(i));
  }
  return out;
}

// ---- Helpers de cor do card do dia ----
function dayAccentClass(listsOfDay) {
  if (!listsOfDay) return "";
  const arr = Object.values(listsOfDay);
  if (!arr.length) return "";
  const hasRed = arr.some((l) => countPlayers(l) >= 10);
  if (hasRed) return "has-list-red";
  const hasYellow = arr.some((l) => countPlayers(l) >= 5);
  if (hasYellow) return "has-list-yellow";
  return "has-list-green";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---- Render do card do dia ----
function renderDayCard(day) {
  const isToday = day.key === todayKey();
  const listsOfDay = allLists[day.key] || {};
  const accent = dayAccentClass(listsOfDay);
  const dayClass = `day-card ${isToday ? "today" : ""} ${accent}`.trim();

  return `
    <article class="${dayClass}" data-day="${day.key}">
      <header class="day-card-header">
        <div>
          <h2 class="day-card-title">${escapeHtml(day.short)}</h2>
          <span class="day-card-date">${escapeHtml(day.long)}</span>
        </div>
        ${isToday ? '<span class="day-card-badge is-today"><span class="dot"></span> Hoje</span>' : ""}
      </header>
      <div class="day-lists">
        ${renderDayLists(day.key, listsOfDay)}
      </div>
      <button class="btn-new-list" data-action="create" data-day="${day.key}" data-day-name="${escapeHtml(day.long)}">+ Nova lista</button>
    </article>
  `;
}

function renderDayLists(dateKey, listsOfDay) {
  const entries = Object.entries(listsOfDay);
  if (!entries.length) {
    return `<div class="day-empty">Nenhuma lista ainda</div>`;
  }
  // Ordena por horário.
  entries.sort((a, b) => (a[1].time || "").localeCompare(b[1].time || ""));
  return entries.map(([listId, list]) => renderListItem(dateKey, listId, list)).join("");
}

function renderListItem(dateKey, listId, list) {
  const nick = getNick() || "";
  const playersCount = countPlayers(list);
  const status = getStatus(playersCount);
  const waitCount = countWaitlist(list);
  const slots = renderSlots(list, nick);
  const waitlist = renderWaitlist(list, nick, waitCount);
  const meInPlayers = isInList(list, nick);
  const meInWait = isInWaitlist(list, nick);
  const iAmCreator = isCreator(list, nick);
  const full = playersCount >= 10 && waitCount >= 5;
  const typeLabel = list.type === "online" ? "Online" : "Presencial";
  const typeIcon = list.type === "online" ? "🌐" : "📍";

  return `
    <div class="list-item status-${status.id}" data-list="${listId}">
      <header class="list-item-header">
        <span class="list-time">${escapeHtml(list.time || "—")}</span>
        <span class="list-counter status-${status.id}">${playersCount}/10</span>
      </header>
      <div class="list-type ${escapeHtml(list.type)}">${typeIcon} ${escapeHtml(typeLabel)}</div>
      <div class="slots status-${status.id}">${slots}</div>
      ${waitlist}
      <div class="list-creator">criado por <strong>${escapeHtml(list.creator)}</strong></div>
      <div class="list-actions">
        ${meInPlayers || meInWait
          ? `<button class="btn-leave" data-action="leave" data-day="${dateKey}" data-list="${listId}">Sair</button>`
          : full
            ? `<span class="toast-message">Lista cheia</span>`
            : `<button class="btn-join" data-action="join" data-day="${dateKey}" data-list="${listId}">Entrar</button>`
        }
        ${iAmCreator ? `<button class="btn-delete" data-action="delete" data-day="${dateKey}" data-list="${listId}" title="Apagar lista">🗑</button>` : ""}
      </div>
    </div>
  `;
}

function renderSlots(list, nick) {
  const players = list.players || {};
  const order = Object.keys(players).sort(
    (a, b) => (players[a].joinedAt || 0) - (players[b].joinedAt || 0)
  );
  // Garante ordem do criador primeiro, depois por joinedAt.
  const creator = list.creator;
  const ordered = [
    ...(creator && order.includes(creator) ? [creator] : []),
    ...order.filter((n) => n !== creator),
  ];
  // Preenche até 10.
  const slots = [];
  for (let i = 0; i < 10; i++) {
    const n = ordered[i];
    if (n) {
      const isMe = n === nick;
      const isCreatorSlot = n === creator;
      slots.push(
        `<div class="slot filled ${isMe ? "is-me" : ""} ${isCreatorSlot ? "creator" : ""}" title="${escapeHtml(n)}${isCreatorSlot ? " (criador)" : ""}">${escapeHtml(n)}</div>`
      );
    } else {
      slots.push(`<div class="slot" title="Vaga livre">${i + 1}</div>`);
    }
  }
  return slots.join("");
}

function renderWaitlist(list, nick, waitCount) {
  if (!waitCount) return "";
  const items = Object.keys(list.waitlist || {}).sort(
    (a, b) => (list.waitlist[a].joinedAt || 0) - (list.waitlist[b].joinedAt || 0)
  );
  const tags = items
    .map((n) => `<span class="waitlist-tag ${n === nick ? "is-me" : ""}">${escapeHtml(n)}</span>`)
    .join("");
  return `
    <div class="waitlist">
      <span class="waitlist-label">Reservas (${waitCount}/5)</span>
      ${tags}
    </div>
  `;
}

// ---- Render geral ----
function render() {
  const grid = document.getElementById("days-grid");
  if (!grid) return;
  const days = visibleDays();
  grid.innerHTML = days.map(renderDayCard).join("");
}

// ---- Subscribe no DB ----
onAllListsChange((snap) => {
  allLists = snap || {};
  render();
});

// ---- Modal de criar lista ----
function setupCreateModal() {
  const modal = document.getElementById("modal-create");
  const form = document.getElementById("form-create");
  const timeInput = document.getElementById("input-time");
  const dayLabel = document.getElementById("modal-create-day");
  const cancelBtns = modal.querySelectorAll("[data-close]");

  let pendingDayKey = null;
  let pendingDayName = null;

  cancelBtns.forEach((b) => b.addEventListener("click", () => modal.close()));

  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="create"]');
    if (!btn) return;
    const nick = getNick();
    if (!nick) {
      toast("Define um nick antes de criar uma lista.", "error");
      return;
    }
    pendingDayKey = btn.dataset.day;
    pendingDayName = btn.dataset.dayName;
    dayLabel.textContent = pendingDayName;
    // Default: próximo horário redondo mais próximo.
    timeInput.value = suggestedTime();
    modal.showModal();
    setTimeout(() => timeInput.focus(), 50);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pendingDayKey) return;
    const fd = new FormData(form);
    const type = fd.get("type");
    const time = timeInput.value;
    const nick = getNick();
    if (!nick) {
      toast("Define um nick antes.", "error");
      return;
    }
    try {
      await createList(pendingDayKey, { type, time, creator: nick });
      modal.close();
      toast("Lista criada!", "success");
    } catch (err) {
      toast(err.message || "Erro ao criar lista", "error");
    }
  });
}

function suggestedTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---- Ações: entrar / sair / apagar ----
function setupListActions() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "create") return; // tratado em setupCreateModal
    const dateKey = btn.dataset.day;
    const listId = btn.dataset.list;
    const nick = getNick();
    if (!nick) {
      toast("Define um nick antes.", "error");
      return;
    }
    btn.disabled = true;
    try {
      if (action === "join") {
        const r = await joinList(dateKey, listId, nick);
        if (r.wentTo === "waitlist") toast("Você entrou na reserva.", "success");
        else if (r.wentTo === "players") toast("Confirmado!", "success");
        else toast("Você já está nessa lista.", "success");
      } else if (action === "leave") {
        await leaveList(dateKey, listId, nick);
        toast("Você saiu da lista.", "success");
      } else if (action === "delete") {
        if (!confirm("Apagar essa lista? Essa ação não tem volta.")) return;
        await deleteList(dateKey, listId, nick);
        toast("Lista apagada.", "success");
      }
    } catch (err) {
      toast(err.message || "Erro", "error");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---- Toast ----
function toast(msg, kind = "") {
  const area = document.getElementById("toast-area");
  if (!area) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .2s, transform .2s";
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";
    setTimeout(() => el.remove(), 220);
  }, 2400);
}

// ---- Boot ----
function boot() {
  render();
  setupCreateModal();
  setupListActions();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

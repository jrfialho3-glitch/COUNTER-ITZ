// js/ui-ranking.js
// Página de ranking com níveis e cores degradadas - Firebase real-time

import {
  getAllPlayers,
  setPlayerLevel,
  isAdminLoggedIn,
  getLevelColor,
  formatLevel,
  isBanned,
  banNick,
  unbanNick,
  subscribe
} from "./identity.js";
import { escapeHtml } from "./utils.js";

// Referências DOM
const rankingContent = document.getElementById("ranking-content");
const toastArea = document.getElementById("toast-area");

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

function render() {
  if (!rankingContent) return;

  const players = getAllPlayers();

  if (players.length === 0) {
    rankingContent.innerHTML = `
      <div class="ranking-empty">
        <p>Nenhum player registrado ainda.</p>
        <p style="color: var(--text-faint); font-size: 0.85rem; margin-top: 12px;">
          Players aparecem aqui quando fazem login no site.
        </p>
      </div>
    `;
    return;
  }

  const isAdmin = isAdminLoggedIn();

  rankingContent.innerHTML = `
    <div class="ranking-grid">
      ${players.map((p) => renderPlayerCard(p, isAdmin)).join("")}
    </div>
  `;

  // Se não é admin, mostra aviso
  if (!isAdmin) {
    const warning = document.createElement("div");
    warning.className = "admin-warning";
    warning.innerHTML = `
      <p>🔐 Área do Admin</p>
      <p style="font-size: 0.85rem; margin-top: 8px;">
        Faça login na página principal clicando em "Admin" para gerenciar níveis.
      </p>
    `;
    rankingContent.insertBefore(warning, rankingContent.firstChild);
  }
}

function renderPlayerCard(player, isAdmin) {
  const color = getLevelColor(player.level);
  const banned = player.banned;

  return `
    <div class="player-card" data-nick="${escapeHtml(player.nick)}" style="--player-color: ${color};">
      <div class="player-nick">${escapeHtml(player.nick)}</div>
      <div class="player-level" style="color: ${color};">
        ${banned ? "BANIDO" : formatLevel(player.level)}
      </div>
      ${isAdmin ? renderAdminControls(player) : ""}
    </div>
  `;
}

function renderAdminControls(player) {
  return `
    <div class="player-admin-controls">
      <input type="number" class="level-input" placeholder="Level (1-30k)"
             min="1000" max="30000" step="1000" value="${player.level}"
             data-nick="${escapeHtml(player.nick)}">
      <button class="btn-set-level" data-nick="${escapeHtml(player.nick)}">Salvar</button>
      ${player.banned
        ? `<button class="btn-unban-player" data-nick="${escapeHtml(player.nick)}">Desbanir</button>`
        : `<button class="btn-ban-player" data-nick="${escapeHtml(player.nick)}">Banir</button>`
      }
    </div>
  `;
}

function setupControls() {
  document.addEventListener("click", async (e) => {
    const setLevelBtn = e.target.closest(".btn-set-level");
    const banBtn = e.target.closest(".btn-ban-player");
    const unbanBtn = e.target.closest(".btn-unban-player");

    if (setLevelBtn) {
      if (!isAdminLoggedIn()) {
        toast("Apenas admin pode alterar level", "error");
        return;
      }
      const nick = setLevelBtn.dataset.nick;
      const input = document.querySelector(`.level-input[data-nick="${nick}"]`);
      const level = parseInt(input?.value, 10);

      if (!level || level < 1000 || level > 30000) {
        toast("Level deve ser entre 1.000 e 30.000", "error");
        return;
      }

      try {
        await setPlayerLevel(nick, level);
        toast(`Level de ${nick} atualizado para ${formatLevel(level)}!`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
    }

    if (banBtn) {
      if (!isAdminLoggedIn()) {
        toast("Apenas admin pode banir", "error");
        return;
      }
      const nick = banBtn.dataset.nick;
      try {
        await banNick(nick);
        toast(`${nick} foi banido!`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
    }

    if (unbanBtn) {
      if (!isAdminLoggedIn()) {
        toast("Apenas admin pode desbanir", "error");
        return;
      }
      const nick = unbanBtn.dataset.nick;
      try {
        await unbanNick(nick);
        toast(`${nick} foi desbanido!`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
    }
  });
}

function boot() {
  render();
  setupControls();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
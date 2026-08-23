// js/ui-ranking.js
// Página de ranking - Firebase real-time

import {
  getAllPlayers, setPlayerLevel, isAdminLoggedIn,
  getLevelColor, formatLevel, banNick, unbanNick, subscribe, auth, loginUser, logoutUser
} from "./identity.js";
import { escapeHtml } from "./utils.js";

const rankingContent = document.getElementById("ranking-content");
const toastArea = document.getElementById("toast-area");

subscribe(() => render());

function toast(msg, kind = "") {
  if (!toastArea) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toastArea.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 2200);
}

function render() {
  if (!rankingContent) return;
  const players = getAllPlayers();

  if (players.length === 0) {
    rankingContent.innerHTML = `<div class="ranking-empty"><p>Nenhum player ainda.</p></div>`;
    return;
  }

  const isAdmin = isAdminLoggedIn();
  rankingContent.innerHTML = `<div class="ranking-grid">${players.map((p) => renderPlayerCard(p, isAdmin)).join("")}</div>`;

  if (!isAdmin) {
    const w = document.createElement("div");
    w.className = "admin-warning";
    w.innerHTML = `<p>🔐 Área do Admin</p><p style="font-size: 0.85rem; margin-top: 8px;">Faça login na página principal com a conta admin para gerenciar.</p>`;
    rankingContent.insertBefore(w, rankingContent.firstChild);
  }
}

function renderPlayerCard(player, isAdmin) {
  const color = getLevelColor(player.level);
  return `
    <div class="player-card" data-nick="${escapeHtml(player.nick)}" style="--player-color: ${color};">
      <div class="player-nick">${escapeHtml(player.nick)}</div>
      <div class="player-level" style="color: ${color};">${player.banned ? "BANIDO" : formatLevel(player.level)}</div>
      ${isAdmin ? `
      <div class="player-admin-controls">
        <input type="number" class="level-input" min="1000" max="30000" step="1000" value="${player.level}" data-nick="${escapeHtml(player.nick)}">
        <button class="btn-set-level" data-nick="${escapeHtml(player.nick)}">Salvar</button>
        ${player.banned ? `<button class="btn-unban-player" data-nick="${escapeHtml(player.nick)}">Desbanir</button>` : `<button class="btn-ban-player" data-nick="${escapeHtml(player.nick)}">Banir</button>`}
      </div>` : ""}
    </div>`;
}

function setupControls() {
  document.addEventListener("click", async (e) => {
    const setLevelBtn = e.target.closest(".btn-set-level");
    const banBtn = e.target.closest(".btn-ban-player");
    const unbanBtn = e.target.closest(".btn-unban-player");

    if (setLevelBtn) {
      if (!isAdminLoggedIn()) return toast("Apenas admin", "error");
      const nick = setLevelBtn.dataset.nick;
      const input = document.querySelector(`.level-input[data-nick="${nick}"]`);
      const level = parseInt(input?.value, 10);
      if (!level || level < 1000 || level > 30000) return toast("Level inválido", "error");
      try { await setPlayerLevel(nick, level); toast(`Level de ${nick} → ${formatLevel(level)}!`, "success"); }
      catch (err) { toast(err.message, "error"); }
    }

    if (banBtn) {
      if (!isAdminLoggedIn()) return toast("Apenas admin", "error");
      try { await banNick(banBtn.dataset.nick); toast("Banido!", "success"); }
      catch (err) { toast(err.message, "error"); }
    }

    if (unbanBtn) {
      if (!isAdminLoggedIn()) return toast("Apenas admin", "error");
      try { await unbanNick(unbanBtn.dataset.nick); toast("Desbanido!", "success"); }
      catch (err) { toast(err.message, "error"); }
    }
  });
}

function boot() { render(); setupControls(); setTimeout(render, 300); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
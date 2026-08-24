// js/ui-ranking.js
// Página de ranking — apenas leitura dos players do RTDB.

import { getAllPlayers, getLevelColor, formatLevel, subscribe } from "./identity.js";
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
    rankingContent.innerHTML = `<div class="ranking-empty"><p>Nenhum player ainda.</p><p style="font-size:.85rem;color:var(--text-faint);">Cria uma conta na página inicial pra aparecer aqui!</p></div>`;
    return;
  }

  rankingContent.innerHTML = `<div class="ranking-grid">${players.map(renderPlayerCard).join("")}</div>`;
}

function renderPlayerCard(player) {
  const color = getLevelColor(player.level);
  const colorName = color;
  return `
    <div class="player-card" data-uid="${escapeHtml(player.uid)}" style="--player-color: ${color};">
      <div class="player-nick">${escapeHtml(player.nick)}</div>
      <div class="player-level" style="color: ${colorName};">${player.banned ? "BANIDO" : escapeHtml(formatLevel(player.level))}</div>
    </div>`;
}

function boot() { render(); setTimeout(render, 400); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

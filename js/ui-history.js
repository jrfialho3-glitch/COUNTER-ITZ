// js/ui-history.js
// Página de histórico: lista as listas que fecharam (10/10),
// agrupadas por data, em ordem decrescente.

import { onAllHistoryChange } from "./db.js";
import { formatDateLong } from "./utils.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render() {
  const root = document.getElementById("history-content");
  if (!root) return;

  // Requisita o snapshot atual via subscribe + render imediato.
  // onValue é chamado também no load inicial, então isso já dispara o render.
  onAllHistoryChange((history) => {
    const days = Object.keys(history || {})
      .sort()
      .reverse();

    if (!days.length) {
      root.innerHTML = `<div class="history-empty">Nenhuma lista fechada ainda. Bora montar uma?</div>`;
      return;
    }

    const html = days
      .map((dayKey) => {
        const listsOfDay = history[dayKey] || {};
        const entries = Object.values(listsOfDay);
        if (!entries.length) return "";
        // Ordena listas do dia por horário.
        entries.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        return `
          <section class="history-day">
            <h3>${escapeHtml(formatDateLong(dayKey))}</h3>
            ${entries.map(renderHistoryList).join("")}
          </section>
        `;
      })
      .join("");

    root.innerHTML = html;
  });
}

function renderHistoryList(list) {
  const typeLabel = list.type === "online" ? "Online" : "Presencial";
  const typeIcon = list.type === "online" ? "🌐" : "📍";
  const players = Object.keys(list.players || {});
  const ordered = (() => {
    const creator = list.creator;
    const others = players.filter((n) => n !== creator);
    return [creator, ...others].filter(Boolean);
  })();

  return `
    <div class="history-list">
      <header class="list-item-header">
        <div>
          <span class="list-time">${escapeHtml(list.time || "—")}</span>
          <div class="list-type ${escapeHtml(list.type)}">${typeIcon} ${escapeHtml(typeLabel)}</div>
        </div>
        <span class="list-counter status-closed">${players.length}/10 🔥</span>
      </header>
      <div class="history-players">
        ${ordered.map((n) => `<span class="history-player">${escapeHtml(n)}</span>`).join("")}
      </div>
      <div class="list-creator">criado por <strong>${escapeHtml(list.creator)}</strong></div>
    </div>
  `;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}

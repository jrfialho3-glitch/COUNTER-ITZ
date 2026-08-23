// js/ui-admin.js
// Página admin — só renderiza conteúdo se o usuário logado for admin.

import {
  isLoggedIn, isAuthReady, isAdmin, getEmail,
  getAllPlayersDetailed, getBannedNicks,
  adminResetNick, adminSetLevel, adminSetNick,
  adminBanNick, adminUnbanNick, adminForceRollover,
  logoutUser, subscribe
} from "./identity.js";
import { escapeHtml, formatLevel, getLevelColor } from "./utils.js";

const lockedEl = document.getElementById("admin-locked");
const loadingEl = document.getElementById("admin-loading");
const contentEl = document.getElementById("admin-content");
const playersEl = document.getElementById("admin-players");
const playersCountEl = document.getElementById("players-count");
const searchEl = document.getElementById("admin-search");
const adminEmailEl = document.getElementById("admin-email");
const adminBannerEmailEl = document.getElementById("admin-banner-email");
const btnLogout = document.getElementById("btn-logout");
const btnRollover = document.getElementById("btn-force-rollover");
const toastArea = document.getElementById("toast-area");

let filterText = "";

subscribe(() => {
  updateGate();
  if (contentEl && !contentEl.hidden) renderPlayers();
});

function toast(msg, kind = "") {
  if (!toastArea) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toastArea.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 2400);
}

function updateGate() {
  if (!isAuthReady()) return;

  // Não logado → bloqueado
  if (!isLoggedIn()) {
    loadingEl.hidden = true;
    contentEl.hidden = true;
    lockedEl.hidden = false;
    lockedEl.innerHTML = `<strong>Faça login</strong> pra acessar o painel admin. <a href="index.html" style="color:var(--yellow);">← Voltar pra home</a>`;
    return;
  }

  // Logado mas não é admin → bloqueado
  if (!isAdmin()) {
    loadingEl.hidden = true;
    contentEl.hidden = true;
    lockedEl.hidden = false;
    lockedEl.innerHTML = `<strong>Acesso negado.</strong> Tua conta (<code>${escapeHtml(getEmail())}</code>) não tem permissão de admin.`;
    return;
  }

  // É admin → mostra
  loadingEl.hidden = true;
  lockedEl.hidden = true;
  contentEl.hidden = false;
  if (adminEmailEl) adminEmailEl.textContent = getEmail();
  if (adminBannerEmailEl) adminBannerEmailEl.textContent = `Logado como ${getEmail()}`;
}

function renderPlayers() {
  if (!playersEl) return;
  const all = getAllPlayersDetailed();
  const banned = new Set(getBannedNicks());

  const filtered = all.filter((p) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return p.nick.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
  });

  if (playersCountEl) playersCountEl.textContent = String(filtered.length);

  if (filtered.length === 0) {
    playersEl.innerHTML = `<div class="admin-empty">Nenhum player encontrado.</div>`;
    return;
  }

  playersEl.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Nick</th>
          <th>Email</th>
          <th>Level</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(renderPlayerRow).join("")}
      </tbody>
    </table>
  `;

  bindRowEvents();
}

function renderPlayerRow(p) {
  const color = getLevelColor(p.level);
  const statusBits = [];
  if (p.banned) statusBits.push(`<span style="color:var(--red);font-weight:700;">BANIDO</span>`);
  if (p.nickChanged) statusBits.push(`<span style="color:var(--text-faint);font-size:.74rem;">nick travado</span>`);
  const status = statusBits.join(" · ") || `<span style="color:var(--text-faint);">—</span>`;

  return `
    <tr class="${p.banned ? "banned-row" : ""}" data-uid="${escapeHtml(p.uid)}">
      <td><strong style="color:${color};">${escapeHtml(p.nick)}</strong></td>
      <td style="color:var(--text-dim);font-size:.82rem;">${escapeHtml(p.email || "—")}</td>
      <td>
        <input type="number" class="input level-input" min="1000" max="30000" step="1000" value="${p.level}" data-action="set-level" />
        <span style="color:${color};font-weight:700;font-size:.82rem;margin-left:4px;">${escapeHtml(formatLevel(p.level))}</span>
      </td>
      <td style="font-size:.78rem;">${status}</td>
      <td>
        <div class="admin-actions">
          <button class="btn-mini-primary" data-action="edit-nick" type="button">Trocar nick</button>
          <button class="btn-mini-success" data-action="reset-nick" type="button" ${p.nickChanged ? "" : "disabled"}>Resetar lock</button>
          ${p.banned
            ? `<button class="btn-mini-success" data-action="unban" type="button">Desbanir</button>`
            : `<button class="btn-mini-danger" data-action="ban" type="button">Banir</button>`
          }
        </div>
      </td>
    </tr>
  `;
}

function bindRowEvents() {
  // Mudar level
  playersEl.querySelectorAll('input[data-action="set-level"]').forEach((inp) => {
    inp.addEventListener("change", async () => {
      const tr = inp.closest("tr");
      const uid = tr?.dataset.uid;
      const v = parseInt(inp.value, 10);
      try {
        await adminSetLevel(uid, v);
        toast("Level atualizado", "success");
      } catch (e) {
        toast(e.message, "error");
        inp.value = "";
      }
    });
  });

  // Botões
  playersEl.querySelectorAll("button[data-action]").forEach((btn) => {
    const action = btn.dataset.action;
    btn.addEventListener("click", async () => {
      const tr = btn.closest("tr");
      const uid = tr?.dataset.uid;
      const nick = tr?.querySelector("td strong")?.textContent || "";

      try {
        if (action === "ban") {
          if (!confirm(`Banir o nick "${nick}"? Ele não vai conseguir entrar em slots.`)) return;
          await adminBanNick(nick);
          toast(`${nick} banido`, "success");
        } else if (action === "unban") {
          await adminUnbanNick(nick);
          toast(`${nick} desbanido`, "success");
        } else if (action === "reset-nick") {
          if (!confirm(`Liberar troca de nick pra "${nick}"?`)) return;
          await adminResetNick(uid);
          toast("Lock de nick removido", "success");
        } else if (action === "edit-nick") {
          const novo = prompt(`Novo nick pra "${nick}":`, nick);
          if (!novo) return;
          await adminSetNick(uid, novo);
          toast(`Nick trocado pra ${novo}`, "success");
        }
      } catch (e) {
        toast(e.message, "error");
      }
    });
  });
}

// ---- Eventos globais ----
function setupEvents() {
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      filterText = searchEl.value.trim();
      renderPlayers();
    });
  }

  if (btnRollover) {
    btnRollover.addEventListener("click", async () => {
      if (!confirm("Forçar virada de dia agora? Listas fechadas vão pro histórico, incompletas são apagadas.")) return;
      try {
        await adminForceRollover();
        toast("Rollover feito!", "success");
      } catch (e) {
        toast(e.message, "error");
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (!confirm("Sair da conta admin?")) return;
      try { await logoutUser(); }
      catch (e) { toast(e.message, "error"); }
    });
  }
}

function boot() {
  setupEvents();
  updateGate();
  // Re-check após auth inicializar
  setTimeout(updateGate, 500);
  setTimeout(updateGate, 1500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

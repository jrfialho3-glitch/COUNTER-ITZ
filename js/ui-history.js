// js/ui-history.js
// Página de histórico — mostra mixes passados.

import { escapeHtml } from "./utils.js";

// Por enquanto, mostra mensagem de que histórico será implementado com Firebase.
// Os dados atuais são locais (localStorage), então não persistem entre dispositivos.

function render() {
  const root = document.getElementById("history-content");
  if (!root) return;

  root.innerHTML = `
    <div class="history-empty">
      <p>📊 Histórico será implementado em breve.</p>
      <p style="color: var(--text-faint); font-size: 0.85rem; margin-top: 12px;">
        Por enquanto, os dados são salvos localmente no seu navegador.
        Para ver histórico entre dispositivos, precisaremos sincronizar com o Firebase.
      </p>
    </div>
  `;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}

// js/day-rollover.js
// Gerencia a virada do dia: listas fechadas (10/10) vão pro histórico,
// as incompletas são deletadas. Idempotente via meta/lastRollover.

import { runDayRolloverIfNeeded } from "./db.js";

async function initRollover() {
  try {
    const r = await runDayRolloverIfNeeded();
    if (!r.skipped) {
      console.log(`[Rollover] Dia virado! Processados ${r.processed} dias.`);
    }
  } catch (err) {
    console.error("[Rollover] Erro na virada de dia:", err);
  }
}

// Executa no load da página.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRollover);
} else {
  initRollover();
}

// Opcional: checa a cada 5 minutos para quem deixa o site aberto.
setInterval(initRollover, 5 * 60 * 1000);

// js/firebase-config.js
// Inicializa o Firebase Realtime Database via CDN (sem Auth - usa sistema próprio de nick/senha)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAziFdP1iU_1Dw_etjM40YX91x4HFHFRaU",
  authDomain: "counter-itz-5a08b.firebaseapp.com",
  databaseURL: "https://counter-itz-5a08b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "counter-itz-5a08b",
  storageBucket: "counter-itz-5a08b.firebasestorage.app",
  messagingSenderId: "848663837161",
  appId: "1:848663837161:web:5003ec4eab7bf5d02d3378"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ============================================
// FIREBASE REALTIME DATABASE SECURITY RULES
// ============================================
// Cole estas regras no Firebase Console → Realtime Database → Rules
// Publish para ativar. Permite leitura/escrita pública (admin validado no client-side).
/*
{
  "rules": {
    "mixes": { ".read": true, ".write": true },
    "players": { ".read": true, ".write": true },
    "banned": { ".read": true, ".write": true },
    "meta": { ".read": true, ".write": true }
  }
}
*/
// Admin: junin / manu123@ (validado no JavaScript antes de ações de admin)

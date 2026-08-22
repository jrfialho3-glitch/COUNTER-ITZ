// js/firebase-config.js
// Inicializa o Firebase Realtime Database usando o SDK via CDN.
// IMPORTANTE: substitua o objeto firebaseConfig abaixo pelo do seu projeto.
//
// Como pegar:
//  1. https://console.firebase.google.com/ → Add project (nome: Ominirout)
//  2. Realtime Database → Create Database → southamerica-east1 → modo Locked
//  3. Ícone Web (</>) → apelido "Ominirout Web" → Register app
//  4. Copie o firebaseConfig que aparecer e cole no lugar do placeholder abaixo.
//  5. Em Realtime Database → Rules, cole:
//     { "rules": { "lists": { ".read": true, ".write": true },
//                  "history": { ".read": true, ".write": true },
//                  "meta":   { ".read": true, ".write": true } } }

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

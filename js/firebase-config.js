// js/firebase-config.js
// Inicializa o Firebase (Auth + Realtime Database) via CDN.
//
// CONFIGURAÇÃO NECESSÁRIA NO FIREBASE CONSOLE:
// 1. Authentication → Sign-in method → Email/Password: ENABLE
// 2. Crie um usuário admin: juninn@counteritz.com / senha segura
// 3. Realtime Database → Rules: cole as regras abaixo (substitua o UID do admin)
// 4. Database URL region: southamerica-east1 (São Paulo)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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
export const auth = getAuth(app);

// ============================================
// FIREBASE REALTIME DATABASE SECURITY RULES
// ============================================
// Cole estas regras no Firebase Console → Realtime Database → Rules
// SUBSTITUA "ADMIN_UID_AQUI" pelo UID real do usuário admin (veja Authentication → Users)
/*
{
  "rules": {
    // Dados públicos de mixes - leitura para todos, escrita apenas para usuários autenticados
    "mixes": {
      ".read": true,
      ".write": "auth != null"
    },

    // Registry de players (nicks, senhas, levels) - leitura para todos, escrita apenas admin OU próprio player
    "players": {
      ".read": true,
      "$uid": {
        ".write": "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())"
      }
    },

    // Lista de nicks banidos - leitura para todos, escrita apenas admin
    "banned": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },

    // Lista de admins (UIDs) - apenas leitura para autenticados, escrita nunca (configure no console)
    "admins": {
      ".read": "auth != null",
      ".write": false
    },

    // Sessão de rollover - apenas admin
    "meta": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    }
  }
}
*/

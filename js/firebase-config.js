// js/firebase-config.js
// Inicializa o Firebase (Auth + Realtime Database)

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
// Firebase Console → Realtime Database → Rules → Publish
/*
{
  "rules": {
    "mixes": { ".read": true, ".write": "auth != null" },
    "players": {
      ".read": true,
      "$uid": { ".write": "auth != null && auth.uid === $uid" }
    },
    "banned": { ".read": true, ".write": "auth != null && root.child('admins').child(auth.uid).exists()" },
    "admins": { ".read": "auth != null", ".write": false },
    "meta": { ".read": true, ".write": "auth != null && root.child('admins').child(auth.uid).exists()" }
  }
}
*/
// Admin: posseydom@gmail.com / manu123@ (create in Firebase Auth → Users)
// After creating admin user, add their UID to /admins/{uid} = true in Database
// =====================================================================
//  IQ FOR U – Mock Test app · config.js
//  Paste your Firebase config below (Firebase console → ⚙️ Project settings
//  → Your apps → Web app → firebaseConfig). This is the ONLY place it goes.
// =====================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyC8vMEy1R0DY7Lq1RPEPm3ofgf8gcRMVrc",
  authDomain: "iqforu-mock.firebaseapp.com",
  projectId: "iqforu-mock",
  storageBucket: "iqforu-mock.firebasestorage.app",
  messagingSenderId: "154989364223",
  appId: "1:154989364223:web:ca0e5cef7e576314351dca"
};

// Site details shown on the home page
export const SITE = {
  name: "IQ FOR U",
  tagline: "Free weekly OSSSC / OSSC mock tests",
  instagram: "https://www.instagram.com/iq_for_u_01/",   // leave "" to hide
  autosaveMinutes: 5      // answers are saved to the server every 5 minutes + on submit
};

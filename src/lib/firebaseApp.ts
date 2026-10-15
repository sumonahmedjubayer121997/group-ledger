import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";

/**
 * Local testing only: `npm run emulators` plus `npm run dev:emulators` runs the app against the
 * Firebase emulators with a throwaway "demo-" project, so nothing touches the live data. Production
 * builds drop this branch.
 */
export const usingEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1";

// Just the app and sign-in. The landing page imports only this; Firestore and Storage load with the
// signed-in app (see ./firebase.ts), which keeps the first page small.
const firebaseConfig = {
  apiKey: "AIzaSyDkzFz-W2l7pbbxB8LmvyXjmxG6EVpra48",
  authDomain: "spiltwize.firebaseapp.com",
  projectId: usingEmulators ? "demo-splitwize" : "spiltwize",
  storageBucket: "spiltwize.firebasestorage.app",
  messagingSenderId: "610043393454",
  appId: "1:610043393454:web:42003676522e6f3945443f",
  measurementId: "G-XQ8QSKL2HX",
};

export const app = initializeApp(firebaseConfig);

// Same storage as getAuth(), but without the popup/redirect helper: that loads an iframe and Google's
// API script (~130 KB) on every page. Popups pass `popupResolver` instead, so it loads only when used.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});

if (usingEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

export const popupResolver = browserPopupRedirectResolver;

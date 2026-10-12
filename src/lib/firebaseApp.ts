import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";

// Just the app and sign-in. The landing page imports only this; Firestore and Storage load with the
// signed-in app (see ./firebase.ts), which keeps the first page small.
const firebaseConfig = {
  apiKey: "AIzaSyDkzFz-W2l7pbbxB8LmvyXjmxG6EVpra48",
  authDomain: "spiltwize.firebaseapp.com",
  projectId: "spiltwize",
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

export const popupResolver = browserPopupRedirectResolver;

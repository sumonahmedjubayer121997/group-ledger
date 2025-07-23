
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkzFz-W2l7pbbxB8LmvyXjmxG6EVpra48",
  authDomain: "spiltwize.firebaseapp.com",
  projectId: "spiltwize",
  storageBucket: "spiltwize.firebasestorage.app",
  messagingSenderId: "610043393454",
  appId: "1:610043393454:web:42003676522e6f3945443f",
  measurementId: "G-XQ8QSKL2HX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Add error handling and logging
auth.onAuthStateChanged((user) => {
  console.log('Firebase auth state changed:', user ? 'User logged in' : 'User logged out');
});

export default app;

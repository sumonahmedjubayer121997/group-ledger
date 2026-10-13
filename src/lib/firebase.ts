import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { app, auth, usingEmulators } from "./firebaseApp";

// Firestore and Storage, for the signed-in app. Sign-in alone lives in ./firebaseApp.
export { auth };

// Keeps what you last saw (groups, expenses, loans) on the device, so the app opens with it even
// offline, and changes made offline are sent when the connection is back. Works across open tabs.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const storage = getStorage(app);

if (usingEmulators) {
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

/** After signing out: remove that account's saved data from this device (think shared computers). */
export async function clearLocalData() {
  await terminate(db);
  await clearIndexedDbPersistence(db);
}

export default app;

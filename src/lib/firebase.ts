import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { app, auth } from "./firebaseApp";

// Firestore and Storage, for the signed-in app. Sign-in alone lives in ./firebaseApp.
export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";

// Read Firebase config from environment variable (EAS builds) or local file (development)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseConfig: any;
if (process.env.FIREBASE_CONFIG_JSON) {
  // EAS build: Parse JSON from environment variable
  firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON as string);
} else {
  // Local development: Read from local file
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  firebaseConfig = require("./firebase-config");
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

try {
  // Initialize only if not in a partial state or if forced by API key presence
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  // Note: getFunctions() without region parameter allows functions to be called
  // via /api/* rewrites in firebase.json, avoiding CORS issues
  functions = getFunctions(app);
} catch (e) {
  console.warn(
    "Firebase initialization limited. Some authenticated features may be restricted.",
    e,
  );
}

export { auth, db, functions };
export default app;

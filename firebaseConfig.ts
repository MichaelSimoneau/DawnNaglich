import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";

const firebaseConfig = require("./firebase-config.json");
// Exact Firebase configuration provided by the user for project "dawn-naglich"
// const firebaseConfig = {
//   apiKey: process.env.API_KEY || "API_KEY_GOES_HERE",
//   authDomain: "dawn-naglich.firebaseapp.com",
//   projectId: "dawn-naglich",
//   storageBucket: "dawn-naglich.firebasestorage.app",
//   messagingSenderId: "333181114084",
//   appId: "1:333181114084:web:7c59a39467396335173ef1"
// };

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

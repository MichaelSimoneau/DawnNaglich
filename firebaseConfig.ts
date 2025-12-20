import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

// Exact Firebase configuration provided by the user for project "dawn-naglich"
const firebaseConfig = {
  apiKey: process.env.API_KEY || "API_KEY_GOES_HERE",
  authDomain: "dawn-naglich.firebaseapp.com",
  projectId: "dawn-naglich",
  storageBucket: "dawn-naglich.firebasestorage.app",
  messagingSenderId: "333181114084",
  appId: "1:333181114084:web:7c59a39467396335173ef1"
};

// Determine if we are in demo mode based on the environment and placeholders
export const isDemo = !process.env.API_KEY || firebaseConfig.apiKey.includes("GOES_HERE");

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

try {
  // Initialize only if not in a partial state or if forced by API key presence
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
} catch (e) {
  console.warn("Firebase initialization limited. Some authenticated features may be restricted.", e);
}

export { auth, db, functions };
export default app;
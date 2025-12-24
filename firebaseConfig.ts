import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  Auth,
  // @ts-expect-error - getReactNativePersistence exists at runtime but not in TypeScript definitions for Firebase v10
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { Platform } from "react-native";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Read Firebase config from environment variable (EAS builds) or local file (development)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseConfig: any;
if (process.env.FIREBASE_CONFIG_JSON) {
  // EAS build: Parse JSON from environment variable
  firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON as string);
} else {
  // Local development fallback
  firebaseConfig = {
    "version": "2",
    "projectNumber": "333181114084",
    "projectId": "dawn-naglich",
    "appId": "1:333181114084:web:7c59a39467396335173ef1",
    "realtimeDatabaseInstanceUri": "",
    "realtimeDatabaseUrl": "",
    "storageBucket": "dawn-naglich.firebasestorage.app",
    "locationId": "",
    "apiKey": "AIzaSyA-E7-GJ2sz2c0GMd8ifq6eYLNLn8kJ3qk",
    "authDomain": "dawn-naglich.firebaseapp.com",
    "messagingSenderId": "333181114084",
    "measurementId": ""
  };
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

// Initialize App
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
} catch (e) {
  console.warn("Firebase App initialization failed:", e);
}

// Initialize Auth
if (app) {
  try {
    if (Platform.OS === "web") {
      auth = getAuth(app);
    } else {
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          // @ts-expect-error - code exists
          error.code === "auth/already-initialized"
        ) {
          auth = getAuth(app);
        } else {
          throw error;
        }
      }
    }
  } catch (e) {
    console.warn("Firebase Auth initialization failed:", e);
  }

  // Initialize Firestore
  try {
    db = getFirestore(app);
  } catch (e) {
    console.warn("Firebase Firestore initialization failed:", e);
  }

  // Initialize Functions
  try {
    functions = getFunctions(app, "us-central1");
    
    // Connect to emulator if on localhost
    if (Platform.OS === "web" && typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        // console.log("Connecting to Functions Emulator on localhost:5001");
        connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      }
    }
  } catch (e) {
    console.warn("Firebase Functions initialization failed:", e);
  }
}

export { auth, db, functions };
export default app;

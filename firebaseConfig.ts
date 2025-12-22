import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  Auth,
  // @ts-expect-error - getReactNativePersistence exists at runtime but not in TypeScript definitions for Firebase v10
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { Platform } from "react-native";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Read Firebase config from environment variable (EAS builds) or local file (development)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseConfig: any;
if (process.env.FIREBASE_CONFIG_JSON) {
  // EAS build: Parse JSON from environment variable
  firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON as string);
} else {
  // Local development: set FIREBASE_CONFIG_JSON 
  // to the contents of firebase-config.json
  // via the `source ./.zshrc` command
  // throw new Error(`
  //   Firebase config not found:
  //   - EAS build: set FIREBASE_CONFIG_JSON to the contents of firebase-config.json
  //   - Local development: set FIREBASE_CONFIG_JSON to the contents of firebase-config.json
  //   - hint: \`source ./.zshrc\` to load the environment variable in your terminal
  // `);
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

try {
  // Initialize only if not in a partial state or if forced by API key presence
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  
  // Initialize Auth with AsyncStorage persistence for React Native
  // Use getAuth for web, initializeAuth for native platforms
  if (Platform.OS === "web") {
    auth = getAuth(app);
  } else {
    try {
      // Try to initialize with AsyncStorage persistence for native platforms
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (error) {
      // If auth is already initialized, get the existing instance
      // This can happen if the module is reloaded or auth was initialized elsewhere
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "auth/already-initialized"
      ) {
        auth = getAuth(app);
      } else {
        throw error;
      }
    }
  }
  
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

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLPjOSOBYEIchhHbxAZs93alRB3bX9FYA",
  authDomain: "mediglow-abaca.firebaseapp.com",
  projectId: "mediglow-abaca",
  storageBucket: "mediglow-abaca.firebasestorage.app",
  messagingSenderId: "994989895016",
  appId: "1:994989895016:web:f271b2999e1582e3673add",
  measurementId: "G-540XXQTJZT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

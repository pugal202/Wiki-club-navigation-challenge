import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBeVm8mbDtnIGhzz9R4UBcBoLFm7A4IVlU",
  authDomain: "wikitech-navigation.firebaseapp.com",
  databaseURL:
    "https://wikitech-navigation-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wikitech-navigation",
  storageBucket:
    "wikitech-navigation.firebasestorage.app",
  messagingSenderId: "877076119570",
  appId:
    "1:877076119570:web:2c2d532bfe9164b00998cb",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);

export const signInGuest = () =>
  signInAnonymously(auth);
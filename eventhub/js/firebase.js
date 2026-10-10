import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyCwwcJlQY0JNrDuY-sBxhuCWD3v9VFdyjE",
  authDomain: "event2026-17586.firebaseapp.com",
  projectId: "event2026-17586",
  storageBucket: "event2026-17586.firebasestorage.app",
  messagingSenderId: "524720949005",
  appId: "1:524720949005:web:de305e9b7f1cc19cea5244",
  measurementId: "G-6PXDHHGRZD"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

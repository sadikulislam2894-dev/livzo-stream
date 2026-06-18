// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWwtfwGgTAK2wyftSCJDQRsyao5fvg83U",
  authDomain: "livzo-stream.firebaseapp.com",
  projectId: "livzo-stream",
  storageBucket: "livzo-stream.firebasestorage.app",
  messagingSenderId: "268515086933",
  appId: "1:268515086933:web:2ef7623bc790e6f8cbbadc"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
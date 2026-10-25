// src/renderer/src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD53JqRcYFXOALXojN8qGM6Qt1gKWu7Ic",
  authDomain: "aetherforge-e62c8.firebaseapp.com",
  projectId: "aetherforge-e62c8",
  storageBucket: "aetherforge-e62c8.firebasestorage.app",
  messagingSenderId: "296427652941",
  appId: "1:296427652941:web:f7d371f0619d9ebfa05904"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);

// Экспортируем базу данных Firestore, чтобы использовать её в компонентах
export const db = getFirestore(app);
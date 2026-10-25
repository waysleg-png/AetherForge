import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD53JqRcYFXOALXojN8qGM6Qt1tgKWu7Ic",
  authDomain: "aetherforge-e62c8.firebaseapp.com",
  projectId: "aetherforge-e62c8",
  storageBucket: "aetherforge-e62c8.firebasestorage.app",
  messagingSenderId: "296427652941",
  appId: "1:296427652941:web:f7d371f0619d9ebfa05904"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
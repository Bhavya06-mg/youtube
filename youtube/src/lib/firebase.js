// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider } from "firebase/auth";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8iwx5eVHFePeel_jDHSsgWMwuCEpfGqo",
  authDomain: "yourtube-a8fac.firebaseapp.com",
  projectId: "yourtube-a8fac",
  storageBucket: "yourtube-a8fac.firebasestorage.app",
  messagingSenderId: "1017397832656",
  appId: "1:1017397832656:web:a13a331c8f7a1c97e6e7d5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };

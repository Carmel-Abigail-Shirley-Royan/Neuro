// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvVWvw2Dqek4NS_yZcJX6sRcJAdh0APR4",
  authDomain: "neuroguard2.firebaseapp.com",
  projectId: "neuroguard2",
  storageBucket: "neuroguard2.firebasestorage.app",
  messagingSenderId: "549400834078",
  appId: "1:549400834078:web:5bae30656b25724ec7be0f",
  measurementId: "G-X6PLQHYW22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app); 
window.auth = auth;
export const db = getFirestore(app);
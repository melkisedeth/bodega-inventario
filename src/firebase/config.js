import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDMCfwwY5S1t-f7l0TXVT2aTPKuGfd4LLM",
  authDomain: "cotiznow-a609d.firebaseapp.com",
  projectId: "cotiznow-a609d",
  storageBucket: "cotiznow-a609d.appspot.com",
  messagingSenderId: "688465903436",
  appId: "1:688465903436:web:f11471c2bbd95d78a9d9e9",
  measurementId: "G-SG2T5HHWGZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
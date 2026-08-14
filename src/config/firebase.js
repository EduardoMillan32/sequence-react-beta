import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

/**
 * Configuración de Firebase para la aplicación.
 * Conecta con Realtime Database para la sincronización del juego en tiempo real.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBO5oECBqVUBQzBX4Yb61DAHeIOw6hLm-Y",
  authDomain: "secuence-7d7af.firebaseapp.com",
  databaseURL: "https://secuence-7d7af-default-rtdb.firebaseio.com/",
  projectId: "secuence-7d7af",
  storageBucket: "secuence-7d7af.firebasestorage.app",
  messagingSenderId: "576327423344",
  appId: "1:576327423344:web:30f213dcfc5b2b133d2bb5"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

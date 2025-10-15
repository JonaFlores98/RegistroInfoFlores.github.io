// firebase-config.js - Versión Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAmqWjpS2bYaNtPA_LhYLMh5KuwOOmEk2Y",
  authDomain: "sistema-docente-informatica.firebaseapp.com",
  projectId: "sistema-docente-informatica",
  storageBucket: "sistema-docente-informatica.firebasestorage.app",
  messagingSenderId: "317682841841",
  appId: "1:317682841841:web:e0022e870491b701365150"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exportar para usar en otros archivos
export { auth, db, storage };
// firebase-config-compat.js - Versión Compatible
const firebaseConfig = {
  apiKey: "AIzaSyAmqWjpS2bYaNtPA_LhYLMh5KuwOOmEk2Y",
  authDomain: "sistema-docente-informatica.firebaseapp.com",
  projectId: "sistema-docente-informatica",
  storageBucket: "sistema-docente-informatica.firebasestorage.app",
  messagingSenderId: "317682841841",
  appId: "1:317682841841:web:e0022e870491b701365150"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();

console.log('Firebase configurado correctamente');
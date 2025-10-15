// auth.js - Versión Modular
import { 
    auth, 
    db 
} from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Authentication functionality con Firebase
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Escuchar cambios en el estado de autenticación
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.handleSuccessfulLogin(user);
            } else {
                this.currentUser = null;
                this.handleLogout();
            }
        });
        
        this.addEventListeners();
    }

    addEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            // Mostrar loading
            this.showLoading(true);
            
            // Iniciar sesión con Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            this.currentUser = userCredential.user;
            
            console.log('Usuario autenticado:', userCredential.user.email);
            
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup(email, password, userData) {
        try {
            // Crear usuario en Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Guardar datos adicionales en Firestore
            await setDoc(doc(db, 'users', user.uid), {
                ...userData,
                createdAt: new Date(),
                role: 'teacher'
            });
            
            return user;
            
        } catch (error) {
            throw error;
        }
    }

    handleLogout(e = null) {
        if (e) e.preventDefault();
        
        signOut(auth).then(() => {
            this.currentUser = null;
            window.location.href = 'login.html';
        }).catch((error) => {
            this.showError(error.message);
        });
    }

    async handleSuccessfulLogin(user) {
        // Actualizar UI con información del usuario
        await this.updateUserInfo(user);
        
        // Redirigir si está en login page
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    }

    async updateUserInfo(user) {
        const userNameElement = document.getElementById('user-name');
        const userAvatar = document.querySelector('.user-avatar');
        
        if (userNameElement) {
            try {
                // Intentar obtener el nombre del usuario desde Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userNameElement.textContent = userData.name || user.email;
                    
                    if (userAvatar && userData.name) {
                        userAvatar.textContent = userData.name.charAt(0).toUpperCase();
                    }
                } else {
                    userNameElement.textContent = user.email;
                    if (userAvatar) {
                        userAvatar.textContent = user.email.charAt(0).toUpperCase();
                    }
                }
            } catch (error) {
                console.error('Error obteniendo datos del usuario:', error);
                userNameElement.textContent = user.email;
                if (userAvatar) {
                    userAvatar.textContent = user.email.charAt(0).toUpperCase();
                }
            }
        }
    }

    showLoading(show) {
        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        if (submitBtn) {
            if (show) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
                submitBtn.disabled = true;
            } else {
                submitBtn.innerHTML = 'Iniciar Sesión';
                submitBtn.disabled = false;
            }
        }
    }

    showError(message) {
        // Eliminar mensajes de error anteriores
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Crear nuevo mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 0.75rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            border: 1px solid #f5c6cb;
        `;
        errorDiv.textContent = message;
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.insertBefore(errorDiv, loginForm.firstChild);
        }
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/invalid-email': 'El formato del email es incorrecto',
            'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
            'auth/user-not-found': 'No existe una cuenta con este email',
            'auth/wrong-password': 'La contraseña es incorrecta',
            'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde'
        };
        
        return errorMessages[errorCode] || 'Error al iniciar sesión';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
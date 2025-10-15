// Authentication functionality con Firebase
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Escuchar cambios en el estado de autenticación
        auth.onAuthStateChanged((user) => {
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
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            
            // Redirección manejada por onAuthStateChanged
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup(email, password, userData) {
        try {
            // Crear usuario en Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Guardar datos adicionales en Firestore
            await db.collection('users').doc(user.uid).set({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'teacher'
            });
            
            return user;
            
        } catch (error) {
            throw error;
        }
    }

    handleLogout(e = null) {
        if (e) e.preventDefault();
        
        auth.signOut().then(() => {
            this.currentUser = null;
            window.location.href = 'login.html';
        }).catch((error) => {
            this.showError(error.message);
        });
    }

    handleSuccessfulLogin(user) {
        // Actualizar UI con información del usuario
        this.updateUserInfo(user);
        
        // Redirigir si está en login page
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    }

    updateUserInfo(user) {
        const userNameElement = document.getElementById('user-name');
        const userAvatar = document.querySelector('.user-avatar');
        
        if (userNameElement) {
            // Intentar obtener el nombre del usuario desde Firestore
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
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
                })
                .catch(() => {
                    userNameElement.textContent = user.email;
                    if (userAvatar) {
                        userAvatar.textContent = user.email.charAt(0).toUpperCase();
                    }
                });
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

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Incluir Firebase SDK si no está cargado
    if (typeof firebase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        document.head.appendChild(script);
        
        script.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
            document.head.appendChild(authScript);
            
            authScript.onload = () => {
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
                document.head.appendChild(firestoreScript);
                
                firestoreScript.onload = () => {
                    // Cargar configuración de Firebase
                    const configScript = document.createElement('script');
                    configScript.src = 'js/firebase-config.js';
                    document.head.appendChild(configScript);
                    
                    configScript.onload = () => {
                        window.authManager = new AuthManager();
                    };
                };
            };
        };
    } else {
        window.authManager = new AuthManager();
    }
});
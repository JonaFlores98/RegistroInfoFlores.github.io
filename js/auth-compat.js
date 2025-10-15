// auth-compat.js - Versión Compatible
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
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            this.showLoading(true);
            
            // Iniciar sesión con Firebase
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            
            console.log('Usuario autenticado:', userCredential.user.email);
            
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        auth.signOut().then(() => {
            this.currentUser = null;
            window.location.href = 'login.html';
        }).catch((error) => {
            this.showError(error.message);
        });
    }

    async handleSuccessfulLogin(user) {
        // Redirigir a dashboard
        window.location.href = 'dashboard.html';
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
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
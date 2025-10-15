// Authentication functionality
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if user is logged in
        this.checkAuthState();
        
        // Add event listeners
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

    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Simple validation (in a real app, this would connect to Firebase Auth)
        if (username && password) {
            this.currentUser = {
                name: 'Juan Docente',
                email: username
            };
            
            // Save to localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            alert('Por favor, completa todos los campos');
        }
    }

    handleLogout(e) {
        e.preventDefault();
        
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    checkAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            
            // If on login page, redirect to dashboard
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'dashboard.html';
            }
            
            // Update UI with user info
            this.updateUserInfo();
        } else {
            // If not on login or index page, redirect to login
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('index.html') &&
                window.location.pathname !== '/') {
                window.location.href = 'login.html';
            }
        }
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
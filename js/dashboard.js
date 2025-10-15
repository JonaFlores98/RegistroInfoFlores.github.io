// Dashboard functionality
class DashboardManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.init();
    }

    init() {
        this.setupAuthListener();
        this.addEventListeners();
    }

    setupAuthListener() {
        // Protección del dashboard - solo redirige si NO hay usuario
        this.auth.onAuthStateChanged((user) => {
            if (!user) {
                // Si no hay usuario, redirigir al login
                window.location.href = 'login.html';
            } else {
                // Cargar información del usuario y datos del dashboard
                this.loadUserInfo(user);
                this.loadDashboardData();
            }
        });
    }

    addEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    async loadUserInfo(user) {
        const userNameElement = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        
        if (userNameElement) {
            userNameElement.textContent = user.email;
        }
        
        if (userAvatar) {
            userAvatar.textContent = user.email.charAt(0).toUpperCase();
        }

        // Intentar obtener información adicional de Firestore
        try {
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.name && userNameElement) {
                    userNameElement.textContent = userData.name;
                }
                if (userData.name && userAvatar) {
                    userAvatar.textContent = userData.name.charAt(0).toUpperCase();
                }
            }
        } catch (error) {
            console.error('Error cargando información del usuario:', error);
        }
    }

    loadDashboardData() {
        // Simular carga de datos (en app real, vendría de Firebase)
        setTimeout(() => {
            this.updateRecentActivity();
        }, 1000);
    }

    updateRecentActivity() {
        const activityData = [
            {
                date: '15/05/2023',
                class: '2° Grado - Informática',
                activity: 'Registro de asistencia',
                status: 'completed'
            },
            {
                date: '14/05/2023',
                class: '5° Grado - Programación',
                activity: 'Calificación de examen',
                status: 'completed'
            },
            {
                date: '13/05/2023',
                class: '9° Grado - Base de Datos',
                activity: 'Registro de notas prácticas',
                status: 'pending'
            }
        ];

        const tbody = document.querySelector('#recent-activity tbody');
        if (tbody) {
            tbody.innerHTML = activityData.map(item => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.class}</td>
                    <td>${item.activity}</td>
                    <td>
                        <span class="badge badge-${item.status === 'completed' ? 'presente' : 'ausente'}">
                            ${item.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    }

    handleLogout() {
        this.auth.signOut().then(() => {
            // El onAuthStateChanged detectará el logout y redirigirá automáticamente
            console.log('Sesión cerrada exitosamente');
        }).catch((error) => {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión: ' + error.message);
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        window.dashboardManager = new DashboardManager();
    }
});
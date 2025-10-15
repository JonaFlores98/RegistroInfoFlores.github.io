// Dashboard functionality
class DashboardManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userData = null;
        this.init();
    }

    init() {
        this.setupAuthListener();
        this.addEventListeners();
    }

    setupAuthListener() {
        // Protección del dashboard - solo redirige si NO hay usuario
        this.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Si no hay usuario, redirigir al login
                window.location.href = 'login.html';
            } else {
                this.currentUser = user;
                // Cargar información del usuario desde Firestore
                await this.loadUserInfo(user);
                // Cargar datos del dashboard
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

        try {
            // Obtener información adicional de Firestore
            const userDoc = await this.db.collection('users').doc(user.uid).get();

            if (userDoc.exists) {
                this.userData = userDoc.data();

                // Mostrar nombre completo en el dashboard
                if (this.userData.nombreCompleto && userNameElement) {
                    userNameElement.textContent = this.userData.nombreCompleto;
                } else if (this.userData.nombreUsuario && userNameElement) {
                    // Fallback al nombre de usuario si no hay nombre completo
                    userNameElement.textContent = this.userData.nombreUsuario;
                } else {
                    // Fallback al email
                    userNameElement.textContent = user.email;
                }

                // Actualizar avatar con iniciales
                if (userAvatar) {
                    if (this.userData.nombreCompleto) {
                        userAvatar.textContent = this.getInitials(this.userData.nombreCompleto);
                    } else if (this.userData.nombreUsuario) {
                        userAvatar.textContent = this.userData.nombreUsuario.charAt(0).toUpperCase();
                    } else {
                        userAvatar.textContent = user.email.charAt(0).toUpperCase();
                    }
                }

                console.log('Usuario cargado:', this.userData);
            } else {
                // Si no existe el documento en Firestore, usar datos básicos
                console.warn('No se encontraron datos adicionales del usuario en Firestore');
                if (userNameElement) userNameElement.textContent = user.email;
                if (userAvatar) userAvatar.textContent = user.email.charAt(0).toUpperCase();
            }
        } catch (error) {
            console.error('Error cargando información del usuario:', error);
            // Fallback a datos básicos en caso de error
            if (userNameElement) userNameElement.textContent = user.email;
            if (userAvatar) userAvatar.textContent = user.email.charAt(0).toUpperCase();
        }
    }

    getInitials(fullName) {
        return fullName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    loadDashboardData() {
        // Cargar estadísticas basadas en los grados del usuario
        this.loadUserStatistics();

        // Simular carga de actividad reciente
        setTimeout(() => {
            this.updateRecentActivity();
        }, 1000);
    }

    async loadUserStatistics() {
        if (!this.userData || !this.userData.grades) return;

        try {
            // Aquí cargaríamos estadísticas reales de Firestore
            // Por ahora usamos datos de ejemplo basados en los grados del usuario

            const totalStudents = this.userData.grades.length * 25; // Ejemplo: 25 estudiantes por grado
            const activeClasses = this.userData.grades.length;

            document.getElementById('total-students').textContent = totalStudents;
            document.getElementById('active-classes').textContent = activeClasses + ' grupo' + (activeClasses !== 1 ? 's' : '');

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    updateRecentActivity() {
        // Datos de ejemplo - en una app real esto vendría de Firestore
        const activityData = [
            {
                date: new Date().toLocaleDateString('es-ES'),
                class: this.getRandomGrade() + ' - Informática',
                activity: 'Registro de asistencia',
                status: 'completed'
            },
            {
                date: new Date(Date.now() - 86400000).toLocaleDateString('es-ES'),
                class: this.getRandomGrade() + ' - Programación',
                activity: 'Calificación de examen',
                status: 'completed'
            },
            {
                date: new Date(Date.now() - 172800000).toLocaleDateString('es-ES'),
                class: this.getRandomGrade() + ' - Base de Datos',
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

    getRandomGrade() {
        if (!this.userData || !this.userData.grades) return '2° Grado';

        const gradesMap = {
            'kinder4': 'Kinder 4',
            'kinder5': 'Kinder 5',
            'kinder6': 'Kinder 6',
            'primero': '1° Grado',
            'segundo': '2° Grado',
            'tercero': '3° Grado',
            'cuarto': '4° Grado',
            'quinto': '5° Grado',
            'sexto': '6° Grado',
            'septimo': '7° Grado',
            'octavo': '8° Grado',
            'noveno': '9° Grado',
            'primero-bach': '1° Bachillerato',
            'segundo-bach': '2° Bachillerato'
        };

        const randomIndex = Math.floor(Math.random() * this.userData.grades.length);
        const gradeKey = this.userData.grades[randomIndex];
        return gradesMap[gradeKey] || '2° Grado';
    }

    handleLogout() {
        this.auth.signOut().then(() => {
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
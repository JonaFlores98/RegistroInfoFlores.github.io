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
        this.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                this.currentUser = user;
                await this.loadUserInfo(user);
                await this.loadRealTimeData();
            }
        });
    }

    addEventListeners() {
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
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                this.userData = userDoc.data();
                if (this.userData.nombreCompleto && userNameElement) {
                    userNameElement.textContent = this.userData.nombreCompleto;
                }
                if (userAvatar && this.userData.nombreCompleto) {
                    userAvatar.textContent = this.userData.nombreCompleto.charAt(0).toUpperCase();
                }
            }
        } catch (error) {
            console.error('Error cargando información del usuario:', error);
        }
    }

    async loadRealTimeData() {
        // Cargar datos en tiempo real
        await this.loadStudentsStats();
        await this.loadAttendanceStats();
        await this.loadRecentActivity();

        // Escuchar cambios en tiempo real
        this.setupRealTimeListeners();
    }

    async loadStudentsStats() {
        try {
            const studentsSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .get();

            const totalStudents = studentsSnapshot.size;

            // Contar estudiantes por grado
            const studentsByGrade = {};
            studentsSnapshot.forEach(doc => {
                const student = doc.data();
                const grade = student.grado;
                studentsByGrade[grade] = (studentsByGrade[grade] || 0) + 1;
            });

            const activeClasses = Object.keys(studentsByGrade).length;

            // Actualizar UI
            document.getElementById('total-students').textContent = totalStudents;
            document.getElementById('active-classes').textContent = activeClasses + ' grupo' + (activeClasses !== 1 ? 's' : '');

        } catch (error) {
            console.error('Error cargando estadísticas de estudiantes:', error);
            document.getElementById('total-students').textContent = '0';
            document.getElementById('active-classes').textContent = '0 grupos';
        }
    }

    async loadAttendanceStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Buscar asistencias de hoy
            const attendanceSnapshot = await this.db.collection('asistencias')
                .where('profesorId', '==', this.currentUser.uid)
                .where('fecha', '==', today)
                .get();

            let totalPresent = 0;
            let totalStudents = 0;
            let averageGrade = 0;

            if (!attendanceSnapshot.empty) {
                // Calcular asistencia de hoy
                attendanceSnapshot.forEach(doc => {
                    const attendance = doc.data();
                    const students = attendance.estudiantes || [];

                    totalStudents += students.length;
                    totalPresent += students.filter(s => s.estado === 'presente').length;
                });

                // Calcular promedio general (esto sería de calificaciones)
                const gradesSnapshot = await this.db.collection('calificaciones')
                    .where('profesorId', '==', this.currentUser.uid)
                    .limit(100)
                    .get();

                let totalGrades = 0;
                let gradeCount = 0;

                gradesSnapshot.forEach(doc => {
                    const gradeData = doc.data();
                    if (gradeData.calificacion) {
                        totalGrades += gradeData.calificacion;
                        gradeCount++;
                    }
                });

                averageGrade = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(1) : 0;
            }

            // Calcular porcentaje de asistencia
            const attendancePercentage = totalStudents > 0 ?
                Math.round((totalPresent / totalStudents) * 100) : 0;

            // Actualizar UI
            document.getElementById('attendance-today').textContent =
                attendancePercentage + '% de presencia';
            document.getElementById('average-grade').textContent =
                averageGrade + ' / 10';

        } catch (error) {
            console.error('Error cargando estadísticas de asistencia:', error);
            document.getElementById('attendance-today').textContent = '0% de presencia';
            document.getElementById('average-grade').textContent = '0 / 10';
        }
    }

    async loadRecentActivity() {
        try {
            // Obtener asistencias recientes (últimos 3 días)
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const activitySnapshot = await this.db.collection('asistencias')
                .where('profesorId', '==', this.currentUser.uid)
                .where('fecha', '>=', threeDaysAgo.toISOString().split('T')[0])
                .orderBy('fecha', 'desc')
                .limit(5)
                .get();

            const activities = [];

            if (!activitySnapshot.empty) {
                activitySnapshot.forEach(doc => {
                    const attendance = doc.data();
                    activities.push({
                        date: this.formatDate(attendance.fecha),
                        class: this.getGradeDisplayName(attendance.clase),
                        activity: 'Registro de asistencia',
                        status: 'completed',
                        timestamp: attendance.fecha
                    });
                });
            }

            // ⭐ CAMBIO CLAVE: Si no hay actividades reales, NO mostrar nada falso
            // Solo actualizar si hay actividades reales
            this.updateRecentActivity(activities);

        } catch (error) {
            console.error('Error cargando actividad reciente:', error);
            // ⭐ CAMBIO CLAVE: En caso de error, mostrar array vacío en lugar de actividades falsas
            this.updateRecentActivity([]);
        }
    }

    setupRealTimeListeners() {
        // Escuchar nuevos estudiantes en tiempo real
        this.db.collection('estudiantes')
            .where('profesorId', '==', this.currentUser.uid)
            .onSnapshot(() => {
                this.loadStudentsStats();
            });

        // Escuchar nuevas asistencias en tiempo real
        this.db.collection('asistencias')
            .where('profesorId', '==', this.currentUser.uid)
            .onSnapshot(() => {
                this.loadAttendanceStats();
                this.loadRecentActivity();
            });
    }

    updateRecentActivity(activities) {
        const tbody = document.querySelector('#recent-activity tbody');
        if (tbody) {
            tbody.innerHTML = activities.map(item => `
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    getGradeDisplayName(gradeKey) {
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

        return gradesMap[gradeKey] || gradeKey;
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
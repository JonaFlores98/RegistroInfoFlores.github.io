// Dashboard functionality
class DashboardManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userData = null;
        this.selectedGrade = 'all'; // Filtro por grado
        this.init();
    }

    navigateToAttendance() {
        window.location.href = 'attendance.html';
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

        // Selector de grado para filtrar estadísticas
        const gradeFilter = document.getElementById('grade-filter');
        if (gradeFilter) {
            gradeFilter.addEventListener('change', (e) => {
                this.selectedGrade = e.target.value;
                this.refreshAllStats();
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
        await this.loadAvailableGrades(); // ⭐ NUEVO: Cargar grados primero
        await this.loadStudentsStats();
        await this.loadAttendanceStats();
        await this.loadGradeStats();
        await this.loadRecentActivity();

        // Escuchar cambios en tiempo real
        this.setupRealTimeListeners();
    }

    // ⭐ NUEVO: Cargar grados disponibles desde Firebase
    async loadAvailableGrades() {
        try {
            const studentsSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .get();

            const grades = new Set();
            
            studentsSnapshot.forEach(doc => {
                const student = doc.data();
                if (student.grado) {
                    grades.add(student.grado);
                }
            });

            this.populateGradeFilter(Array.from(grades));
            
        } catch (error) {
            console.error('Error cargando grados disponibles:', error);
        }
    }

    // ⭐ NUEVO: Poblar el filtro de grados
    populateGradeFilter(grades) {
        const gradeFilter = document.getElementById('grade-filter');
        if (!gradeFilter) return;

        // Ordenar grados de manera lógica
        const sortedGrades = this.sortGrades(grades);
        
        gradeFilter.innerHTML = '<option value="all">Todos los grados</option>';
        
        sortedGrades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = this.getGradeDisplayName(grade);
            gradeFilter.appendChild(option);
        });

        console.log('Filtro de grados poblado con:', sortedGrades);
    }

    // ⭐ NUEVO: Ordenar grados
    sortGrades(grades) {
        const gradeOrder = {
            'kinder4': 1, 'kinder5': 2, 'kinder6': 3,
            'primero': 4, 'segundo': 5, 'tercero': 6,
            'cuarto': 7, 'quinto': 8, 'sexto': 9,
            'septimo': 10, 'octavo': 11, 'noveno': 12,
            'primero-bach': 13, 'segundo-bach': 14
        };
        
        return grades.sort((a, b) => {
            return (gradeOrder[a] || 99) - (gradeOrder[b] || 99);
        });
    }

    // Refrescar todas las estadísticas
    async refreshAllStats() {
        await this.loadStudentsStats();
        await this.loadAttendanceStats();
        await this.loadGradeStats();
    }

    async loadStudentsStats() {
        try {
            let studentsQuery = this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid);

            // Aplicar filtro por grado si no es "all"
            if (this.selectedGrade !== 'all') {
                studentsQuery = studentsQuery.where('grado', '==', this.selectedGrade);
            }

            const studentsSnapshot = await studentsQuery.get();
            const totalStudents = studentsSnapshot.size;

            // Contar estudiantes por grado (solo si no hay filtro aplicado)
            const studentsByGrade = {};
            if (this.selectedGrade === 'all') {
                studentsSnapshot.forEach(doc => {
                    const student = doc.data();
                    const grade = student.grado;
                    studentsByGrade[grade] = (studentsByGrade[grade] || 0) + 1;
                });
            }

            const activeClasses = this.selectedGrade === 'all' ?
                Object.keys(studentsByGrade).length : 1;

            // Actualizar UI con información más descriptiva
            const studentsElement = document.getElementById('total-students');
            const classesElement = document.getElementById('active-classes');
            
            studentsElement.textContent = totalStudents;
            
            if (this.selectedGrade === 'all') {
                classesElement.textContent = `${activeClasses} grupo${activeClasses !== 1 ? 's' : ''}`;
                if (Object.keys(studentsByGrade).length > 0) {
                    classesElement.title = `Grados con estudiantes: ${Object.keys(studentsByGrade).map(g => this.getGradeDisplayName(g)).join(', ')}`;
                }
            } else {
                const gradeName = this.getGradeDisplayName(this.selectedGrade);
                classesElement.textContent = gradeName;
                classesElement.title = `${totalStudents} estudiantes en ${gradeName}`;
            }

        } catch (error) {
            console.error('Error cargando estadísticas de estudiantes:', error);
            document.getElementById('total-students').textContent = '0';
            document.getElementById('active-classes').textContent = '0 grupos';
        }
    }

    async loadAttendanceStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            let attendanceQuery = this.db.collection('asistencias')
                .where('profesorId', '==', this.currentUser.uid)
                .where('fecha', '==', today);

            // Aplicar filtro por grado si no es "all"
            if (this.selectedGrade !== 'all') {
                attendanceQuery = attendanceQuery.where('clase', '==', this.selectedGrade);
            }

            const attendanceSnapshot = await attendanceQuery.get();

            let totalPresent = 0;
            let totalStudents = 0;
            let attendanceByGrade = {};

            if (!attendanceSnapshot.empty) {
                attendanceSnapshot.forEach(doc => {
                    const attendance = doc.data();
                    const students = attendance.estudiantes || [];
                    const grade = attendance.clase;

                    const presentCount = students.filter(s => s.estado === 'presente').length;
                    totalPresent += presentCount;
                    totalStudents += students.length;

                    // Estadísticas por grado
                    if (!attendanceByGrade[grade]) {
                        attendanceByGrade[grade] = { present: 0, total: 0 };
                    }
                    attendanceByGrade[grade].present += presentCount;
                    attendanceByGrade[grade].total += students.length;
                });
            }

            // Calcular porcentajes
            const overallPercentage = totalStudents > 0 ?
                Math.round((totalPresent / totalStudents) * 100) : 0;

            // Actualizar UI
            const attendanceElement = document.getElementById('attendance-today');
            if (this.selectedGrade === 'all') {
                attendanceElement.textContent = `${overallPercentage}% de presencia (General)`;
                attendanceElement.title = `Total: ${totalPresent}/${totalStudents} estudiantes`;
            } else {
                const gradeName = this.getGradeDisplayName(this.selectedGrade);
                attendanceElement.textContent = `${overallPercentage}% de presencia (${gradeName})`;
                attendanceElement.title = `${gradeName}: ${totalPresent}/${totalStudents} estudiantes`;
            }

            // Mostrar desglose por grados si es vista general
            this.updateAttendanceBreakdown(attendanceByGrade);

        } catch (error) {
            console.error('Error cargando estadísticas de asistencia:', error);
            document.getElementById('attendance-today').textContent = '0% de presencia';
        }
    }

    // Método para estadísticas de calificaciones por grado
    async loadGradeStats() {
        try {
            let gradesQuery = this.db.collection('calificaciones')
                .where('profesorId', '==', this.currentUser.uid);

            // Aplicar filtro por grado si no es "all"
            if (this.selectedGrade !== 'all') {
                gradesQuery = gradesQuery.where('grado', '==', this.selectedGrade);
            }

            const gradesSnapshot = await gradesQuery.limit(200).get();

            let totalGrades = 0;
            let gradeCount = 0;
            let gradesByGrade = {};

            gradesSnapshot.forEach(doc => {
                const gradeData = doc.data();
                if (gradeData.calificacion && gradeData.calificacion > 0) {
                    const gradeValue = gradeData.calificacion;
                    totalGrades += gradeValue;
                    gradeCount++;

                    // Estadísticas por grado
                    const gradeLevel = gradeData.grado;
                    if (!gradesByGrade[gradeLevel]) {
                        gradesByGrade[gradeLevel] = { total: 0, count: 0 };
                    }
                    gradesByGrade[gradeLevel].total += gradeValue;
                    gradesByGrade[gradeLevel].count++;
                }
            });

            const averageGrade = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(1) : 0;

            // Actualizar UI
            const gradeElement = document.getElementById('average-grade');
            if (this.selectedGrade === 'all') {
                gradeElement.textContent = `${averageGrade} / 10 (Promedio General)`;
                gradeElement.title = `Basado en ${gradeCount} calificaciones`;
            } else {
                const gradeName = this.getGradeDisplayName(this.selectedGrade);
                gradeElement.textContent = `${averageGrade} / 10 (${gradeName})`;
                gradeElement.title = `${gradeName}: ${gradeCount} calificaciones`;
            }

            // Mostrar desglose de calificaciones
            this.updateGradesBreakdown(gradesByGrade);

        } catch (error) {
            console.error('Error cargando estadísticas de calificaciones:', error);
            document.getElementById('average-grade').textContent = '0 / 10';
        }
    }

    // Actualizar desglose de asistencia
    updateAttendanceBreakdown(attendanceByGrade) {
        const breakdownElement = document.getElementById('attendance-breakdown');
        if (!breakdownElement) return;

        if (this.selectedGrade === 'all' && Object.keys(attendanceByGrade).length > 0) {
            let html = '<div class="breakdown-container"><h4>Asistencia por Grado:</h4>';

            Object.keys(attendanceByGrade).forEach(grade => {
                const data = attendanceByGrade[grade];
                if (data.total > 0) {
                    const percentage = Math.round((data.present / data.total) * 100);
                    const gradeName = this.getGradeDisplayName(grade);
                    html += `
                        <div class="breakdown-item">
                            <span class="grade-name">${gradeName}:</span>
                            <span class="grade-percentage">${percentage}%</span>
                            <span class="grade-count">(${data.present}/${data.total})</span>
                        </div>
                    `;
                }
            });

            html += '</div>';
            breakdownElement.innerHTML = html;
            breakdownElement.style.display = 'block';
        } else {
            breakdownElement.style.display = 'none';
        }
    }

    // Actualizar desglose de calificaciones
    updateGradesBreakdown(gradesByGrade) {
        const breakdownElement = document.getElementById('grades-breakdown');
        if (!breakdownElement) return;

        if (this.selectedGrade === 'all' && Object.keys(gradesByGrade).length > 0) {
            let html = '<div class="breakdown-container"><h4>Promedios por Grado:</h4>';

            Object.keys(gradesByGrade).forEach(grade => {
                const data = gradesByGrade[grade];
                if (data.count > 0) {
                    const average = (data.total / data.count).toFixed(1);
                    const gradeName = this.getGradeDisplayName(grade);
                    html += `
                        <div class="breakdown-item">
                            <span class="grade-name">${gradeName}:</span>
                            <span class="grade-average">${average} / 10</span>
                            <span class="grade-count">(${data.count} eval.)</span>
                        </div>
                    `;
                }
            });

            html += '</div>';
            breakdownElement.innerHTML = html;
            breakdownElement.style.display = 'block';
        } else {
            breakdownElement.style.display = 'none';
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

            // Solo actualizar si hay actividades reales
            this.updateRecentActivity(activities);

        } catch (error) {
            console.error('Error cargando actividad reciente:', error);
            this.updateRecentActivity([]);
        }
    }

    setupRealTimeListeners() {
        // Escuchar nuevos estudiantes en tiempo real
        this.db.collection('estudiantes')
            .where('profesorId', '==', this.currentUser.uid)
            .onSnapshot(() => {
                this.loadAvailableGrades(); // ⭐ ACTUALIZAR GRADOS CUANDO CAMBIEN ESTUDIANTES
                this.loadStudentsStats();
            });

        // Escuchar nuevas asistencias en tiempo real
        this.db.collection('asistencias')
            .where('profesorId', '==', this.currentUser.uid)
            .onSnapshot(() => {
                this.loadAttendanceStats();
                this.loadRecentActivity();
            });

        // Escuchar nuevas calificaciones en tiempo real
        this.db.collection('calificaciones')
            .where('profesorId', '==', this.currentUser.uid)
            .onSnapshot(() => {
                this.loadGradeStats();
            });
    }

    updateRecentActivity(activities) {
        const tbody = document.querySelector('#recent-activity tbody');
        const tableContainer = document.querySelector('#recent-activity');
        
        if (tbody && tableContainer) {
            if (activities.length === 0) {
                tableContainer.style.display = 'none';
            } else {
                tableContainer.style.display = 'table';
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
// Gestiona todo el sistema de asistencia - CONECTADO A FIREBASE
class AttendanceManager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentUser = null;
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.selectedGrade = '';
        this.attendanceData = {};
        this.students = [];
        this.classSchedule = [];
        this.currentPeriod = null;

        this.init();
    }

    async init() {
        try {
            this.currentUser = await this.getCurrentUser();

            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }

            console.log('Usuario autenticado:', this.currentUser.uid);
            await this.setupEventListeners();
            await this.loadClassSchedule();
            await this.loadGrades();
            this.showRecommendedClass();

        } catch (error) {
            console.error('Error en init:', error);
        }
    }

    getCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    async loadClassSchedule() {
        try {
            const scheduleSnapshot = await this.db.collection('horarios')
                .where('profesorId', '==', this.currentUser.uid)
                .get();

            this.classSchedule = [];
            scheduleSnapshot.forEach(doc => {
                this.classSchedule.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('Horario cargado:', this.classSchedule);

        } catch (error) {
            console.log('No se encontró horario configurado');
            this.classSchedule = [];
        }
    }

    getCurrentClassPeriod() {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const currentDay = now.getDay();

        const daysMap = { 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes' };
        const currentDayName = daysMap[currentDay];

        if (!currentDayName) return null;

        const periods = [
            { start: 700, end: 745, name: 'Primera clase', period: 1 },
            { start: 745, end: 830, name: 'Segunda clase', period: 2 },
            { start: 850, end: 935, name: 'Tercera clase', period: 3 },
            { start: 935, end: 1020, name: 'Cuarta clase', period: 4 },
            { start: 1030, end: 1115, name: 'Quinta clase', period: 5 },
            { start: 1115, end: 1200, name: 'Sexta clase', period: 6 },
            { start: 1230, end: 1315, name: 'Séptima clase', period: 7 },
            { start: 1315, end: 1400, name: 'Octava clase', period: 8 },
            { start: 1400, end: 1445, name: 'Novena clase', period: 9 }
        ];

        const currentPeriod = periods.find(p => currentTime >= p.start && currentTime <= p.end);
        
        if (!currentPeriod) return null;

        const todaysSchedule = this.classSchedule.filter(s => 
            s.dia === currentDayName && s.periodo === currentPeriod.period
        );

        return {
            period: currentPeriod,
            classes: todaysSchedule,
            day: currentDayName
        };
    }

    showRecommendedClass() {
        const container = document.getElementById('recommended-class-container');
        const recommended = this.getCurrentClassPeriod();

        if (!recommended || recommended.classes.length === 0) {
            container.style.display = 'none';
            return;
        }

        const classInfo = recommended.classes[0];

        container.innerHTML = `
            <div class="recommended-class">
                <h3>🎯 Clase Recomendada</h3>
                <p><strong>📅 Hoy es ${this.getDayDisplayName(recommended.day)}</strong></p>
                <p>⏰ Hora actual: <strong>${recommended.period.name}</strong> 
                   <span class="class-period">${this.formatTime(recommended.period.start)}-${this.formatTime(recommended.period.end)}</span>
                </p>
                <p>📚 Te toca: <strong>${this.getGradeDisplayName(classInfo.grado)}</strong></p>
                
                <div class="recommended-actions">
                    <button class="btn btn-primary btn-recommended" onclick="attendanceManager.setRecommendedClass('${classInfo.grado}')">
                        📝 Tomar Asistencia Recomendada
                    </button>
                    <button class="btn btn-outline btn-recommended" onclick="attendanceManager.hideRecommendedClass()">
                        Ver Todas las Clases
                    </button>
                </div>
            </div>
        `;
        container.style.display = 'block';
    }

    setRecommendedClass(grade) {
        document.getElementById('attendance-grade').value = grade;
        document.getElementById('attendance-date').value = this.selectedDate;
        this.selectedGrade = grade;
        this.loadStudentsForAttendance();
        document.getElementById('recommended-class-container').style.display = 'none';
    }

    hideRecommendedClass() {
        document.getElementById('recommended-class-container').style.display = 'none';
    }

    formatTime(timeNumber) {
        const hours = Math.floor(timeNumber / 100);
        const minutes = timeNumber % 100;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    getDayDisplayName(day) {
        const days = {
            'lunes': 'Lunes',
            'martes': 'Martes',
            'miercoles': 'Miércoles',
            'jueves': 'Jueves',
            'viernes': 'Viernes'
        };
        return days[day] || day;
    }

    async setupEventListeners() {
        const datePicker = document.getElementById('attendance-date');
        if (datePicker) {
            datePicker.value = this.selectedDate;
            datePicker.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                if (this.selectedGrade) {
                    this.loadAttendanceData();
                }
            });
        }

        const gradeSelect = document.getElementById('attendance-grade');
        if (gradeSelect) {
            gradeSelect.addEventListener('change', (e) => {
                this.selectedGrade = e.target.value;
                if (this.selectedGrade) {
                    this.loadStudentsForAttendance();
                } else {
                    this.showNoDataMessage();
                }
            });
        }

        const searchInput = document.getElementById('student-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim();
                this.handleSearch(term);
                const clearBtn = document.getElementById('clear-search');
                if (clearBtn) {
                    clearBtn.style.display = term ? 'block' : 'none';
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(e.target.value.trim());
                }
            });
        }

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('student-search');
                if (searchInput) {
                    this.handleSearch(searchInput.value.trim());
                }
            });
        }

        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('student-search');
                if (searchInput) {
                    searchInput.value = '';
                    this.handleSearch('');
                    clearBtn.style.display = 'none';
                }
            });
        }
    }

    async loadGrades() {
        try {
            const gradesSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .get();

            const grades = new Set();
            gradesSnapshot.forEach(doc => {
                const studentData = doc.data();
                if (studentData.grado) {
                    grades.add(studentData.grado);
                }
            });

            this.populateGradeSelect(Array.from(grades));

        } catch (error) {
            console.error('Error cargando grados:', error);
            this.showError('Error al cargar los grados: ' + error.message);
        }
    }

    handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const rows = document.querySelectorAll('.student-row');
        let foundCount = 0;

        rows.forEach(row => {
            const studentName = row.querySelector('.student-name').textContent.toLowerCase();
            const studentId = row.querySelector('.student-id').textContent.toLowerCase();
            
            const matches = studentName.includes(term) || studentId.includes(term);
            
            if (matches) {
                row.style.display = '';
                foundCount++;
            } else {
                row.style.display = 'none';
            }
        });

        this.showSearchResults(foundCount, term);
    }

    showSearchResults(foundCount, searchTerm) {
        const summaryElement = document.getElementById('attendance-summary');
        if (!summaryElement) return;

        const total = this.students.length;
        
        if (searchTerm && foundCount === 0) {
            summaryElement.innerHTML = `❌ No se encontraron estudiantes para "${searchTerm}"`;
            summaryElement.style.color = '#e74c3c';
        } else if (searchTerm) {
            summaryElement.innerHTML = `🔍 ${foundCount} de ${total} estudiantes encontrados para "${searchTerm}"`;
            summaryElement.style.color = '#27ae60';
        } else {
            this.updateSummary();
            summaryElement.style.color = '';
        }
    }

    populateGradeSelect(grades) {
        const gradeSelect = document.getElementById('attendance-grade');
        if (!gradeSelect) return;

        gradeSelect.innerHTML = '<option value="">Seleccionar grado</option>';

        const sortedGrades = this.sortGrades(grades);

        sortedGrades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = this.getGradeDisplayName(grade);
            gradeSelect.appendChild(option);
        });
    }

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

    async loadStudentsForAttendance() {
        if (!this.selectedGrade) return;

        try {
            this.showLoading('Cargando estudiantes...');

            const studentsSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .where('grado', '==', this.selectedGrade)
                .get();

            this.students = [];
            studentsSnapshot.forEach(doc => {
                const studentData = doc.data();
                this.students.push({
                    id: doc.id,
                    nombre: studentData.nombreCompleto || 'Estudiante sin nombre',
                    identificacion: studentData.identificacion || 'Sin identificación',
                    grado: studentData.grado,
                    activo: studentData.estado === 'activo'
                });
            });

            if (this.students.length === 0) {
                this.showNoDataMessage();
                return;
            }

            await this.loadAttendanceData();
            this.renderAttendanceTable();

        } catch (error) {
            console.error('❌ Error cargando estudiantes:', error);
            this.showError('Error al cargar estudiantes: ' + error.message);
        }
    }

    async loadAttendanceData() {
        if (!this.selectedGrade) return;

        try {
            const attendanceSnapshot = await this.db.collection('asistencias')
                .where('profesorId', '==', this.currentUser.uid)
                .where('clase', '==', this.selectedGrade)
                .where('fecha', '==', this.selectedDate)
                .get();

            this.attendanceData = {};

            if (!attendanceSnapshot.empty) {
                attendanceSnapshot.forEach(doc => {
                    const data = doc.data();
                    this.attendanceDocId = doc.id;
                    if (data.estudiantes) {
                        data.estudiantes.forEach(student => {
                            this.attendanceData[student.id] = student.estado || 'ausente';
                        });
                    }
                });
            } else {
                this.students.forEach(student => {
                    this.attendanceData[student.id] = 'pendiente';
                });
            }

        } catch (error) {
            console.error('Error cargando asistencia:', error);
            this.students.forEach(student => {
                this.attendanceData[student.id] = 'pendiente';
            });
        }
    }

    renderAttendanceTable() {
        const container = document.getElementById('attendance-container');
        if (!container) return;

        if (!this.students || this.students.length === 0) {
            container.innerHTML = `
            <div class="no-data">
                <div>📝</div>
                <h3>No hay estudiantes en este grado</h3>
                <p>No se encontraron estudiantes para ${this.getGradeDisplayName(this.selectedGrade)}</p>
                <button class="btn btn-primary" onclick="attendanceManager.loadStudentsForAttendance()">
                    Reintentar
                </button>
            </div>
        `;
            return;
        }

        let html = `
        <div class="attendance-container">
            <div class="attendance-header">
                <div>
                    <h3>📋 Lista de Asistencia - ${this.getGradeDisplayName(this.selectedGrade)}</h3>
                    <small>${this.selectedDate} | ${this.students.length} estudiantes</small>
                </div>
            </div>
            <div class="attendance-table-container">
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th width="40%">Estudiante</th>
                            <th width="20%">Estado</th>
                            <th width="40%">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.students.forEach((student) => {
            const currentStatus = this.attendanceData[student.id] || 'pendiente';
            const statusClass = this.getStatusClass(currentStatus);

            html += `
            <tr class="student-row" data-student-id="${student.id}">
                <td>
                    <div class="student-info">
                        <span class="student-name">${student.nombre}</span>
                        <span class="student-id">${student.identificacion || 'Sin identificación'}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}" id="status-${student.id}">
                        ${this.getStatusDisplayName(currentStatus)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-status btn-present" data-status="presente" data-student="${student.id}">
                            ✅ <span>Presente</span>
                        </button>
                        <button class="btn-status btn-absent" data-status="ausente" data-student="${student.id}">
                            ❌ <span>Ausente</span>
                        </button>
                        <button class="btn-status btn-late" data-status="tarde" data-student="${student.id}">
                            ⏰ <span>Tarde</span>
                        </button>
                        <button class="btn-status btn-permit" data-status="permiso" data-student="${student.id}">
                            📝 <span>Permiso</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="attendance-footer">
                <div class="footer-content">
                    <button id="save-attendance" class="btn btn-primary save-btn">
                        💾 Guardar Asistencia
                    </button>
                    <div class="summary" id="attendance-summary">
                        ${this.getSummaryText()}
                    </div>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;
        this.attachEventListeners();
        this.updateSummary();
    }

    attachEventListeners() {
        document.querySelectorAll('.btn-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.closest('.btn-status').dataset.student;
                const status = e.target.closest('.btn-status').dataset.status;
                this.setStudentStatus(studentId, status);
            });
        });

        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('.quick-action').dataset.action;
                this.handleQuickAction(action);
            });
        });

        const saveBtn = document.getElementById('save-attendance');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAttendance());
        }
    }

    setStudentStatus(studentId, status) {
        this.attendanceData[studentId] = status;

        const statusElement = document.getElementById(`status-${studentId}`);
        if (statusElement) {
            statusElement.textContent = this.getStatusDisplayName(status);
            statusElement.className = `status-badge ${this.getStatusClass(status)}`;
        }

        this.updateSummary();
    }

    handleQuickAction(action) {
        const statusMap = {
            'all-present': 'presente',
            'all-absent': 'ausente',
            'all-late': 'tarde',
            'all-permit': 'permiso'
        };

        const status = statusMap[action];
        if (status) {
            this.students.forEach(student => {
                this.attendanceData[student.id] = status;
            });
            this.renderAttendanceTable();
        }
    }

    async saveAttendance() {
        if (!this.selectedGrade || !this.students || this.students.length === 0) {
            this.showError('No hay estudiantes para guardar.');
            return;
        }

        try {
            const studentsAttendance = this.students.map(student => ({
                id: student.id,
                nombre: student.nombre,
                estado: this.attendanceData[student.id] || 'ausente'
            }));

            const attendanceRecord = {
                profesorId: this.currentUser.uid,
                clase: this.selectedGrade,
                fecha: this.selectedDate,
                estudiantes: studentsAttendance,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                totalEstudiantes: studentsAttendance.length,
                presentes: this.getCountByStatus('presente'),
                ausentes: this.getCountByStatus('ausente'),
                tardes: this.getCountByStatus('tarde'),
                permisos: this.getCountByStatus('permiso')
            };

            let savePromise;

            if (this.attendanceDocId) {
                savePromise = this.db.collection('asistencias').doc(this.attendanceDocId).update(attendanceRecord);
            } else {
                savePromise = this.db.collection('asistencias').add(attendanceRecord);
            }

            await savePromise;
            this.showSuccess('✅ Asistencia guardada correctamente');
            await this.loadAttendanceData();

        } catch (error) {
            console.error('Error guardando asistencia:', error);
            this.showError('❌ Error al guardar: ' + error.message);
        }
    }

    getCountByStatus(status) {
        return Object.values(this.attendanceData).filter(s => s === status).length;
    }

    updateSummary() {
        const summaryElement = document.getElementById('attendance-summary');
        if (summaryElement) {
            summaryElement.innerHTML = this.getSummaryText();
        }
    }

    getSummaryText() {
        const total = this.students.length;
        const present = this.getCountByStatus('presente');
        const absent = this.getCountByStatus('ausente');
        const late = this.getCountByStatus('tarde');
        const permit = this.getCountByStatus('permiso');

        return `Resumen: ✅ ${present} Presente | ❌ ${absent} Ausente | ⏰ ${late} Tarde | 📝 ${permit} Permiso | Total: ${total}`;
    }

    getGradeDisplayName(grade) {
        const gradesMap = {
            'kinder4': 'Kinder 4', 'kinder5': 'Kinder 5', 'kinder6': 'Kinder 6',
            'primero': '1° Grado', 'segundo': '2° Grado', 'tercero': '3° Grado',
            'cuarto': '4° Grado', 'quinto': '5° Grado', 'sexto': '6° Grado',
            'septimo': '7° Grado', 'octavo': '8° Grado', 'noveno': '9° Grado',
            'primero-bach': '1° Bachillerato', 'segundo-bach': '2° Bachillerato'
        };
        return gradesMap[grade] || grade;
    }

    getStatusClass(status) {
        const classes = {
            'presente': 'status-present',
            'ausente': 'status-absent',
            'tarde': 'status-late',
            'permiso': 'status-permit',
            'pendiente': 'status-pending'
        };
        return classes[status] || 'status-pending';
    }

    getStatusDisplayName(status) {
        const names = {
            'presente': 'Presente',
            'ausente': 'Ausente',
            'tarde': 'Tarde',
            'permiso': 'Con Permiso',
            'pendiente': 'Pendiente'
        };
        return names[status] || status;
    }

    showLoading(message) {
        const container = document.getElementById('attendance-container');
        if (container) {
            container.innerHTML = `
                <div class="no-data">
                    <div>⏳</div>
                    <h3>${message}</h3>
                </div>
            `;
        }
    }

    showNoDataMessage() {
        const container = document.getElementById('attendance-container');
        if (container) {
            container.innerHTML = `
                <div class="no-data">
                    <div>📚</div>
                    <h3>Selecciona un grado para comenzar</h3>
                    <p>Elige una fecha y grado para ver la lista de estudiantes</p>
                </div>
            `;
        }
    }

    showSuccess(message = 'Asistencia guardada correctamente') {
        this.showModal('¡Éxito!', message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    showModal(title, message, type = 'success') {
        const modal = document.getElementById('success-modal');
        if (!modal) return;

        const modalTitle = modal.querySelector('.modal-title');
        const modalMessage = modal.querySelector('.modal-message');
        const modalIcon = modal.querySelector('.modal-icon');

        const config = {
            success: { icon: '✅', color: '#27ae60' },
            error: { icon: '❌', color: '#e74c3c' },
            warning: { icon: '⚠️', color: '#f39c12' }
        }[type] || { icon: '✅', color: '#27ae60' };

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.textContent = config.icon;
        modalIcon.style.color = config.color;

        modal.classList.add('show');
    }
}

// FUNCIÓN GLOBAL PARA CERRAR MODAL
window.hideModal = function () {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// Cerrar modal al hacer clic fuera
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                window.hideModal();
            }
        });
    }
});
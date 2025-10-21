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

        this.init();
    }

    async init() {
        try {
            // Esperar a que el usuario esté autenticado
            this.currentUser = await this.getCurrentUser();

            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }

            console.log('Usuario autenticado:', this.currentUser.uid);
            await this.setupEventListeners();
            await this.loadGrades();

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

    async setupEventListeners() {
        // Selector de fecha
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

        // Selector de grado
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

        // Búsqueda
        const searchInput = document.getElementById('student-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterStudents(e.target.value));
        }
    }

    async loadGrades() {
        try {
            console.log('Cargando grados... Usuario:', this.currentUser.uid);

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

            console.log('Grados encontrados:', Array.from(grades));
            this.populateGradeSelect(Array.from(grades));

        } catch (error) {
            console.error('Error cargando grados:', error);
            this.showError('Error al cargar los grados: ' + error.message);
        }
    }

    populateGradeSelect(grades) {
        const gradeSelect = document.getElementById('attendance-grade');
        if (!gradeSelect) {
            console.error('No se encontró el elemento attendance-grade');
            return;
        }

        gradeSelect.innerHTML = '<option value="">Seleccionar grado</option>';

        const sortedGrades = this.sortGrades(grades);

        sortedGrades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = this.getGradeDisplayName(grade);
            gradeSelect.appendChild(option);
        });

        console.log('Select de grados poblado con:', sortedGrades.length, 'grados');
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
            console.log('🔍 Cargando estudiantes para grado:', this.selectedGrade);

            this.showLoading('Cargando estudiantes...');

            const studentsSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .where('grado', '==', this.selectedGrade)
                .get();

            console.log('📊 Resultado de la consulta:', studentsSnapshot.size, 'estudiantes encontrados');

            this.students = [];
            studentsSnapshot.forEach(doc => {
                const studentData = doc.data();
                console.log('👤 Estudiante RAW:', doc.id, studentData);

                // ⭐⭐ CORRECCIÓN: Usar nombreCompleto (con L) ⭐⭐
                this.students.push({
                    id: doc.id,
                    nombre: studentData.nombreCompleto || 'Estudiante sin nombre',
                    identificacion: studentData.identificacion || 'Sin identificación',
                    grado: studentData.grado,
                    activo: studentData.estado === 'activo'
                });
            });

            console.log('✅ Estudiantes procesados:', this.students);

            if (this.students.length === 0) {
                console.warn('⚠️ No se encontraron estudiantes para este grado');
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
            console.log('Cargando asistencia para:', this.selectedGrade, this.selectedDate);

            const attendanceSnapshot = await this.db.collection('asistencias')
                .where('profesorId', '==', this.currentUser.uid)
                .where('clase', '==', this.selectedGrade)
                .where('fecha', '==', this.selectedDate)
                .get();

            this.attendanceData = {};

            if (!attendanceSnapshot.empty) {
                console.log('Asistencia existente encontrada');
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
                console.log('No hay asistencia registrada para esta fecha');
                // Inicializar todos como 'pendiente'
                this.students.forEach(student => {
                    this.attendanceData[student.id] = 'pendiente';
                });
            }

        } catch (error) {
            console.error('Error cargando asistencia:', error);
            // En caso de error, inicializar todos como pendiente
            this.students.forEach(student => {
                this.attendanceData[student.id] = 'pendiente';
            });
        }
    }

    renderAttendanceTable() {
        const container = document.getElementById('attendance-container');
        if (!container) return;

        console.log('🎨 Renderizando tabla con:', this.students.length, 'estudiantes');

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
                <h3>📋 Lista de Asistencia - ${this.getGradeDisplayName(this.selectedGrade)}</h3>
                <!-- QUITAMOS LOS BOTONES DE ACCIÓN RÁPIDA DE AQUÍ -->
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
                            ✅ Presente
                        </button>
                        <button class="btn-status btn-absent" data-status="ausente" data-student="${student.id}">
                            ❌ Ausente
                        </button>
                        <button class="btn-status btn-late" data-status="tarde" data-student="${student.id}">
                            ⏰ Tarde
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
                <button id="save-attendance" class="btn btn-primary">
                    💾 Guardar Asistencia
                </button>
                <div class="summary" id="attendance-summary">
                    ${this.getSummaryText()}
                </div>
            </div>
        </div>
    `;

        container.innerHTML = html;
        this.attachEventListeners();
        this.updateSummary();
    }

    attachEventListeners() {
        // Botones de estado
        document.querySelectorAll('.btn-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.dataset.student;
                const status = e.target.dataset.status;
                this.setStudentStatus(studentId, status);
            });
        });

        // Acciones rápidas
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Guardar
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
            'all-late': 'tarde'
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
            console.log('Guardando asistencia...');

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
                tardes: this.getCountByStatus('tarde')
            };

            let savePromise;

            if (this.attendanceDocId) {
                savePromise = this.db.collection('asistencias').doc(this.attendanceDocId).update(attendanceRecord);
                console.log('Actualizando asistencia existente');
            } else {
                savePromise = this.db.collection('asistencias').add(attendanceRecord);
                console.log('Creando nueva asistencia');
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

        return `Resumen: ✅ ${present} Presente | ❌ ${absent} Ausente | ⏰ ${late} Tarde | Total: ${total}`;
    }

    filterStudents(searchTerm) {
        const rows = document.querySelectorAll('.student-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const studentName = row.querySelector('.student-name').textContent.toLowerCase();
            const studentId = row.querySelector('.student-id').textContent.toLowerCase();

            if (studentName.includes(term) || studentId.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
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
            'pendiente': 'status-pending'
        };
        return classes[status] || 'status-pending';
    }

    getStatusDisplayName(status) {
        const names = {
            'presente': 'Presente',
            'ausente': 'Ausente',
            'tarde': 'Tarde',
            'pendiente': 'Pendiente'
        };
        return names[status] || status;
    }

    // MÉTODOS DE UI
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

    // MÉTODOS DE NOTIFICACIÓN
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

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    showModal(title, message, type = 'success') {
        const modal = document.getElementById('success-modal');
        if (!modal) {
            console.error('Modal no encontrado');
            return;
        }

        const modalTitle = modal.querySelector('.modal-title');
        const modalMessage = modal.querySelector('.modal-message');
        const modalIcon = modal.querySelector('.modal-icon');

        // Configurar según el tipo
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
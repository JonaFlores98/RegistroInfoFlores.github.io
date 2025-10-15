// Gestiona todo el sistema de asistencia
class AttendanceManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.db = firebase.firestore();
        this.currentUser = dashboardManager.currentUser;
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.selectedGrade = '';
        this.attendanceData = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadGrades(); // Cargar grados disponibles
    }

    setupEventListeners() {
        // Selector de fecha
        const datePicker = document.getElementById('attendance-date');
        if (datePicker) {
            datePicker.value = this.selectedDate;
            datePicker.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.loadAttendanceData();
            });
        }

        // Selector de grado
        const gradeSelect = document.getElementById('attendance-grade');
        if (gradeSelect) {
            gradeSelect.addEventListener('change', (e) => {
                this.selectedGrade = e.target.value;
                this.loadStudentsForAttendance();
            });
        }

        // Botones de acción
        const saveBtn = document.getElementById('save-attendance');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAttendance());
        }

        const quickActions = document.querySelectorAll('.quick-action');
        quickActions.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e));
        });

        // Búsqueda de estudiantes
        const searchInput = document.getElementById('student-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterStudents(e.target.value));
        }
    }

    async loadGrades() {
        try {
            const gradesSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .get();

            const grades = new Set();
            gradesSnapshot.forEach(doc => {
                grades.add(doc.data().grado);
            });

            this.populateGradeSelect(Array.from(grades));
            
        } catch (error) {
            console.error('Error cargando grados:', error);
        }
    }

    populateGradeSelect(grades) {
        const gradeSelect = document.getElementById('attendance-grade');
        if (!gradeSelect) return;

        gradeSelect.innerHTML = '<option value="">Seleccionar grado</option>';
        
        grades.sort().forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = this.dashboard.getGradeDisplayName(grade);
            gradeSelect.appendChild(option);
        });
    }

    async loadStudentsForAttendance() {
        if (!this.selectedGrade) return;

        try {
            const studentsSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .where('grado', '==', this.selectedGrade)
                .orderBy('nombre')
                .get();

            this.students = [];
            studentsSnapshot.forEach(doc => {
                this.students.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Cargar asistencia existente para esta fecha y grado
            await this.loadAttendanceData();
            this.renderAttendanceTable();
            
        } catch (error) {
            console.error('Error cargando estudiantes:', error);
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
                    data.estudiantes.forEach(student => {
                        this.attendanceData[student.id] = student.estado;
                    });
                });
            }
            
        } catch (error) {
            console.error('Error cargando datos de asistencia:', error);
        }
    }

    renderAttendanceTable() {
        const container = document.getElementById('attendance-container');
        if (!container) return;

        if (this.students.length === 0) {
            container.innerHTML = '<p class="no-students">No hay estudiantes en este grado.</p>';
            return;
        }

        let html = `
            <div class="attendance-header">
                <h3>Asistencia - ${this.dashboard.getGradeDisplayName(this.selectedGrade)}</h3>
                <div class="attendance-actions">
                    <button class="btn btn-primary quick-action" data-action="all-present">
                        Todos Presente
                    </button>
                    <button class="btn btn-secondary quick-action" data-action="all-absent">
                        Todos Ausente
                    </button>
                    <button class="btn btn-warning quick-action" data-action="all-late">
                        Todos Tarde
                    </button>
                </div>
            </div>
            <div class="attendance-table-container">
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.students.forEach(student => {
            const currentStatus = this.attendanceData[student.id] || 'pendiente';
            const statusClass = this.getStatusClass(currentStatus);
            
            html += `
                <tr class="student-row" data-student-id="${student.id}">
                    <td>
                        <div class="student-info">
                            <span class="student-name">${student.nombre}</span>
                            <span class="student-id">${student.identificacion || ''}</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}" id="status-${student.id}">
                            ${this.getStatusDisplayName(currentStatus)}
                        </span>
                    </td>
                    <td>
                        <div class="attendance-actions">
                            <button class="btn-status btn-present" data-status="presente" data-student="${student.id}">
                                Presente
                            </button>
                            <button class="btn-status btn-absent" data-status="ausente" data-student="${student.id}">
                                Ausente
                            </button>
                            <button class="btn-status btn-late" data-status="tarde" data-student="${student.id}">
                                Tarde
                            </button>
                            <button class="btn-status btn-justified" data-status="justificado" data-student="${student.id}">
                                Justificado
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
                <button id="save-attendance" class="btn btn-success">
                    💾 Guardar Asistencia
                </button>
                <span class="attendance-summary" id="attendance-summary"></span>
            </div>
        `;

        container.innerHTML = html;
        this.attachStudentEventListeners();
        this.updateSummary();
    }

    attachStudentEventListeners() {
        // Botones de estado individual
        const statusButtons = document.querySelectorAll('.btn-status');
        statusButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.dataset.student;
                const status = e.target.dataset.status;
                this.setStudentStatus(studentId, status);
            });
        });

        // Botones de acción rápida (ya están configurados en setupEventListeners)
    }

    setStudentStatus(studentId, status) {
        this.attendanceData[studentId] = status;
        
        // Actualizar UI
        const statusElement = document.getElementById(`status-${studentId}`);
        if (statusElement) {
            statusElement.textContent = this.getStatusDisplayName(status);
            statusElement.className = `status-badge ${this.getStatusClass(status)}`;
        }
        
        this.updateSummary();
    }

    handleQuickAction(e) {
        const action = e.target.dataset.action;
        const statusMap = {
            'all-present': 'presente',
            'all-absent': 'ausente', 
            'all-late': 'tarde',
            'all-justified': 'justificado'
        };

        const status = statusMap[action];
        if (status) {
            this.students.forEach(student => {
                this.attendanceData[student.id] = status;
            });
            this.renderAttendanceTable(); // Re-render para actualizar todo
        }
    }

    async saveAttendance() {
        if (!this.selectedGrade || !this.students) {
            alert('Por favor selecciona un grado primero.');
            return;
        }

        try {
            const attendanceRecord = {
                profesorId: this.currentUser.uid,
                clase: this.selectedGrade,
                fecha: this.selectedDate,
                estudiantes: this.students.map(student => ({
                    id: student.id,
                    nombre: student.nombre,
                    estado: this.attendanceData[student.id] || 'ausente'
                })),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                totalEstudiantes: this.students.length,
                presentes: this.getCountByStatus('presente'),
                ausentes: this.getCountByStatus('ausente'),
                tardes: this.getCountByStatus('tarde'),
                justificados: this.getCountByStatus('justificado')
            };

            // Buscar si ya existe un registro para esta fecha y grado
            const existingQuery = await this.db.collection('asistencias')
                .where('profesorId', '==', this.currentUser.uid)
                .where('clase', '==', this.selectedGrade)
                .where('fecha', '==', this.selectedDate)
                .get();

            let savePromise;
            if (!existingQuery.empty) {
                // Actualizar registro existente
                const docId = existingQuery.docs[0].id;
                savePromise = this.db.collection('asistencias').doc(docId).update(attendanceRecord);
            } else {
                // Crear nuevo registro
                savePromise = this.db.collection('asistencias').add(attendanceRecord);
            }

            await savePromise;
            
            // Mostrar confirmación
            this.showSuccessMessage('Asistencia guardada correctamente');
            
            // Actualizar dashboard
            this.dashboard.loadAttendanceStats();
            this.dashboard.loadRecentActivity();
            
        } catch (error) {
            console.error('Error guardando asistencia:', error);
            this.showErrorMessage('Error al guardar la asistencia: ' + error.message);
        }
    }

    getCountByStatus(status) {
        return Object.values(this.attendanceData).filter(s => s === status).length;
    }

    updateSummary() {
        const summaryElement = document.getElementById('attendance-summary');
        if (!summaryElement) return;

        const total = this.students.length;
        const present = this.getCountByStatus('presente');
        const absent = this.getCountByStatus('ausente');
        const late = this.getCountByStatus('tarde');
        const justified = this.getCountByStatus('justificado');

        summaryElement.innerHTML = `
            <strong>Resumen:</strong> 
            ✅ ${present} | ❌ ${absent} | ⏰ ${late} | 📝 ${justified} | Total: ${total}
        `;
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

    getStatusClass(status) {
        const classes = {
            'presente': 'status-present',
            'ausente': 'status-absent', 
            'tarde': 'status-late',
            'justificado': 'status-justified',
            'pendiente': 'status-pending'
        };
        return classes[status] || 'status-pending';
    }

    getStatusDisplayName(status) {
        const names = {
            'presente': 'Presente',
            'ausente': 'Ausente',
            'tarde': 'Llegó Tarde', 
            'justificado': 'Justificado',
            'pendiente': 'Pendiente'
        };
        return names[status] || status;
    }

    showSuccessMessage(message) {
        // Implementar notificación de éxito
        alert(message); // Puedes reemplazar con un sistema de notificaciones bonito
    }

    showErrorMessage(message) {
        alert(message); // Puedes reemplazar con un sistema de notificaciones bonito
    }
}
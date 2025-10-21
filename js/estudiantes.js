// Gestión de Estudiantes
class StudentsManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userData = null;
        this.students = [];
        this.filteredStudents = [];
        this.editingStudent = null;
        this.studentToDelete = null;
        this.init();
    }

    init() {
        this.setupAuthListener();
        this.setupMobileMenu(); // Nueva función para el menú móvil
    }

    // NUEVO: Configuración del menú móvil
    setupMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const menuClose = document.getElementById('mobile-menu-close');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileOverlay = document.getElementById('mobile-menu-overlay');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.add('active');
                mobileOverlay.classList.add('active');
            });

            menuClose.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileOverlay.classList.remove('active');
            });

            // Cerrar menú al hacer clic en el overlay
            mobileOverlay.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileOverlay.classList.remove('active');
            });

            // Cerrar menú al hacer clic en un enlace
            const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    mobileMenu.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                });
            });
        }

        // Configurar logout móvil
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../login.html';
            } else {
                this.currentUser = user;
                await this.loadUserInfo(user);
                this.setupEventListeners();
                await this.loadStudents();
                this.setupGradesFilter();
            }
        });
    }

    async loadUserInfo(user) {
        const userNameElement = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        const mobileUserAvatar = document.getElementById('mobile-user-avatar');

        try {
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                this.userData = userDoc.data();
                if (this.userData.nombreCompleto) {
                    if (userNameElement) {
                        userNameElement.textContent = this.userData.nombreCompleto;
                    }
                    if (userAvatar) {
                        userAvatar.textContent = this.userData.nombreCompleto.charAt(0).toUpperCase();
                    }
                    if (mobileUserAvatar) {
                        mobileUserAvatar.textContent = this.userData.nombreCompleto.charAt(0).toUpperCase();
                    }
                }
            }
        } catch (error) {
            console.error('Error cargando información del usuario:', error);
        }
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');

        // Botones principales
        document.getElementById('add-student-btn').addEventListener('click', () => this.showModal());
        document.getElementById('empty-add-btn').addEventListener('click', () => this.showModal());

        // Modal principal
        document.getElementById('close-modal').addEventListener('click', () => this.hideModal());
        document.getElementById('cancel-btn').addEventListener('click', () => this.hideModal());
        document.getElementById('student-form').addEventListener('submit', (e) => this.handleSubmit(e));

        // Modal de confirmación de eliminación
        document.getElementById('close-delete-modal').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('cancel-delete').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('confirm-delete').addEventListener('click', () => this.confirmDelete());

        // Búsqueda y filtros
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('grade-filter').addEventListener('change', (e) => this.handleGradeFilter(e.target.value));

        // Cerrar modales al hacer clic fuera
        document.getElementById('student-modal').addEventListener('click', (e) => {
            if (e.target.id === 'student-modal') this.hideModal();
        });
        document.getElementById('delete-confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'delete-confirm-modal') this.hideDeleteModal();
        });

        // Logout (desktop)
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    }

    // NUEVO: Manejo de logout
    async handleLogout() {
        try {
            await this.auth.signOut();
            window.location.href = '../login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión: ' + error.message);
        }
    }

    // Resto del código se mantiene igual...
    handleFirebaseError(error, context) {
        console.error(`Error en ${context}:`, error);

        if (error.code === 'failed-precondition') {
            console.log(`Índice requerido para: ${context}`);
            return true;
        }

        if (error.code === 'permission-denied') {
            alert('No tienes permisos para realizar esta acción');
            return true;
        }

        return false;
    }

    async loadStudents() {
        try {
            console.log('Cargando estudiantes...');

            const studentsSnapshot = await this.db.collection('estudiantes')
                .where('profesorId', '==', this.currentUser.uid)
                .get();

            this.students = [];
            studentsSnapshot.forEach(doc => {
                console.log('Estudiante encontrado:', doc.data().nombreCompleto);
                this.students.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Total estudiantes cargados: ${this.students.length}`);

            this.students.sort((a, b) => {
                const nameA = a.nombreCompleto || '';
                const nameB = b.nombreCompleto || '';
                return nameA.localeCompare(nameB);
            });

            this.filteredStudents = [...this.students];
            this.renderStudents();
            this.updateStudentsCount();

        } catch (error) {
            console.error('Error crítico cargando estudiantes:', error);

            this.students = [];
            this.filteredStudents = [];
            this.renderStudents();
            this.updateStudentsCount();

            if (!error.message.includes('index') && !error.code === 'failed-precondition') {
                alert('Error al cargar estudiantes: ' + error.message);
            }
        }
    }

    setupGradesFilter() {
        if (!this.userData || !this.userData.grades) return;

        const gradeFilter = document.getElementById('grade-filter');
        const gradoSelect = document.getElementById('grado');

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

        while (gradeFilter.children.length > 1) gradeFilter.removeChild(gradeFilter.lastChild);
        while (gradoSelect.children.length > 1) gradoSelect.removeChild(gradoSelect.lastChild);

        this.userData.grades.forEach(gradeKey => {
            const gradeName = gradesMap[gradeKey];
            if (gradeName) {
                const option1 = document.createElement('option');
                option1.value = gradeKey;
                option1.textContent = gradeName;
                gradeFilter.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = gradeKey;
                option2.textContent = gradeName;
                gradoSelect.appendChild(option2);
            }
        });
    }

    renderStudents() {
        const container = document.getElementById('students-container');

        if (this.filteredStudents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No se encontraron estudiantes</h3>
                    <p>Intenta con otros términos de búsqueda o agrega un nuevo estudiante</p>
                    <button class="btn btn-primary" id="empty-add-btn-2">
                        <i class="fas fa-user-plus"></i> Agregar Estudiante
                    </button>
                </div>
            `;
            document.getElementById('empty-add-btn-2').addEventListener('click', () => this.showModal());
            return;
        }

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

        container.innerHTML = `
            <div class="students-grid">
                ${this.filteredStudents.map(student => `
                    <div class="student-card">
                        <div class="student-header">
                            <div style="flex: 1;">
                                <div class="student-name">${student.nombreCompleto}</div>
                                <div class="student-grade">
                                    <i class="fas fa-graduation-cap"></i>
                                    ${gradesMap[student.grado] || student.grado}
                                </div>
                            </div>
                            <div class="student-avatar">
                                ${this.getInitials(student.nombreCompleto)}
                            </div>
                        </div>
                        
                        <div class="student-info">
                            ${student.codigo ? `
                                <div class="info-item">
                                    <i class="fas fa-id-card"></i>
                                    <span>${student.codigo}</span>
                                </div>
                            ` : ''}
                            
                            ${student.encargado ? `
                                <div class="info-item">
                                    <i class="fas fa-user"></i>
                                    <span>Encargado: ${student.encargado}</span>
                                </div>
                            ` : ''}
                            
                            ${student.telefono ? `
                                <div class="info-item">
                                    <i class="fas fa-phone"></i>
                                    <span>${student.telefono}</span>
                                </div>
                            ` : ''}
                            
                            ${student.observaciones ? `
                                <div class="info-item">
                                    <i class="fas fa-sticky-note"></i>
                                    <span>${student.observaciones}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="student-actions">
                            <button class="btn btn-success btn-sm edit-btn" data-id="${student.id}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${student.id}">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
                const studentId = e.target.closest('.edit-btn').dataset.id;
                this.editStudent(studentId);
            }
            if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                const studentId = e.target.closest('.delete-btn').dataset.id;
                this.deleteStudent(studentId);
            }
        });
    }

    getInitials(fullName) {
        return fullName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    showModal(student = null) {
        console.log('Mostrando modal...');
        this.editingStudent = student;
        const modal = document.getElementById('student-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('student-form');

        if (student) {
            title.textContent = 'Editar Estudiante';
            this.populateForm(student);
        } else {
            title.textContent = 'Agregar Estudiante';
            form.reset();
        }

        modal.style.display = 'block';
    }

    hideModal() {
        document.getElementById('student-modal').style.display = 'none';
        this.editingStudent = null;
        document.getElementById('student-form').reset();
    }

    populateForm(student) {
        document.getElementById('nombre-completo').value = student.nombreCompleto || '';
        document.getElementById('grado').value = student.grado || '';
        document.getElementById('codigo').value = student.codigo || '';
        document.getElementById('fecha-nacimiento').value = student.fechaNacimiento || '';
        document.getElementById('genero').value = student.genero || '';
        document.getElementById('encargado').value = student.encargado || '';
        document.getElementById('telefono').value = student.telefono || '';
        document.getElementById('email').value = student.emailEncargado || '';
        document.getElementById('observaciones').value = student.observaciones || '';
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            submitBtn.disabled = true;

            const studentData = {
                nombreCompleto: document.getElementById('nombre-completo').value.trim(),
                grado: document.getElementById('grado').value,
                codigo: document.getElementById('codigo').value.trim() || '',
                fechaNacimiento: document.getElementById('fecha-nacimiento').value || '',
                genero: document.getElementById('genero').value || '',
                encargado: document.getElementById('encargado').value.trim() || '',
                telefono: document.getElementById('telefono').value.trim() || '',
                emailEncargado: document.getElementById('email').value.trim() || '',
                observaciones: document.getElementById('observaciones').value.trim() || '',
                profesorId: this.currentUser.uid,
                fechaRegistro: this.editingStudent ?
                    this.editingStudent.fechaRegistro :
                    new Date().toISOString().split('T')[0],
                estado: 'activo'
            };

            if (!studentData.nombreCompleto || !studentData.grado) {
                throw new Error('Nombre completo y grado son obligatorios');
            }

            if (this.editingStudent) {
                await this.db.collection('estudiantes').doc(this.editingStudent.id).update(studentData);
            } else {
                await this.db.collection('estudiantes').add(studentData);
            }

            this.hideModal();
            await this.loadStudents();

        } catch (error) {
            alert('Error al guardar estudiante: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async editStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.showModal(student);
        }
    }

    async deleteStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.studentToDelete = student;
            this.showDeleteModal(student);
        }
    }

    showDeleteModal(student) {
        const modal = document.getElementById('delete-confirm-modal');
        const message = document.getElementById('delete-message');

        message.textContent = `¿Estás seguro de que quieres eliminar a "${student.nombreCompleto}"? Esta acción no se puede deshacer.`;

        modal.style.display = 'block';
    }

    hideDeleteModal() {
        document.getElementById('delete-confirm-modal').style.display = 'none';
        this.studentToDelete = null;
    }

    async confirmDelete() {
        if (!this.studentToDelete) return;

        const studentId = this.studentToDelete.id;
        const studentName = this.studentToDelete.nombreCompleto;

        try {
            const confirmBtn = document.getElementById('confirm-delete');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
            confirmBtn.disabled = true;

            await this.db.collection('estudiantes').doc(studentId).delete();

            this.hideDeleteModal();
            this.showSuccessMessage(`Estudiante "${studentName}" eliminado correctamente`);

            await this.loadStudents();

        } catch (error) {
            console.error('Error al eliminar estudiante:', error);
            alert('Error al eliminar estudiante: ' + error.message);

            const confirmBtn = document.getElementById('confirm-delete');
            confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Sí, Eliminar';
            confirmBtn.disabled = false;
        }
    }

    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease-out;
        `;

        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => successDiv.remove(), 300);
            }
        }, 3000);
    }

    handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (term === '') {
            this.filteredStudents = [...this.students];
        } else {
            this.filteredStudents = this.students.filter(student =>
                student.nombreCompleto.toLowerCase().includes(term) ||
                (student.codigo && student.codigo.toLowerCase().includes(term)) ||
                (student.encargado && student.encargado.toLowerCase().includes(term))
            );
        }

        this.renderStudents();
        this.updateStudentsCount();
    }

    handleGradeFilter(grade) {
        if (grade === '') {
            this.filteredStudents = [...this.students];
        } else {
            this.filteredStudents = this.students.filter(student =>
                student.grado === grade
            );
        }

        this.renderStudents();
        this.updateStudentsCount();
    }

    updateStudentsCount() {
        const countElement = document.getElementById('students-count');
        const total = this.students.length;
        const filtered = this.filteredStudents.length;

        if (total === filtered) {
            countElement.textContent = `${total} estudiante${total !== 1 ? 's' : ''}`;
        } else {
            countElement.textContent = `${filtered} de ${total} estudiantes`;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('estudiantes.html')) {
        window.studentsManager = new StudentsManager();
    }
});
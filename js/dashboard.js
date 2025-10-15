// Dashboard functionality
class DashboardManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.addEventListeners();
    }

    addEventListeners() {
        // Add any dashboard-specific event listeners here
    }

    loadDashboardData() {
        // Simulate loading data (in real app, this would come from Firebase)
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
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        window.dashboardManager = new DashboardManager();
    }
});
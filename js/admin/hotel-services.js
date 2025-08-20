// js/admin/hotel-services.js - Hotel Services Management
class HotelServicesManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.services = [];
        this.currentEditId = null;
        this.init();
    }
    
    async init() {
        try {
            // Check authentication
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Load services
            await this.loadServices();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Hotel services manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize hotel services manager:', error);
            this.showError('Failed to initialize hotel services manager: ' + error.message);
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/check.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Authentication check failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.authenticated) {
                window.location.href = `${this.baseURL}/api/auth/login.html`;
                return false;
            }
            
            // Update admin name
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl && result.user) {
                const userName = result.user.name || `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || 'Admin User';
                adminNameEl.textContent = userName;
            }
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showError('Authentication failed. Please refresh the page.');
            return false;
        }
    }
    
    async loadServices() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/utilities/hotel-services.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load hotel services: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load hotel services');
            }
            
            this.services = data.services || [];
            this.renderServices();
            this.updateStats();
            
        } catch (error) {
            console.error('Failed to load hotel services:', error);
            this.showError('Failed to load hotel services: ' + error.message);
            this.renderEmptyState();
        }
    }
    
    renderServices() {
        const container = document.getElementById('servicesContainer');
        if (!container) return;
        
        if (this.services.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.services.map(service => {
            // Safely handle the price value
            let price = 0;
            try {
                price = parseFloat(service.fee || 0);
                if (isNaN(price)) price = 0;
            } catch (e) {
                console.warn('Invalid price for service:', service.service_id, service.fee);
                price = 0;
            }

            const isComplimentary = service.is_complimentary;
            const feeDisplay = isComplimentary ? 'Complimentary' : `₱${price.toLocaleString()}`;
            const cardColor = isComplimentary ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50';
            
            return `
                <div class="service-card bg-white border ${cardColor} rounded-lg p-4 hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800">${service.service_name}</h3>
                            ${service.description ? `<p class="text-sm text-gray-600 mt-1">${service.description}</p>` : ''}
                        </div>
                        <div class="flex space-x-2 ml-4">
                            <button onclick="hotelServicesManager.editService(${service.service_id})" 
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Edit Service">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="hotelServicesManager.deleteService(${service.service_id})" 
                                    class="text-red-600 hover:text-red-800 p-1" title="Delete Service">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <span class="text-lg font-bold text-gray-800">${feeDisplay}</span>
                            ${isComplimentary ? 
                                '<span class="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full">Free</span>' :
                                '<span class="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 rounded-full">Paid</span>'
                            }
                        </div>
                        <div class="text-sm text-gray-500">
                            <i class="fas fa-chart-line mr-1"></i>
                            ${service.usage_count || 0} orders
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add fade-in animation
        container.classList.add('fade-in');
        setTimeout(() => container.classList.remove('fade-in'), 300);
    }
    
    renderEmptyState() {
        const container = document.getElementById('servicesContainer');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-concierge-bell text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg mb-2">No services found</p>
                    <p class="text-gray-400 text-sm mb-4">Start by adding hotel services for your guests</p>
                    <button onclick="hotelServicesManager.showAddModal()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Service
                    </button>
                </div>
            `;
        }
    }
    
    updateStats() {
        const stats = {
            total: this.services.length,
            complimentary: this.services.filter(s => s.is_complimentary).length,
            paid: this.services.filter(s => !s.is_complimentary).length,
            totalUsage: this.services.reduce((sum, s) => sum + (s.usage_count || 0), 0)
        };
        
        // Update DOM elements safely
        const elements = [
            { id: 'totalServices', value: stats.total },
            { id: 'complimentaryServices', value: stats.complimentary },
            { id: 'paidServices', value: stats.paid },
            { id: 'totalUsage', value: stats.totalUsage }
        ];
        
        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    setupEventListeners() {
        // Add service button
        const addBtn = document.getElementById('addServiceBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
        
        // Modal events
        this.setupModalEvents();
        
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }
    
    setupModalEvents() {
        const modal = document.getElementById('serviceModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModal());
            }
        });
        
        // Click outside modal to close
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
        
        // Form submission
        const form = document.getElementById('serviceForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveService();
            });
        }
        
        // Complimentary checkbox change
        const complimentaryCheckbox = document.getElementById('isComplimentary');
        const feeInput = document.getElementById('serviceFee');
        
        if (complimentaryCheckbox && feeInput) {
            complimentaryCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    feeInput.value = '0.00';
                    feeInput.disabled = true;
                } else {
                    feeInput.disabled = false;
                    feeInput.focus();
                }
            });
        }
    }
    
    showAddModal() {
        this.currentEditId = null;
        const modalTitle = document.getElementById('modalTitle');
        const serviceForm = document.getElementById('serviceForm');
        const serviceId = document.getElementById('serviceId');
        const feeInput = document.getElementById('serviceFee');
        
        if (modalTitle) modalTitle.textContent = 'Add New Service';
        if (serviceForm) serviceForm.reset();
        if (serviceId) serviceId.value = '';
        if (feeInput) {
            feeInput.value = '0.00';
            feeInput.disabled = false;
        }
        
        this.showModal();
    }
    
    editService(serviceId) {
        const service = this.services.find(s => s.service_id == serviceId);
        if (!service) return;
        
        this.currentEditId = serviceId;
        
        // Safely parse the fee
        let fee = 0;
        try {
            fee = parseFloat(service.fee || 0);
            if (isNaN(fee)) fee = 0;
        } catch (e) {
            console.warn('Invalid fee for service:', serviceId, service.fee);
            fee = 0;
        }

        const elements = [
            { id: 'modalTitle', value: 'Edit Service', prop: 'textContent' },
            { id: 'serviceId', value: service.service_id, prop: 'value' },
            { id: 'serviceName', value: service.service_name, prop: 'value' },
            { id: 'serviceDescription', value: service.description, prop: 'value' },
            { id: 'serviceFee', value: fee.toFixed(2), prop: 'value' },
            { id: 'isComplimentary', value: service.is_complimentary, prop: 'checked' }
        ];
        
        elements.forEach(({ id, value, prop }) => {
            const element = document.getElementById(id);
            if (element) {
                element[prop] = value;
            }
        });
        
        // Handle fee input state
        const feeInput = document.getElementById('serviceFee');
        if (feeInput) {
            feeInput.disabled = service.is_complimentary;
        }
        
        this.showModal();
    }
    
    async deleteService(serviceId) {
        const service = this.services.find(s => s.service_id == serviceId);
        if (!service) return;
        
        if (service.usage_count > 0) {
            this.showError('Cannot delete service that has been used in requests');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${service.service_name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/utilities/hotel-services.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ service_id: serviceId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete service');
            }
            
            this.showSuccess('Service deleted successfully');
            await this.loadServices();
            
        } catch (error) {
            console.error('Failed to delete service:', error);
            this.showError('Failed to delete service: ' + error.message);
        }
    }
    
    async saveService() {
        try {
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            // Disable button and show loading
            if (saveBtn) saveBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            
            const formData = {
                service_name: this.getElementValue('serviceName').trim(),
                description: this.getElementValue('serviceDescription').trim(),
                fee: parseFloat(this.getElementValue('serviceFee')) || 0,
                is_complimentary: document.getElementById('isComplimentary')?.checked || false
            };
            
            // Validation
            if (!formData.service_name) {
                throw new Error('Please enter a service name');
            }
            
            if (formData.fee < 0) {
                throw new Error('Fee cannot be negative');
            }
            
            // If complimentary, set fee to 0
            if (formData.is_complimentary) {
                formData.fee = 0;
            }
            
            const isEdit = this.currentEditId !== null;
            if (isEdit) {
                formData.service_id = this.currentEditId;
            }
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/utilities/hotel-services.php`, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save service');
            }
            
            this.showSuccess(`Service ${isEdit ? 'updated' : 'created'} successfully`);
            this.hideModal();
            await this.loadServices();
            
        } catch (error) {
            console.error('Failed to save service:', error);
            this.showError('Failed to save service: ' + error.message);
        } finally {
            // Re-enable button
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            if (saveBtn) saveBtn.disabled = false;
            if (saveBtnText) saveBtnText.textContent = 'Save Service';
        }
    }
    
    getElementValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }
    
    showModal() {
        const modal = document.getElementById('serviceModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    hideModal() {
        const modal = document.getElementById('serviceModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        this.currentEditId = null;
    }
    
    async handleLogout() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/logout.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'
            });
            
            window.location.href = `${this.baseURL}/api/auth/login.html`;
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = `${this.baseURL}/api/auth/login.html`;
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded shadow-lg z-50 max-w-md border`;
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="whitespace-pre-line">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize hotel services manager when DOM is loaded
let hotelServicesManager;

document.addEventListener('DOMContentLoaded', () => {
    hotelServicesManager = new HotelServicesManager();
});
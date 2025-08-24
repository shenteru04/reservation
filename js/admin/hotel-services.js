// js/admin/hotel-services.js - Hotel Services Management with Axios

class HotelServicesManager extends BaseManager {
    constructor() {
        super('HotelServicesManager');
        this.services = [];
        this.currentEditId = null;
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing hotel services manager...');
            
            // Hide loading overlay first
            this.hideLoadingOverlay();
            
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
            this.hideLoadingOverlay();
        }
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    async loadServices() {
        try {
            console.log('Loading hotel services...');
            
            const response = await this.api.get('/api/admin/pages/utilities/hotel-services.php');
            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load hotel services');
            }
            
            this.services = data.services || [];
            console.log('Loaded services:', this.services);
            
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
                price = parseFloat(service.price || 0);
                if (isNaN(price)) price = 0;
            } catch (e) {
                console.warn('Invalid price for service:', service.service_id, service.price);
                price = 0;
            }

            const isComplimentary = service.is_complimentary;
            const priceDisplay = isComplimentary ? 'Complimentary' : this.formatCurrency(price);
            const cardColor = isComplimentary ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50';
            
            return `
                <div class="service-card bg-white border ${cardColor} rounded-lg p-4 hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800">${this.escapeHtml(service.service_name)}</h3>
                            ${service.description ? `<p class="text-sm text-gray-600 mt-1">${this.escapeHtml(service.description)}</p>` : ''}
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
                            <span class="text-lg font-bold text-gray-800">${priceDisplay}</span>
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
        
        // Setup common event listeners (logout, etc.)
        this.setupCommonEventListeners();
        
        // Clock update
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }
    
    updateClock() {
        const clockElement = document.getElementById('currentDateTime');
        if (clockElement) {
            const now = new Date();
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            clockElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    
    setupModalEvents() {
        const modal = document.getElementById('serviceModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModal('serviceModal'));
            }
        });
        
        // Click outside modal to close
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal('serviceModal');
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
        const priceInput = document.getElementById('serviceFee');
        
        if (complimentaryCheckbox && priceInput) {
            complimentaryCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    priceInput.value = '0.00';
                    priceInput.disabled = true;
                } else {
                    priceInput.disabled = false;
                    priceInput.focus();
                }
            });
        }
    }
    
    showAddModal() {
        this.currentEditId = null;
        const modalTitle = document.getElementById('modalTitle');
        const serviceForm = document.getElementById('serviceForm');
        const serviceId = document.getElementById('serviceId');
        const priceInput = document.getElementById('serviceFee');
        const complimentaryCheckbox = document.getElementById('isComplimentary');
        
        if (modalTitle) modalTitle.textContent = 'Add New Service';
        if (serviceForm) serviceForm.reset();
        if (serviceId) serviceId.value = '';
        if (priceInput) {
            priceInput.value = '0.00';
            priceInput.disabled = false;
        }
        if (complimentaryCheckbox) {
            complimentaryCheckbox.checked = false;
        }
        
        this.showModal('serviceModal');
    }
    
    editService(serviceId) {
        const service = this.services.find(s => s.service_id == serviceId);
        if (!service) return;
        
        this.currentEditId = serviceId;
        
        // Safely parse the fee
        let price = 0;
        try {
            price = parseFloat(service.price || 0);
            if (isNaN(price)) price = 0;
        } catch (e) {
            console.warn('Invalid price for service:', serviceId, service.price);
            price = 0;
        }

        const elements = [
            { id: 'modalTitle', value: 'Edit Service', prop: 'textContent' },
            { id: 'serviceId', value: service.service_id, prop: 'value' },
            { id: 'serviceName', value: service.service_name, prop: 'value' },
            { id: 'serviceDescription', value: service.description || '', prop: 'value' },
            { id: 'serviceFee', value: price.toFixed(2), prop: 'value' },
            { id: 'isComplimentary', value: service.is_complimentary, prop: 'checked' }
        ];
        
        elements.forEach(({ id, value, prop }) => {
            const element = document.getElementById(id);
            if (element) {
                element[prop] = value;
            }
        });
        
        // Handle fee input state
        const priceInput = document.getElementById('serviceFee');
        if (priceInput) {
            priceInput.disabled = service.is_complimentary;
        }
        
        this.showModal('serviceModal');
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
            console.log('Deleting service:', serviceId);
            
            await this.api.delete('/api/admin/pages/utilities/hotel-services.php', {
                data: { service_id: serviceId }
            });
            
            this.showSuccess('Service deleted successfully');
            await this.loadServices();
            
        } catch (error) {
            console.error('Failed to delete service:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to delete service: ' + errorMessage);
        }
    }
    
    async saveService() {
        try {
            console.log('Saving service...');
            
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            // Disable button and show loading
            if (saveBtn) saveBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            
            // Get form data
            const serviceName = this.getElementValue('serviceName').trim();
            const description = this.getElementValue('serviceDescription').trim();
            const isComplimentary = document.getElementById('isComplimentary')?.checked || false;
            let price = 0;
            
            if (!isComplimentary) {
                price = parseFloat(this.getElementValue('serviceFee')) || 0;
            }
            
            const formData = {
                service_name: serviceName,
                description: description,
                price: price,
                is_complimentary: isComplimentary
            };
            
            console.log('Form data:', formData);
            
            // Validation
            if (!formData.service_name) {
                throw new Error('Please enter a service name');
            }
            
            if (formData.price < 0) {
                throw new Error('Fee cannot be negative');
            }
            
            const isEdit = this.currentEditId !== null;
            if (isEdit) {
                formData.service_id = this.currentEditId;
            }
            
            console.log('Sending request:', isEdit ? 'PUT' : 'POST', formData);
            
            const response = isEdit 
                ? await this.api.put('/api/admin/pages/utilities/hotel-services.php', formData)
                : await this.api.post('/api/admin/pages/utilities/hotel-services.php', formData);
            
            const result = response.data;
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save service');
            }
            
            this.showSuccess(`Service ${isEdit ? 'updated' : 'created'} successfully`);
            this.hideModal('serviceModal');
            await this.loadServices();
            
        } catch (error) {
            console.error('Failed to save service:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to save service: ' + errorMessage);
        } finally {
            // Re-enable button
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            if (saveBtn) saveBtn.disabled = false;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fas fa-save"></i><span>Save Service</span>';
        }
    }
    
    getElementValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }
}

// Initialize hotel services manager when DOM is loaded
let hotelServicesManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing hotel services manager...');
    hotelServicesManager = new HotelServicesManager();
});
// js/admin/room-types.js - Room Types Management with Default Images
class RoomTypesManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.roomTypes = [];
        this.currentEditId = null;
        
        // Default images for different room types
        this.defaultImages = {
    room: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop&crop=center',
    deluxe: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop&crop=center',
    suite: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop&crop=center',
    standard: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=400&h=300&fit=crop&crop=center',
    single: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&h=300&fit=crop&crop=center',
    double: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop&crop=center',
      family: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&crop=center'
};
        
        this.init();
    }
    
    // Get appropriate default image based on room type name
    getDefaultImageForRoomType(typeName) {
        if (!typeName) return this.defaultImages.room;
        
        const lowerTypeName = typeName.toLowerCase();
        
        // Check for specific keywords in the type name
        if (lowerTypeName.includes('deluxe')) return this.defaultImages.deluxe;
        if (lowerTypeName.includes('suite')) return this.defaultImages.suite;
        if (lowerTypeName.includes('standard')) return this.defaultImages.standard;
        if (lowerTypeName.includes('single')) return this.defaultImages.single;
        if (lowerTypeName.includes('double')) return this.defaultImages.double;
        if (lowerTypeName.includes('family')) return this.defaultImages.family;
        
        // Default fallback
        return this.defaultImages.room;
    }
    
    async init() {
        try {
            // Check authentication
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Load room types
            await this.loadRoomTypes();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Room types manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize room types manager:', error);
            this.showError('Failed to initialize room types manager: ' + error.message);
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
    
    async loadRoomTypes() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/room-types.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load room types: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load room types');
            }
            
            this.roomTypes = data.roomTypes || [];
            this.renderRoomTypes();
            this.updateTotalCount();
            
        } catch (error) {
            console.error('Failed to load room types:', error);
            this.showError('Failed to load room types: ' + error.message);
            this.renderEmptyState();
        }
    }
    
    renderRoomTypes() {
        const container = document.getElementById('roomTypesContainer');
        if (!container) return;
        
        if (this.roomTypes.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.roomTypes.map(type => this.createRoomTypeCard(type)).join('');
    }
    
    createRoomTypeCard(type) {
        // Get the appropriate image for this room type
        const imageUrl = type.image_url || this.getDefaultImageForRoomType(type.type_name);
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <!-- Room Type Image -->
                <div class="h-48 bg-gray-200 overflow-hidden">
                    <img src="${imageUrl}" 
                         alt="${type.type_name}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='${this.defaultImages.room}'; this.onerror=null;">
                </div>
                
                <!-- Room Type Content -->
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800">${type.type_name}</h3>
                            <p class="text-sm text-gray-500 mt-1">${type.room_count} rooms using this type</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="roomTypesManager.editRoomType(${type.room_type_id})" 
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Edit Room Type">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="roomTypesManager.deleteRoomType(${type.room_type_id})" 
                                    class="text-red-600 hover:text-red-800 p-1" title="Delete Room Type"
                                    ${type.room_count > 0 ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Price per Night:</span>
                            <span class="text-lg font-semibold text-green-600">₱${parseFloat(type.price_per_night).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Capacity:</span>
                            <span class="text-sm font-medium">${type.capacity} guest${type.capacity > 1 ? 's' : ''}</span>
                        </div>
                        ${type.description ? `
                            <div class="mt-3 pt-3 border-t border-gray-100">
                                <p class="text-sm text-gray-600 line-clamp-2">${type.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderEmptyState() {
        const container = document.getElementById('roomTypesContainer');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-home text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg mb-2">No room types found</p>
                    <p class="text-gray-400 text-sm mb-4">Start by adding your first room type</p>
                    <button onclick="roomTypesManager.showAddModal()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Room Type
                    </button>
                </div>
            `;
        }
    }
    
    updateTotalCount() {
        const totalEl = document.getElementById('totalTypesCount');
        if (totalEl) {
            totalEl.textContent = this.roomTypes.length;
        }
    }
    
    setupEventListeners() {
        // Add room type button
        const addBtn = document.getElementById('addRoomTypeBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
        
        // Modal events
        const modal = document.getElementById('roomTypeModal');
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
        const form = document.getElementById('roomTypeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRoomType();
            });
        }
        
        // Type name change for image preview
        const typeNameInput = document.getElementById('typeName');
        if (typeNameInput) {
            typeNameInput.addEventListener('input', () => {
                this.updateImagePreview();
            });
        }
        
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }
    
    updateImagePreview() {
        const typeNameInput = document.getElementById('typeName');
        const imagePreview = document.getElementById('imagePreview');
        const currentImage = document.getElementById('currentImage');
        
        if (typeNameInput && imagePreview && currentImage) {
            const typeName = typeNameInput.value.trim();
            const previewUrl = this.getDefaultImageForRoomType(typeName);
            
            currentImage.src = previewUrl;
            imagePreview.style.display = 'block';
        }
    }
    
    showAddModal() {
        this.currentEditId = null;
        document.getElementById('modalTitle').textContent = 'Add New Room Type';
        document.getElementById('roomTypeForm').reset();
        document.getElementById('roomTypeId').value = '';
        
        // Hide image preview initially
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }
        
        this.showModal();
    }
    
    editRoomType(roomTypeId) {
        const roomType = this.roomTypes.find(rt => rt.room_type_id == roomTypeId);
        if (!roomType) return;
        
        this.currentEditId = roomTypeId;
        document.getElementById('modalTitle').textContent = 'Edit Room Type';
        document.getElementById('roomTypeId').value = roomType.room_type_id;
        document.getElementById('typeName').value = roomType.type_name;
        document.getElementById('typeDescription').value = roomType.description;
        document.getElementById('pricePerNight').value = roomType.price_per_night;
        document.getElementById('capacity').value = roomType.capacity;
        
        // Show image preview with current or default image
        const imagePreview = document.getElementById('imagePreview');
        const currentImage = document.getElementById('currentImage');
        
        if (imagePreview && currentImage) {
            const imageUrl = roomType.image_url || this.getDefaultImageForRoomType(roomType.type_name);
            currentImage.src = imageUrl;
            imagePreview.style.display = 'block';
        }
        
        this.showModal();
    }
    
    async deleteRoomType(roomTypeId) {
        const roomType = this.roomTypes.find(rt => rt.room_type_id == roomTypeId);
        if (!roomType) return;
        
        if (roomType.room_count > 0) {
            this.showError('Cannot delete room type that is being used by existing rooms');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the room type "${roomType.type_name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/room-types.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ room_type_id: roomTypeId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete room type');
            }
            
            this.showSuccess('Room type deleted successfully');
            await this.loadRoomTypes();
            
        } catch (error) {
            console.error('Failed to delete room type:', error);
            this.showError('Failed to delete room type: ' + error.message);
        }
    }
    
    async saveRoomType() {
        try {
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            // Disable button and show loading
            saveBtn.disabled = true;
            saveBtnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            
            const typeName = document.getElementById('typeName').value.trim();
            
            const formData = {
                type_name: typeName,
                description: document.getElementById('typeDescription').value.trim(),
                price_per_night: parseFloat(document.getElementById('pricePerNight').value),
                capacity: parseInt(document.getElementById('capacity').value),
                // Add default image based on room type name
                image_url: this.getDefaultImageForRoomType(typeName)
            };
            
            // Validation
            if (!formData.type_name || isNaN(formData.price_per_night) || isNaN(formData.capacity)) {
                throw new Error('Please fill in all required fields with valid values');
            }
            
            if (formData.price_per_night < 0) {
                throw new Error('Price cannot be negative');
            }
            
            if (formData.capacity < 1 || formData.capacity > 10) {
                throw new Error('Capacity must be between 1 and 10');
            }
            
            const isEdit = this.currentEditId !== null;
            if (isEdit) {
                formData.room_type_id = this.currentEditId;
            }
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/room-types.php`, {
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
                throw new Error(result.error || 'Failed to save room type');
            }
            
            this.showSuccess(`Room type ${isEdit ? 'updated' : 'created'} successfully`);
            this.hideModal();
            await this.loadRoomTypes();
            
        } catch (error) {
            console.error('Failed to save room type:', error);
            this.showError('Failed to save room type: ' + error.message);
        } finally {
            // Re-enable button
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            saveBtn.disabled = false;
            saveBtnText.textContent = 'Save Room Type';
        }
    }
    
    showModal() {
        const modal = document.getElementById('roomTypeModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    hideModal() {
        const modal = document.getElementById('roomTypeModal');
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
                <span>${message}</span>
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

// Initialize room types manager when DOM is loaded
let roomTypesManager;

document.addEventListener('DOMContentLoaded', () => {
    roomTypesManager = new RoomTypesManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (roomTypesManager) {
        // Cleanup if needed
    }
});
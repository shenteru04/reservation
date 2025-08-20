// js/admin/menu-items.js - Menu Items Management with Display Modes
class MenuItemsManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.menuItems = [];
        this.categories = [];
        this.currentEditId = null;
        this.currentFilters = {};
        this.displayMode = 'grid'; // Default display mode: 'grid', 'list', or 'compact'
        this.init();
    }
    
    async init() {
        try {
            // Check authentication
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Load saved display mode from localStorage
            this.loadDisplayMode();
            
            // Load menu items
            await this.loadMenuItems();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Menu items manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize menu items manager:', error);
            this.showError('Failed to initialize menu items manager: ' + error.message);
        }
    }
    
    loadDisplayMode() {
        const savedMode = localStorage.getItem('menuItemsDisplayMode');
        if (savedMode && ['grid', 'list', 'compact'].includes(savedMode)) {
            this.displayMode = savedMode;
        }
        this.updateDisplayModeUI();
    }
    
    updateDisplayModeUI() {
        // Update active button state
        const buttons = {
            grid: document.getElementById('displayModeGrid'),
            list: document.getElementById('displayModeList'),
            compact: document.getElementById('displayModeCompact')
        };
        
        Object.entries(buttons).forEach(([mode, button]) => {
            if (button) {
                if (mode === this.displayMode) {
                    button.classList.add('bg-blue-600', 'text-white');
                    button.classList.remove('bg-gray-200', 'text-gray-700');
                } else {
                    button.classList.remove('bg-blue-600', 'text-white');
                    button.classList.add('bg-gray-200', 'text-gray-700');
                }
            }
        });
    }
    
    changeDisplayMode(mode) {
        if (['grid', 'list', 'compact'].includes(mode)) {
            this.displayMode = mode;
            localStorage.setItem('menuItemsDisplayMode', mode);
            this.updateDisplayModeUI();
            this.renderMenuItems();
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
    
    async loadMenuItems() {
        try {
            // Build query parameters for filters
            const params = new URLSearchParams();
            
            if (this.currentFilters.category) {
                params.append('category', this.currentFilters.category);
            }
            if (this.currentFilters.available_only) {
                params.append('available_only', 'true');
            }
            
            const queryString = params.toString();
            const url = `${this.baseURL}/api/admin/pages/menu-items.php${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load menu items: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load menu items');
            }
            
            this.menuItems = data.menu_items || [];
            this.categories = data.categories || [];
            
            this.renderMenuItems();
            this.updateStats();
            this.populateCategoryFilters();
            
        } catch (error) {
            console.error('Failed to load menu items:', error);
            this.showError('Failed to load menu items: ' + error.message);
            this.renderEmptyState();
        }
    }
    
    populateCategoryFilters() {
        const categorySelect = document.getElementById('categoryFilter');
        const newCategorySelect = document.getElementById('itemCategory');
        
        if (categorySelect) {
            // Keep the first option (All Categories)
            const firstOption = categorySelect.querySelector('option');
            categorySelect.innerHTML = '';
            if (firstOption) {
                categorySelect.appendChild(firstOption);
            }
            
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
        if (newCategorySelect) {
            // Keep existing options and add new categories
            const existingOptions = Array.from(newCategorySelect.options).map(opt => opt.value);
            
            this.categories.forEach(category => {
                if (!existingOptions.includes(category)) {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    newCategorySelect.appendChild(option);
                }
            });
        }
    }
    
    renderMenuItems() {
        const container = document.getElementById('menuItemsContainer');
        if (!container) return;
        
        if (this.menuItems.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Group items by category
        const groupedItems = this.groupItemsByCategory();
        
        let html = '';
        Object.entries(groupedItems).forEach(([category, items]) => {
            html += `
                <div class="category-section mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                        ${category} (${items.length} items)
                    </h3>
                    <div class="${this.getDisplayModeClasses()}">
                        ${items.map(item => this.createMenuItemCard(item)).join('')}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add fade-in animation
        container.classList.add('fade-in');
        setTimeout(() => container.classList.remove('fade-in'), 300);
    }
    
    getDisplayModeClasses() {
        switch (this.displayMode) {
            case 'list':
                return 'grid grid-cols-1 gap-3';
            case 'compact':
                return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2';
            case 'grid':
            default:
                return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
        }
    }
    
    groupItemsByCategory() {
        const grouped = {};
        
        this.menuItems.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });
        
        // Sort categories alphabetically
        const sortedGrouped = {};
        Object.keys(grouped).sort().forEach(key => {
            sortedGrouped[key] = grouped[key].sort((a, b) => a.item_name.localeCompare(b.item_name));
        });
        
        return sortedGrouped;
    }
    
    createMenuItemCard(item) {
        const availabilityClass = item.is_available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
        const statusBadge = item.is_available 
            ? '<span class="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full">Available</span>'
            : '<span class="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200 rounded-full">Unavailable</span>';
        
        if (this.displayMode === 'list') {
            return `
                <div class="menu-item-card bg-white border ${availabilityClass} rounded-lg p-4 hover:shadow-md transition-all flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-4">
                            <h4 class="text-md font-semibold text-gray-800 truncate">${item.item_name}</h4>
                            <span class="text-lg font-bold text-gray-800 whitespace-nowrap">₱${parseFloat(item.price).toLocaleString()}</span>
                            ${statusBadge}
                        </div>
                        ${item.description ? `<p class="text-sm text-gray-600 mt-1 truncate">${item.description}</p>` : ''}
                    </div>
                    
                    <div class="flex space-x-2 ml-4">
                        <span class="text-sm text-gray-500 whitespace-nowrap">
                            <i class="fas fa-utensils mr-1"></i>
                            ${item.order_count} orders
                        </span>
                        <span class="text-xs text-gray-400 whitespace-nowrap">
                            ${item.category}
                        </span>
                        <div class="flex space-x-1 ml-2">
                            <button onclick="menuItemsManager.editMenuItem(${item.menu_id})" 
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Edit Item">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button onclick="menuItemsManager.deleteMenuItem(${item.menu_id})" 
                                    class="text-red-600 hover:text-red-800 p-1" title="Delete Item">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (this.displayMode === 'compact') {
            return `
                <div class="menu-item-card bg-white border ${availabilityClass} rounded-lg p-3 hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-sm font-semibold text-gray-800 truncate">${item.item_name}</h4>
                        <div class="flex space-x-1 ml-2">
                            <button onclick="menuItemsManager.editMenuItem(${item.menu_id})" 
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Edit Item">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold text-gray-800">₱${parseFloat(item.price).toLocaleString()}</span>
                        ${statusBadge}
                    </div>
                </div>
            `;
        } else {
            // Default grid view
            return `
                <div class="menu-item-card bg-white border ${availabilityClass} rounded-lg p-4 hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <h4 class="text-md font-semibold text-gray-800">${item.item_name}</h4>
                            ${item.description ? `<p class="text-sm text-gray-600 mt-1">${item.description}</p>` : ''}
                        </div>
                        <div class="flex space-x-1 ml-2">
                            <button onclick="menuItemsManager.editMenuItem(${item.menu_id})" 
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Edit Item">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button onclick="menuItemsManager.deleteMenuItem(${item.menu_id})" 
                                    class="text-red-600 hover:text-red-800 p-1" title="Delete Item">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-lg font-bold text-gray-800">₱${parseFloat(item.price).toLocaleString()}</span>
                            ${statusBadge}
                        </div>
                        
                        <div class="flex justify-between items-center text-sm text-gray-500">
                            <span>
                                <i class="fas fa-utensils mr-1"></i>
                                ${item.order_count} orders
                            </span>
                            <span class="text-xs">
                                ${item.category}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    renderEmptyState() {
        const container = document.getElementById('menuItemsContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-utensils text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg mb-2">No menu items found</p>
                    <p class="text-gray-400 text-sm mb-4">Start by adding menu items for your restaurant</p>
                    <button onclick="menuItemsManager.showAddModal()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Menu Item
                    </button>
                </div>
            `;
        }
    }
    
    updateStats() {
        const stats = {
            total: this.menuItems.length,
            available: this.menuItems.filter(item => item.is_available).length,
            unavailable: this.menuItems.filter(item => !item.is_available).length,
            categories: this.categories.length,
            totalOrders: this.menuItems.reduce((sum, item) => sum + item.order_count, 0)
        };
        
        // Update DOM elements safely
        const elements = [
            { id: 'totalMenuItems', value: stats.total },
            { id: 'availableItems', value: stats.available },
            { id: 'unavailableItems', value: stats.unavailable },
            { id: 'totalCategories', value: stats.categories },
            { id: 'totalOrders', value: stats.totalOrders }
        ];
        
        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    setupEventListeners() {
        // Add menu item button
        const addBtn = document.getElementById('addMenuItemBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
        
        // Display mode buttons
        document.getElementById('displayModeGrid')?.addEventListener('click', () => this.changeDisplayMode('grid'));
        document.getElementById('displayModeList')?.addEventListener('click', () => this.changeDisplayMode('list'));
        document.getElementById('displayModeCompact')?.addEventListener('click', () => this.changeDisplayMode('compact'));
        
        // Filter events
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.loadMenuItems();
            });
        }
        
        const availableFilter = document.getElementById('availableFilter');
        if (availableFilter) {
            availableFilter.addEventListener('change', (e) => {
                this.currentFilters.available_only = e.target.checked;
                this.loadMenuItems();
            });
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
        const modal = document.getElementById('menuItemModal');
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
        const form = document.getElementById('menuItemForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMenuItem();
            });
        }
        
        // Category input handling - allow custom categories
        const categorySelect = document.getElementById('itemCategory');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    const customCategory = prompt('Enter new category name:');
                    if (customCategory && customCategory.trim()) {
                        const newOption = document.createElement('option');
                        newOption.value = customCategory.trim();
                        newOption.textContent = customCategory.trim();
                        newOption.selected = true;
                        
                        // Insert before the "Custom..." option
                        const customOption = e.target.querySelector('option[value="custom"]');
                        e.target.insertBefore(newOption, customOption);
                    } else {
                        e.target.value = 'General'; // Reset to default
                    }
                }
            });
        }
    }
    
    showAddModal() {
        this.currentEditId = null;
        const modalTitle = document.getElementById('modalTitle');
        const menuItemForm = document.getElementById('menuItemForm');
        const menuItemId = document.getElementById('menuItemId');
        
        if (modalTitle) modalTitle.textContent = 'Add New Menu Item';
        if (menuItemForm) menuItemForm.reset();
        if (menuItemId) menuItemId.value = '';
        
        // Set default category
        const categorySelect = document.getElementById('itemCategory');
        if (categorySelect) {
            categorySelect.value = 'General';
        }
        
        // Set default availability
        const availableCheckbox = document.getElementById('isAvailable');
        if (availableCheckbox) {
            availableCheckbox.checked = true;
        }
        
        this.showModal();
    }
    
    editMenuItem(menuId) {
        const item = this.menuItems.find(i => i.menu_id == menuId);
        if (!item) return;
        
        this.currentEditId = menuId;
        
        const elements = [
            { id: 'modalTitle', value: 'Edit Menu Item', prop: 'textContent' },
            { id: 'menuItemId', value: item.menu_id, prop: 'value' },
            { id: 'itemName', value: item.item_name, prop: 'value' },
            { id: 'itemDescription', value: item.description, prop: 'value' },
            { id: 'itemPrice', value: parseFloat(item.price).toFixed(2), prop: 'value' },
            { id: 'itemCategory', value: item.category, prop: 'value' },
            { id: 'isAvailable', value: item.is_available, prop: 'checked' }
        ];
        
        elements.forEach(({ id, value, prop }) => {
            const element = document.getElementById(id);
            if (element) {
                element[prop] = value;
            }
        });
        
        this.showModal();
    }
    
    async deleteMenuItem(menuId) {
        const item = this.menuItems.find(i => i.menu_id == menuId);
        if (!item) return;
        
        if (item.order_count > 0) {
            this.showError('Cannot delete menu item that has been ordered');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/menu-items.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ menu_id: menuId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete menu item');
            }
            
            this.showSuccess('Menu item deleted successfully');
            await this.loadMenuItems();
            
        } catch (error) {
            console.error('Failed to delete menu item:', error);
            this.showError('Failed to delete menu item: ' + error.message);
        }
    }
    
    async saveMenuItem() {
        try {
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            // Disable button and show loading
            if (saveBtn) saveBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            
            const formData = {
                item_name: this.getElementValue('itemName').trim(),
                description: this.getElementValue('itemDescription').trim(),
                price: parseFloat(this.getElementValue('itemPrice')) || 0,
                category: this.getElementValue('itemCategory').trim() || 'General',
                is_available: document.getElementById('isAvailable')?.checked || false
            };
            
            // Validation
            if (!formData.item_name) {
                throw new Error('Please enter an item name');
            }
            
            if (formData.price < 0) {
                throw new Error('Price cannot be negative');
            }
            
            const isEdit = this.currentEditId !== null;
            if (isEdit) {
                formData.menu_id = this.currentEditId;
            }
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/menu-items.php`, {
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
                throw new Error(result.error || 'Failed to save menu item');
            }
            
            this.showSuccess(`Menu item ${isEdit ? 'updated' : 'created'} successfully`);
            this.hideModal();
            await this.loadMenuItems();
            
        } catch (error) {
            console.error('Failed to save menu item:', error);
            this.showError('Failed to save menu item: ' + error.message);
        } finally {
            // Re-enable button
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            if (saveBtn) saveBtn.disabled = false;
            if (saveBtnText) saveBtnText.textContent = 'Save Item';
        }
    }
    
    getElementValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }
    
    showModal() {
        const modal = document.getElementById('menuItemModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    hideModal() {
        const modal = document.getElementById('menuItemModal');
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

// Initialize menu items manager when DOM is loaded
let menuItemsManager;

document.addEventListener('DOMContentLoaded', () => {
    menuItemsManager = new MenuItemsManager();
});
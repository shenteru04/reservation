// js/admin/users.js - User Management functionality with Axios

class UserManager extends BaseManager {
    constructor() {
        super('UserManager');
        this.currentUsers = [];
        this.currentEditId = null;
        this.userToDelete = null;
        this.initialized = false;
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing user management...');
            
            // Wait for DOM to be fully ready - better approach
            await this.waitForDOM();
            
            // Ensure all modals are hidden on initialization
            this.initializeModals();
            
            // Set up event listeners first
            this.setupEventListeners();
            
            // Check authentication - but don't block on failure for debugging
            try {
                const auth = await this.checkAuthentication();
                if (!auth) {
                    console.log('Authentication failed, but continuing for debugging');
                    // Don't return here, continue to load users for debugging
                }
            } catch (authError) {
                console.error('Authentication check failed:', authError);
                // Continue anyway for debugging
            }
            
            // Load users data - this is the key part
            await this.loadUsers();
            
            this.initialized = true;
            console.log('User management initialized successfully');
            
        } catch (error) {
            console.error('User management initialization failed:', error);
            this.showError('Failed to initialize user management: ' + error.message);
            // Still try to display empty state
            this.displayUsers([]);
        } finally {
            // Hide loading overlay after initialization
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }
    
    // Better DOM ready check
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else if (document.readyState === 'interactive') {
                // DOM is ready but resources might still be loading
                setTimeout(resolve, 100);
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
    }
    
    initializeModals() {
        // Ensure both modals are hidden on page load
        const userModal = document.getElementById('userModal');
        const deleteModal = document.getElementById('deleteModal');
        
        if (userModal) {
            userModal.classList.remove('show');
            userModal.style.display = 'none';
        }
        
        if (deleteModal) {
            deleteModal.classList.remove('show');
            deleteModal.style.display = 'none';
        }
        
        console.log('Modals initialized and hidden');
    }
    
    setupEventListeners() {
        // Add User button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                this.openModal();
            });
        }
        
        // Modal close buttons
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // User form submit
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
        }
        
        // Delete modal
        const cancelDelete = document.getElementById('cancelDelete');
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }
        
        const confirmDelete = document.getElementById('confirmDelete');
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => {
                this.deleteUser();
            });
        }
        
        // Search and filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterUsers();
            });
        }
        
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadUsers();
            });
        }
        
        // Close modals when clicking outside
        const userModal = document.getElementById('userModal');
        if (userModal) {
            userModal.addEventListener('click', (e) => {
                if (e.target.id === 'userModal') {
                    this.closeModal();
                }
            });
        }
        
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target.id === 'deleteModal') {
                    this.closeDeleteModal();
                }
            });
        }

        // Prevent modal stacking by ensuring only one modal is open at a time
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Setup common event listeners (logout, etc.)
        this.setupCommonEventListeners();
    }
    
    async loadUsers() {
        try {
            console.log('Loading users...');
            
            // Show loading state on table
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                            <i class="fas fa-spinner fa-spin mr-2"></i>Loading users...
                        </td>
                    </tr>
                `;
            } else {
                console.error('Table body element not found!');
                this.showError('Table element not found in DOM');
                return;
            }
            
            // Check if API base URL is set
            if (!this.api || !this.api.defaults || !this.api.defaults.baseURL) {
                console.error('API not properly configured');
                this.showError('API configuration error');
                return;
            }
            
            console.log('Making API request to:', this.api.defaults.baseURL + '/api/admin/pages/users.php');
            
            const response = await this.api.get('/api/admin/pages/users.php');
            console.log('API Response received:', response);
            
            if (!response || !response.data) {
                throw new Error('No response data received from server');
            }
            
            const data = response.data;
            console.log('Response data:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Server returned failure response');
            }
            
            console.log('Users loaded successfully:', data.users?.length || 0);
            this.currentUsers = data.users || [];
            
            // Validate users data
            if (!Array.isArray(this.currentUsers)) {
                console.error('Users data is not an array:', this.currentUsers);
                this.currentUsers = [];
            }
            
            // Force display users immediately
            this.displayUsers(this.currentUsers);
            this.updateStats();
            
            console.log('✅ Users displayed successfully in table');
            
        } catch (error) {
            console.error('Failed to load users:', error);
            
            // Log more details about the error
            if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response data:', error.response.data);
                console.error('Error response headers:', error.response.headers);
            } else if (error.request) {
                console.error('No response received:', error.request);
            } else {
                console.error('Request setup error:', error.message);
            }
            
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to load users: ' + errorMessage);
            
            // Display empty state on error
            this.currentUsers = [];
            this.displayUsers([]);
            this.updateStats();
        }
    }
    
    updateStats() {
        const total = this.currentUsers.length;
        const active = this.currentUsers.filter(u => u.is_active == 1).length;
        const admins = this.currentUsers.filter(u => u.role_id == 1).length;
        const frontdesk = this.currentUsers.filter(u => u.role_id == 2).length;
        const handyman = this.currentUsers.filter(u => u.role_id == 3).length;
        const now = new Date();
        const recent = this.currentUsers.filter(u => {
            if (!u.last_login) return false;
            const loginDate = new Date(u.last_login);
            return (now - loginDate) < 24 * 60 * 60 * 1000;
        }).length;

        // Update stats with null checks
        const totalUsersEl = document.getElementById('totalUsers');
        const activeUsersEl = document.getElementById('activeUsers');
        const adminUsersEl = document.getElementById('adminUsers');
        const recentLoginsEl = document.getElementById('recentLogins');

        if (totalUsersEl) totalUsersEl.innerHTML = total;
        if (activeUsersEl) activeUsersEl.innerHTML = active;
        if (adminUsersEl) adminUsersEl.innerHTML = admins;
        if (recentLoginsEl) recentLoginsEl.innerHTML = recent;

        // Update role distribution percentages and bars
        if (total > 0) {
            const adminPercent = Math.round((admins / total) * 100);
            const frontdeskPercent = Math.round((frontdesk / total) * 100);
            const handymanPercent = Math.round((handyman / total) * 100);

            const adminPercentEl = document.getElementById('adminPercent');
            const frontdeskPercentEl = document.getElementById('frontdeskPercent');
            const handymanPercentEl = document.getElementById('handymanPercent');

            if (adminPercentEl) adminPercentEl.textContent = adminPercent + '%';
            if (frontdeskPercentEl) frontdeskPercentEl.textContent = frontdeskPercent + '%';
            if (handymanPercentEl) handymanPercentEl.textContent = handymanPercent + '%';

            // Update progress bars
            const adminBar = adminPercentEl?.previousElementSibling?.querySelector('.bg-purple-500');
            const frontdeskBar = frontdeskPercentEl?.previousElementSibling?.querySelector('.bg-green-500');
            const handymanBar = handymanPercentEl?.previousElementSibling?.querySelector('.bg-red-500');

            if (adminBar) adminBar.style.width = adminPercent + '%';
            if (frontdeskBar) frontdeskBar.style.width = frontdeskPercent + '%';
            if (handymanBar) handymanBar.style.width = handymanPercent + '%';
        } else {
            const adminPercentEl = document.getElementById('adminPercent');
            const frontdeskPercentEl = document.getElementById('frontdeskPercent');
            const handymanPercentEl = document.getElementById('handymanPercent');

            if (adminPercentEl) adminPercentEl.textContent = '0%';
            if (frontdeskPercentEl) frontdeskPercentEl.textContent = '0%';
            if (handymanPercentEl) handymanPercentEl.textContent = '0%';
        }
        
        console.log('Stats updated - Total users:', total);
    }
    
    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        const userCountEl = document.getElementById('userCount');
        
        if (!tbody) {
            console.error('Users table body not found!');
            return;
        }
        
        console.log('Displaying users:', users?.length || 0);
        
        tbody.innerHTML = '';
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        <i class="fas fa-users mr-2"></i>No users found
                    </td>
                </tr>
            `;
            if (userCountEl) userCountEl.textContent = '0';
            return;
        }
        
        users.forEach((user, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            // Status badge
            const statusClass = user.is_active == 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusText = user.is_active == 1 ? 'Active' : 'Inactive';
            
            // Role name
            const roleNames = {
                1: 'Admin',
                2: 'Front Desk',
                3: 'Handyman'
            };
            const roleName = roleNames[user.role_id] || 'Unknown';
            
            // Role badge class
            let roleClass = 'bg-blue-100 text-blue-800';
            switch (parseInt(user.role_id)) {
                case 1:
                    roleClass = 'bg-purple-100 text-purple-800';
                    break;
                case 2:
                    roleClass = 'bg-green-100 text-green-800';
                    break;
                case 3:
                    roleClass = 'bg-red-100 text-red-800';
                    break;
            }
            
            // Last login
            const lastLogin = user.last_login ? 
                new Date(user.last_login).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Never';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium mr-3">
                            ${(user.first_name?.charAt(0) || '') + (user.last_name?.charAt(0) || '')}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${this.escapeHtml(user.first_name || '')} ${this.escapeHtml(user.last_name || '')}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${this.escapeHtml(user.email || 'N/A')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClass}">
                        ${roleName}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${this.escapeHtml(user.phone_num || 'N/A')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${lastLogin}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="userManager.editUser(${user.employee_id})" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        if (userCountEl) {
            userCountEl.textContent = users.length;
        }
        
        console.log('✅ Users successfully displayed in table:', users.length);
    }
    
    filterUsers() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        const filteredUsers = this.currentUsers.filter(user => {
            // Search filter
            const searchMatch = !searchTerm || 
                (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
                (user.last_name && user.last_name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm));
            
            // Role filter
            const roleMatch = !roleFilter || user.role_id == roleFilter;
            
            // Status filter
            const statusMatch = !statusFilter || user.is_active == statusFilter;
            
            return searchMatch && roleMatch && statusMatch;
        });
        
        this.displayUsers(filteredUsers);
    }

    // Close all modals to prevent stacking
    closeAllModals() {
        this.closeModal();
        this.closeDeleteModal();
    }
    
    openModal(user = null) {
        // Close any existing modals first
        this.closeAllModals();
        
        // Small delay to ensure previous modal is fully closed
        setTimeout(() => {
            const modal = document.getElementById('userModal');
            const modalTitle = document.getElementById('modalTitle');
            const passwordSection = document.getElementById('passwordSection');
            const passwordInput = document.getElementById('password');
            const passwordLabel = document.getElementById('passwordLabel');
            
            if (user) {
                // Edit mode
                if (modalTitle) modalTitle.textContent = 'Edit User';
                
                const userId = document.getElementById('userId');
                const firstName = document.getElementById('firstName');
                const lastName = document.getElementById('lastName');
                const email = document.getElementById('email');
                const phone = document.getElementById('phone');
                const role = document.getElementById('role');
                const isActive = document.getElementById('isActive');
                
                if (userId) userId.value = user.employee_id;
                if (firstName) firstName.value = user.first_name || '';
                if (lastName) lastName.value = user.last_name || '';
                if (email) email.value = user.email || '';
                if (phone) phone.value = user.phone_num || '';
                if (role) role.value = user.role_id || '';
                if (isActive) isActive.checked = user.is_active == 1;
                
                // Make password optional for edits
                if (passwordInput) passwordInput.required = false;
                if (passwordLabel) passwordLabel.textContent = 'New Password (leave blank to keep current)';
                
                this.currentEditId = user.employee_id;
            } else {
                // Add mode
                if (modalTitle) modalTitle.textContent = 'Add User';
                
                const userForm = document.getElementById('userForm');
                const userId = document.getElementById('userId');
                
                if (userForm) userForm.reset();
                if (userId) userId.value = '';
                
                // Make password required for new users
                if (passwordInput) passwordInput.required = true;
                if (passwordLabel) passwordLabel.textContent = 'Password';
                
                this.currentEditId = null;
            }
            
            // Show the modal
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
            
            // Focus on first input
            setTimeout(() => {
                const firstNameInput = document.getElementById('firstName');
                if (firstNameInput) firstNameInput.focus();
            }, 100);
        }, 50);
    }
    
    closeModal() {
        const modal = document.getElementById('userModal');
        const userForm = document.getElementById('userForm');
        
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
        if (userForm) {
            userForm.reset();
        }
        this.currentEditId = null;
    }
    
    async saveUser() {
        try {
            console.log('Saving user...');
            
            const saveBtn = document.getElementById('saveBtn');
            const btnText = saveBtn?.querySelector('.btn-text');
            const spinner = saveBtn?.querySelector('.loading-spinner');
            
            // Show loading state
            if (btnText) btnText.style.display = 'none';
            if (spinner) spinner.classList.remove('hidden');
            if (saveBtn) saveBtn.disabled = true;
            
            const userForm = document.getElementById('userForm');
            if (!userForm) throw new Error('User form not found');
            
            const formData = new FormData(userForm);
            const userData = {
                employee_id: formData.get('user_id') || null,
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                email: formData.get('email'),
                phone_num: formData.get('phone_num'),
                role_id: formData.get('role_id'),
                is_active: formData.get('is_active') ? 1 : 0
            };
            
            // Only include password if provided
            const password = formData.get('password');
            if (password && password.trim()) {
                userData.password = password;
            }
            
            const isEdit = userData.employee_id && userData.employee_id !== '';
            
            console.log('Saving user data:', userData);
            console.log('Using method:', isEdit ? 'PUT' : 'POST');
            
            const response = isEdit
                ? await this.api.put('/api/admin/pages/users.php', userData)
                : await this.api.post('/api/admin/pages/users.php', userData);
            
            const result = response.data;
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save user');
            }
            
            console.log('User saved successfully:', result);
            this.showSuccess(isEdit ? 'User updated successfully!' : 'User created successfully!');
            this.closeModal();
            await this.loadUsers();
            
        } catch (error) {
            console.error('Failed to save user:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to save user: ' + errorMessage);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('saveBtn');
            const btnText = saveBtn?.querySelector('.btn-text');
            const spinner = saveBtn?.querySelector('.loading-spinner');
            
            if (btnText) btnText.style.display = 'inline';
            if (spinner) spinner.classList.add('hidden');
            if (saveBtn) saveBtn.disabled = false;
        }
    }
    
    editUser(employeeId) {
        const user = this.currentUsers.find(u => u.employee_id == employeeId);
        if (user) {
            this.openModal(user);
        } else {
            this.showError('User not found');
        }
    }
    
    confirmDeleteUser(employeeId) {
        // Close any open modals first
        this.closeAllModals();
        
        // Small delay to ensure previous modal is fully closed
        setTimeout(() => {
            this.userToDelete = employeeId;
            const modal = document.getElementById('deleteModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
        }, 50);
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
        this.userToDelete = null;
    }
    
    async deleteUser() {
        if (!this.userToDelete) return;
        
        try {
            console.log('Deleting user:', this.userToDelete);
            
            await this.api.delete('/api/admin/pages/users.php', {
                data: { employee_id: this.userToDelete }
            });
            
            console.log('User deleted successfully');
            this.showSuccess('User deleted successfully!');
            this.closeDeleteModal();
            await this.loadUsers();
            
        } catch (error) {
            console.error('Failed to delete user:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to delete user: ' + errorMessage);
        }
    }
    
    showError(message) {
        console.error('User Management Error:', message);
        
        // Remove any existing error notifications
        const existingError = document.getElementById('user-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.id = 'user-error';
        errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 max-w-md';
        errorDiv.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-exclamation-triangle mr-2 mt-1 flex-shrink-0"></i>
                <div class="flex-1">
                    <p class="text-sm">${this.escapeHtml(message)}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-red-500 hover:text-red-700 flex-shrink-0">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 8000);
    }
    
    showSuccess(message) {
        console.log('Success:', message);
        
        // Remove any existing success notifications
        const existingSuccess = document.querySelector('.fixed.top-4.right-4.bg-green-100');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50 max-w-md';
        successDiv.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-check-circle mr-2 mt-1 flex-shrink-0"></i>
                <div class="flex-1">
                    <p class="text-sm">${this.escapeHtml(message)}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-green-500 hover:text-green-700 flex-shrink-0">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv && successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }
}

// Initialize user manager when DOM is loaded
let userManager;

// Multiple initialization strategies to ensure it works
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing user manager...');
    userManager = new UserManager();
});

// Backup initialization if DOMContentLoaded already fired
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, initializing user manager immediately...');
    userManager = new UserManager();
}

// Another backup for when page is fully loaded
window.addEventListener('load', () => {
    if (!userManager || !userManager.initialized) {
        console.log('Window loaded, initializing user manager as backup...');
        userManager = new UserManager();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Cleanup if needed
});
// js/admin/users.js - User Management functionality (no billing/reservations)
class UserManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.currentUsers = [];
        this.currentEditId = null;
        this.userToDelete = null;
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing user management...');
            
            // Ensure all modals are hidden on initialization
            this.initializeModals();
            
            // Check authentication first
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Load users data
            await this.loadUsers();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('User management initialized successfully');
            
        } catch (error) {
            console.error('User management initialization failed:', error);
            this.showError('Failed to initialize user management: ' + error.message);
        }
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
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/check.php`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.authenticated) {
                console.log('User not authenticated, redirecting to login...');
                window.location.href = `${this.baseURL}/pages/auth/login.html`;
                return false;
            }
            
            // Update admin name in sidebar
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl && result.user) {
                const userName = result.user.name || `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || 'Admin User';
                adminNameEl.textContent = userName;
            }
            
            console.log('Authentication check passed for user:', result.user?.email);
            return true;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showError('Authentication check failed. Please refresh the page.');
            return false;
        }
    }
    
    setupEventListeners() {
        // Add User button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.openModal();
        });
        
        // Modal close buttons
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // User form submit
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });
        
        // Delete modal
        document.getElementById('cancelDelete').addEventListener('click', () => {
            this.closeDeleteModal();
        });
        
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.deleteUser();
        });
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterUsers();
        });
        
        document.getElementById('roleFilter').addEventListener('change', () => {
            this.filterUsers();
        });
        
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterUsers();
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadUsers();
        });
        
        // Close modals when clicking outside
        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.closeModal();
            }
        });
        
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.closeDeleteModal();
            }
        });

        // Prevent modal stacking by ensuring only one modal is open at a time
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Setup logout handler
        this.setupLogoutHandler();
    }
    
    setupLogoutHandler() {
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
        
        // Also handle any other logout links
        const otherLogoutLinks = document.querySelectorAll('a[href*="logout"]');
        otherLogoutLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        });
    }
    
    async handleLogout() {
        try {
            console.log('Logging out...');
            
            const response = await fetch(`${this.baseURL}/api/auth/logout.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });
            
            // Redirect to login page regardless of response
            console.log('Redirecting to login page...');
            window.location.href = `${this.baseURL}/api/auth/login.html`;
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout request fails
            window.location.href = `${this.baseURL}/api/auth/login.html`;
        }
    }
    
    async loadUsers() {
        try {
            console.log('Loading users...');
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/users.php`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response received:', text);
                throw new Error('Server returned non-JSON response');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load users');
            }
            
            console.log('Users loaded successfully:', data.users.length);
            this.currentUsers = data.users || [];
            this.displayUsers(this.currentUsers);
            
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showError('Failed to load users: ' + error.message);
            this.displayUsers([]);
        }
    }
    
    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }
        
        users.forEach(user => {
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
                            <div class="text-sm font-medium text-gray-900">${user.first_name || ''} ${user.last_name || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.email || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${roleName}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.phone_num || 'N/A'}
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
                    <button onclick="userManager.confirmDeleteUser(${user.employee_id})" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log('Users displayed:', users.length);
    }
    
    filterUsers() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
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
                modalTitle.textContent = 'Edit User';
                document.getElementById('userId').value = user.employee_id;
                document.getElementById('firstName').value = user.first_name || '';
                document.getElementById('lastName').value = user.last_name || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone_num || '';
                document.getElementById('role').value = user.role_id || '';
                document.getElementById('isActive').checked = user.is_active == 1;
                
                // Make password optional for edits
                passwordInput.required = false;
                passwordLabel.textContent = 'New Password (leave blank to keep current)';
                
                this.currentEditId = user.employee_id;
            } else {
                // Add mode
                modalTitle.textContent = 'Add User';
                document.getElementById('userForm').reset();
                document.getElementById('userId').value = '';
                
                // Make password required for new users
                passwordInput.required = true;
                passwordLabel.textContent = 'Password';
                
                this.currentEditId = null;
            }
            
            // Show the modal
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            // Focus on first input
            setTimeout(() => {
                document.getElementById('firstName').focus();
            }, 100);
        }, 50);
    }
    
    closeModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.getElementById('userForm').reset();
        this.currentEditId = null;
    }
    
    async saveUser() {
        try {
            const saveBtn = document.getElementById('saveBtn');
            const btnText = saveBtn.querySelector('.btn-text');
            const spinner = saveBtn.querySelector('.loading-spinner');
            
            // Show loading state
            btnText.style.display = 'none';
            spinner.classList.remove('hidden');
            saveBtn.disabled = true;
            
            const formData = new FormData(document.getElementById('userForm'));
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
            const url = `${this.baseURL}/api/admin/pages/users.php`;
            const method = isEdit ? 'PUT' : 'POST';
            
            console.log('Saving user data:', userData);
            console.log('Using URL:', url);
            console.log('Using method:', method);
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                // Get response text for debugging
                const responseText = await response.text();
                console.error('Response text:', responseText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save user');
            }
            
            console.log('User saved successfully:', result);
            this.showSuccess(isEdit ? 'User updated successfully!' : 'User created successfully!');
            this.closeModal();
            await this.loadUsers();
            
        } catch (error) {
            console.error('Failed to save user:', error);
            this.showError('Failed to save user: ' + error.message);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('saveBtn');
            const btnText = saveBtn.querySelector('.btn-text');
            const spinner = saveBtn.querySelector('.loading-spinner');
            
            btnText.style.display = 'inline';
            spinner.classList.add('hidden');
            saveBtn.disabled = false;
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
            modal.style.display = 'flex';
            modal.classList.add('show');
        }, 50);
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('show');
        modal.style.display = 'none';
        this.userToDelete = null;
    }
    
    async deleteUser() {
        if (!this.userToDelete) return;
        
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/users.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ employee_id: this.userToDelete })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete user');
            }
            
            console.log('User deleted successfully');
            this.showSuccess('User deleted successfully!');
            this.closeDeleteModal();
            await this.loadUsers();
            
        } catch (error) {
            console.error('Failed to delete user:', error);
            this.showError('Failed to delete user: ' + error.message);
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
                    <p class="text-sm">${message}</p>
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
                    <p class="text-sm">${message}</p>
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

document.addEventListener('DOMContentLoaded', () => {
    userManager = new UserManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Cleanup if needed
});
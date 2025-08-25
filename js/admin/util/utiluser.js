window.addEventListener('load', function() {
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
    }, 800);
});

// Real-time clock update
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentDateTime').textContent = 
        now.toLocaleDateString('en-US', options);
}

// Update time every second
updateDateTime();
setInterval(updateDateTime, 1000);

// Enhanced hover effects for navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(8px)';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0)';
    });
});

// Toggle switch functionality
document.getElementById('isActive').addEventListener('change', function() {
    const toggle = this.parentElement.querySelector('div div:first-child');
    const slider = this.parentElement.querySelector('div div:last-child');
    
    if (this.checked) {
        toggle.classList.remove('bg-gray-300');
        toggle.classList.add('bg-indigo-500');
        slider.style.transform = 'translateX(24px)';
    } else {
        toggle.classList.remove('bg-indigo-500');
        toggle.classList.add('bg-gray-300');
        slider.style.transform = 'translateX(0)';
    }
});

// Password toggle functionality
document.querySelector('.toggle-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Password requirements validation
document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // Update requirement indicators
    Object.keys(requirements).forEach(req => {
        const element = document.querySelector(`.requirement-${req}`);
        const icon = element.querySelector('i');
        const text = element.querySelector('span');
        
        if (requirements[req]) {
            icon.classList.remove('fa-circle', 'text-gray-400');
            icon.classList.add('fa-check-circle', 'text-green-500');
            text.classList.add('text-green-600', 'line-through');
            text.classList.remove('text-gray-700');
        } else {
            icon.classList.remove('fa-check-circle', 'text-green-500');
            icon.classList.add('fa-circle', 'text-gray-400');
            text.classList.remove('text-green-600', 'line-through');
            text.classList.add('text-gray-700');
        }
    });
});

// Enhanced form validation
function validateForm() {
    const form = document.getElementById('userForm');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        const parent = input.closest('div').closest('div');
        const errorMsg = parent.querySelector('.error-message');
        
        if (!input.value.trim()) {
            parent.classList.add('has-error');
            if (errorMsg) errorMsg.classList.remove('hidden');
            isValid = false;
        } else {
            parent.classList.remove('has-error');
            if (errorMsg) errorMsg.classList.add('hidden');
        }
    });

    return isValid;
}

// Modal functionality
const userModal = document.getElementById('userModal');
const deleteModal = document.getElementById('deleteModal');
const addUserBtn = document.getElementById('addUserBtn');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const cancelDelete = document.getElementById('cancelDelete');

// Open user modal
addUserBtn.addEventListener('click', function() {
    userModal.classList.add('show');
    setTimeout(() => {
        userModal.querySelector('.modal-content').style.opacity = '1';
        userModal.querySelector('.modal-content').style.transform = 'scale(1)';
    }, 50);
});

// Close modals
function closeUserModal() {
    const modalContent = userModal.querySelector('.modal-content');
    modalContent.style.opacity = '0';
    modalContent.style.transform = 'scale(0.95)';
    setTimeout(() => {
        userModal.classList.remove('show');
        document.getElementById('userForm').reset();
    }, 300);
}

closeModal.addEventListener('click', closeUserModal);
cancelBtn.addEventListener('click', closeUserModal);

cancelDelete.addEventListener('click', function() {
    deleteModal.classList.remove('show');
});

// Close modal on outside click
userModal.addEventListener('click', function(e) {
    if (e.target === userModal) {
        closeUserModal();
    }
});

deleteModal.addEventListener('click', function(e) {
    if (e.target === deleteModal) {
        deleteModal.classList.remove('show');
    }
});

// Users array - now empty, ready for real data
let users = [];

// Function to render users table
function renderUsersTable(usersToRender = users) {
    const tableBody = document.getElementById('usersTableBody');
    
    if (usersToRender.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-8 py-16 text-center text-gray-500">
                    <div class="flex flex-col items-center space-y-4">
                        <i class="fas fa-users text-6xl text-gray-300"></i>
                        <div>
                            <p class="text-lg font-medium">No users found</p>
                            <p class="text-sm text-gray-400">Add a new user to get started</p>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const html = usersToRender.map(user => {
        const roleClass = user.roleId === 1 ? 'role-admin' : 
                        user.roleId === 2 ? 'role-frontdesk' : 'role-handyman';
        const statusClass = user.status === 'Active' ? 'active' : 'inactive';
        
        return `
            <tr class="table-row hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                <td class="px-8 py-6">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${user.firstName} ${user.lastName}</p>
                            <p class="text-sm text-gray-500">ID: ${user.id}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-6">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-envelope text-gray-400"></i>
                        <span class="text-gray-700">${user.email}</span>
                    </div>
                </td>
                <td class="px-8 py-6">
                    <span class="status-badge ${roleClass} text-white px-3 py-1 rounded-full text-sm font-medium">
                        ${user.role}
                    </span>
                </td>
                <td class="px-8 py-6">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-phone text-gray-400"></i>
                        <span class="text-gray-700">${user.phone || 'N/A'}</span>
                    </div>
                </td>
                <td class="px-8 py-6">
                    <span class="status-badge ${statusClass} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 w-fit">
                        <div class="w-2 h-2 rounded-full bg-white"></div>
                        <span>${user.status}</span>
                    </span>
                </td>
                <td class="px-8 py-6">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-clock text-gray-400"></i>
                        <div>
                            <p class="text-gray-700 text-sm">${new Date(user.lastLogin).toLocaleDateString()}</p>
                            <p class="text-gray-500 text-xs">${new Date(user.lastLogin).toLocaleTimeString()}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-6">
                    <div class="flex items-center space-x-2">
                        <button onclick="editUser(${user.id})" class="action-btn edit w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-all duration-200">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteUser(${user.id})" class="action-btn delete w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all duration-200">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = html;
    document.getElementById('userCount').textContent = usersToRender.length;
}

// Load users on page load
setTimeout(() => {
    renderUsersTable();
    updateStats();
}, 1500);

// Update stats function
function updateStats() {
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('activeUsers').textContent = users.filter(u => u.status === 'Active').length;
    document.getElementById('adminUsers').textContent = users.filter(u => u.roleId === 1).length;
    document.getElementById('recentLogins').textContent = '0';
}

// Search and filter functionality
document.getElementById('searchInput').addEventListener('input', filterUsers);
document.getElementById('roleFilter').addEventListener('change', filterUsers);
document.getElementById('statusFilter').addEventListener('change', filterUsers);
document.getElementById('refreshBtn').addEventListener('click', function() {
    renderUsersTable();
    showNotification('User list refreshed successfully!', 'success');
});

function filterUsers() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    const filtered = users.filter(user => {
        const matchesSearch = user.firstName.toLowerCase().includes(search) ||
                            user.lastName.toLowerCase().includes(search) ||
                            user.email.toLowerCase().includes(search);
        const matchesRole = !roleFilter || user.roleId.toString() === roleFilter;
        const matchesStatus = !statusFilter || (statusFilter === '1' && user.status === 'Active') ||
                            (statusFilter === '0' && user.status === 'Inactive');

        return matchesSearch && matchesRole && matchesStatus;
    });

    renderUsersTable(filtered);
}

// User management functions
function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        document.getElementById('userId').value = user.id;
        document.getElementById('firstName').value = user.firstName;
        document.getElementById('lastName').value = user.lastName;
        document.getElementById('email').value = user.email;
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('role').value = user.roleId;
        document.getElementById('isActive').checked = user.status === 'Active';
        
        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('passwordLabel').textContent = 'New Password (optional)';
        document.getElementById('password').removeAttribute('required');
        
        userModal.classList.add('show');
        setTimeout(() => {
            userModal.querySelector('.modal-content').style.opacity = '1';
            userModal.querySelector('.modal-content').style.transform = 'scale(1)';
        }, 50);
    }
}

function deleteUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        document.getElementById('confirmDelete').onclick = function() {
            // Remove user from array
            const index = users.findIndex(u => u.id === id);
            if (index > -1) {
                users.splice(index, 1);
                renderUsersTable();
                updateStats();
                showNotification(`User ${user.firstName} ${user.lastName} deleted successfully!`, 'success');
            }
            deleteModal.classList.remove('show');
        };
        deleteModal.classList.add('show');
    }
}

// Export function
function exportUsers() {
    if (users.length === 0) {
        showNotification('No users to export', 'warning');
        return;
    }
    
    showNotification('Exporting user data...', 'info');
    // In a real application, this would generate and download a CSV/Excel file
    setTimeout(() => {
        showNotification('User data exported successfully!', 'success');
    }, 2000);
}

// Bulk actions function
function bulkActions() {
    showNotification('Bulk actions feature coming soon!', 'info');
}

// Form submission
document.getElementById('userForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        showNotification('Please correct the errors in the form', 'error');
        return;
    }

    const formData = new FormData(this);
    const userData = Object.fromEntries(formData.entries());
    
    // Show loading state
    const saveBtn = document.getElementById('saveBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.loading-spinner');
    
    btnText.style.display = 'none';
    spinner.classList.remove('hidden');
    saveBtn.disabled = true;

    // Simulate API call
    setTimeout(() => {
        if (userData.user_id) {
            // Update existing user
            const index = users.findIndex(u => u.id == userData.user_id);
            if (index > -1) {
                users[index] = {
                    ...users[index],
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                    email: userData.email,
                    phone: userData.phone_num,
                    roleId: parseInt(userData.role_id),
                    role: getRoleName(userData.role_id),
                    status: userData.is_active ? 'Active' : 'Inactive'
                };
                showNotification('User updated successfully!', 'success');
            }
        } else {
            // Add new user
            const newUser = {
                id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                firstName: userData.first_name,
                lastName: userData.last_name,
                email: userData.email,
                phone: userData.phone_num,
                roleId: parseInt(userData.role_id),
                role: getRoleName(userData.role_id),
                status: userData.is_active ? 'Active' : 'Inactive',
                lastLogin: new Date().toISOString()
            };
            users.push(newUser);
            showNotification('User created successfully!', 'success');
        }

        renderUsersTable();
        updateStats();
        closeUserModal();
        
        // Reset button state
        btnText.style.display = 'inline';
        spinner.classList.add('hidden');
        saveBtn.disabled = false;
        
    }, 2000);
});

// Helper function to get role name
function getRoleName(roleId) {
    switch(parseInt(roleId)) {
        case 1: return 'Admin';
        case 2: return 'Front Desk';
        case 3: return 'Handyman';
        default: return 'Unknown';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 animate-slide-in ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Smooth animations for cards
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.card-hover');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-fade-in');
    });
});
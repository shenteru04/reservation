class LogoutHandler {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
    }
    
    async logout() {
        try {
            console.log('Initiating logout...');
            
            // Show loading state if logout button exists
            const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logoutLink');
            const originalText = logoutBtn ? logoutBtn.innerHTML : '';
            
            if (logoutBtn) {
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging out...';
                logoutBtn.disabled = true;
            }
            
            // Make logout request
            const response = await fetch(`${this.baseURL}/html/api/auth/logout.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            console.log('Logout response:', result);
            
            // Clear any local storage
            sessionStorage.clear();
            localStorage.removeItem('user');
            
            // Show success message briefly
            if (logoutBtn) {
                logoutBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Success!';
            }
            
            // Redirect after brief delay
            setTimeout(() => {
                window.location.href = `${this.baseURL}/index.html`;
            }, 1000);

        } catch (error) {
            console.error('Logout error:', error);
            
            // Clear local data even if request fails
            sessionStorage.clear();
            localStorage.removeItem('user');
            
            // Force redirect
            window.location.href = `${this.baseURL}/index.html`;
        }
    }
}

// Global logout function
window.handleLogout = function() {
    const handler = new LogoutHandler();
    return handler.logout();
};

// Auto-setup logout links when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Find logout links and buttons
    const logoutElements = document.querySelectorAll(
        'a[href*="logout"], button[onclick*="logout"], #logoutBtn, #logoutLink, .logout-btn'
    );
    
    logoutElements.forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogoutHandler;
}
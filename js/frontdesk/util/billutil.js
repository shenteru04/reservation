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

        // Smooth loading animations
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('animate-fade-in');
            });

            // Set default admin name if needed
            if (document.getElementById('staffName').textContent === 'Billing Management') {
                document.getElementById('staffName').textContent = 'Billing Operations';
            }

            // Add demo data loading simulation
            setTimeout(() => {
                document.getElementById('totalRevenue').textContent = '₱145,750';
                document.getElementById('paidInvoices').textContent = '28';
                document.getElementById('unpaidInvoices').textContent = '7';
                document.getElementById('pendingAmount').textContent = '₱18,900';
                document.getElementById('totalInvoices').textContent = '35';
                document.getElementById('lastUpdated').textContent = 'Last updated: Just now';
            }, 1500);
        });

        // Enhanced modal functionality
        document.getElementById('createBillBtn').addEventListener('click', function() {
            document.getElementById('billingModal').classList.remove('hidden');
            document.getElementById('billingModal').classList.add('show');
        });

        document.getElementById('closeModal').addEventListener('click', function() {
            document.getElementById('billingModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('billingModal').classList.add('hidden');
            }, 300);
        });

        document.getElementById('cancelBtn').addEventListener('click', function() {
            document.getElementById('billingModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('billingModal').classList.add('hidden');
            }, 300);
        });

        // Enhanced form interactions
        document.getElementById('totalAmount').addEventListener('input', function() {
            const total = parseFloat(this.value) || 0;
            const paid = parseFloat(document.getElementById('paidAmount').value) || 0;
            const balance = total - paid;
            document.getElementById('balance').value = balance.toFixed(2);
            
            // Update preview
            document.getElementById('previewTotal').textContent = '₱' + total.toFixed(2);
        });

        document.getElementById('paidAmount').addEventListener('input', function() {
            const total = parseFloat(document.getElementById('totalAmount').value) || 0;
            const paid = parseFloat(this.value) || 0;
            const balance = total - paid;
            document.getElementById('balance').value = balance.toFixed(2);
        });

        // Auto-generate invoice number
        function generateInvoiceNumber() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const time = String(now.getTime()).slice(-6);
            return `INV-${year}${month}${day}-${time}`;
        }

        // Set invoice number when modal opens
        document.getElementById('createBillBtn').addEventListener('click', function() {
            document.getElementById('invoiceNumber').value = generateInvoiceNumber();
            document.getElementById('previewInvoiceNumber').textContent = document.getElementById('invoiceNumber').value;
        });
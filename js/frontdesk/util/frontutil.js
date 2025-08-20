 // Enhanced loading and initialization
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

        // Smooth loading animations
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('animate-fade-in');
            });
        });

        // Enhanced hover effects for navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(8px)';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });

        // Report modal functionality
        document.getElementById('sendReportBtn').addEventListener('click', function() {
            document.getElementById('reportModal').classList.remove('hidden');
            document.getElementById('reportModal').classList.add('show');
        });

        document.getElementById('cancelReportBtn').addEventListener('click', function() {
            closeReportModal();
        });

        document.getElementById('submitReportBtn').addEventListener('click', function() {
            const summary = document.getElementById('reportSummary').value.trim();
            if (!summary) {
                alert('Please provide a summary of today\'s activities.');
                return;
            }
            
            // Here you would typically send the report data to your backend
            console.log('Submitting report:', {
                summary: summary,
                notes: document.getElementById('reportNotes').value,
                issues: document.getElementById('reportIssues').value,
                recommendations: document.getElementById('reportRecommendations').value,
                timestamp: new Date().toISOString()
            });
            
            alert('Daily report submitted successfully!');
            closeReportModal();
        });

        function closeReportModal() {
            document.getElementById('reportModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('reportModal').classList.add('hidden');
                // Reset form
                document.getElementById('reportSummary').value = '';
                document.getElementById('reportNotes').value = '';
                document.getElementById('reportIssues').value = '';
                document.getElementById('reportRecommendations').value = '';
            }, 300);
        }

        // Add demo data loading simulation
        setTimeout(() => {
            document.getElementById('statTotalReservations').textContent = '35';
            document.getElementById('statCheckinsToday').textContent = '8';
            document.getElementById('statRevenueToday').textContent = '₱28,500';
            document.getElementById('statUnpaidBalance').textContent = '₱12,300';
        }, 1500);
        
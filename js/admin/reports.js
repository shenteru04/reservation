// js/admin/reports.js - Reports functionality with Front Desk Reports Integration using Axios

class ReportsManager extends BaseManager {
    constructor() {
        super('ReportsManager');
        this.charts = {};
        this.currentData = {};
        this.currentTab = 'revenue';
        this.unreadCount = 0;
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing reports dashboard...');
            
            // Check authentication first
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Set default date range (current month)
            this.setDefaultDateRange();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize charts
            this.initializeCharts();
            
            // Load initial report data
            await this.loadReportData();
            
            // Load unread count for front desk reports
            await this.loadUnreadCount();
            
            console.log('Reports dashboard initialized successfully');
            
        } catch (error) {
            console.error('Reports initialization failed:', error);
            this.showError('Failed to initialize reports: ' + error.message);
        }
    }
    
    setDefaultDateRange() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const fromDateEl = document.getElementById('fromDate');
        const toDateEl = document.getElementById('toDate');
        
        if (fromDateEl) fromDateEl.value = firstDay.toISOString().split('T')[0];
        if (toDateEl) toDateEl.value = lastDay.toISOString().split('T')[0];
    }
    
    setupEventListeners() {
        // Tab switching
        const revenueTab = document.getElementById('revenueTab');
        const frontDeskTab = document.getElementById('frontDeskTab');
        
        if (revenueTab) {
            revenueTab.addEventListener('click', () => this.switchTab('revenue'));
        }
        if (frontDeskTab) {
            frontDeskTab.addEventListener('click', () => this.switchTab('frontdesk'));
        }
        
        // Generate Report button
        const generateBtn = document.getElementById('generateReport');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.loadReportData());
        }
        
        // Print Report button
        const printBtn = document.getElementById('printReport');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printReport());
        }
        
        // Export Report button
        const exportBtn = document.getElementById('exportReport');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }
        
        // Date range changes
        const fromDateEl = document.getElementById('fromDate');
        const toDateEl = document.getElementById('toDate');
        
        if (fromDateEl) {
            fromDateEl.addEventListener('change', () => this.validateDateRange());
        }
        if (toDateEl) {
            toDateEl.addEventListener('change', () => this.validateDateRange());
        }
        
        // Front desk specific buttons
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        const refreshFrontDeskBtn = document.getElementById('refreshFrontDeskBtn');
        
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllReportsRead());
        }
        if (refreshFrontDeskBtn) {
            refreshFrontDeskBtn.addEventListener('click', () => this.loadFrontDeskReports());
        }
        
        // Setup common event listeners
        this.setupCommonEventListeners();
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab appearance
        const revenueTab = document.getElementById('revenueTab');
        const frontDeskTab = document.getElementById('frontDeskTab');
        const revenueContent = document.getElementById('revenueContent');
        const frontDeskContent = document.getElementById('frontDeskContent');
        
        if (tab === 'revenue') {
            if (revenueTab) {
                revenueTab.className = 'py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm';
            }
            if (frontDeskTab) {
                frontDeskTab.className = 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm';
            }
            if (revenueContent) revenueContent.classList.remove('hidden');
            if (frontDeskContent) frontDeskContent.classList.add('hidden');
        } else {
            if (frontDeskTab) {
                frontDeskTab.className = 'py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm';
            }
            if (revenueTab) {
                revenueTab.className = 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm';
            }
            if (frontDeskContent) frontDeskContent.classList.remove('hidden');
            if (revenueContent) revenueContent.classList.add('hidden');
            
            // Load front desk reports when switching to that tab
            this.loadFrontDeskReports();
        }
    }
    
    async loadUnreadCount() {
        try {
            const response = await this.api.get('/api/admin/pages/reports.php', {
                params: { action: 'unread_count' }
            });
            
            const data = response.data;
            
            if (data.success) {
                this.unreadCount = data.unread_count;
                this.updateUnreadBadges();
            }
            
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    }
    
    updateUnreadBadges() {
        const badges = ['unreadBadge', 'unreadBadge2'];
        badges.forEach(id => {
            const badge = document.getElementById(id);
            if (badge) {
                if (this.unreadCount > 0) {
                    badge.textContent = this.unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        });
    }
    
    async loadFrontDeskReports() {
        try {
            console.log('Loading front desk reports...');
            
            const fromDate = document.getElementById('fromDate')?.value || this.getDefaultFromDate();
            const toDate = document.getElementById('toDate')?.value || this.getDefaultToDate();
            
            const response = await this.api.get('/api/admin/pages/reports.php', {
                params: {
                    from_date: fromDate,
                    to_date: toDate,
                    limit: 50,
                    offset: 0
                }
            });
            
            const data = response.data;
            
            if (data.success) {
                this.updateFrontDeskTable(data.reports || []);
            } else {
                throw new Error(data.error || 'Failed to load front desk reports');
            }
            
        } catch (error) {
            console.error('Failed to load front desk reports:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to load front desk reports: ' + errorMessage);
        }
    }
    
    updateFrontDeskTable(reports) {
        const tbody = document.getElementById('frontDeskReportsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No front desk reports found for selected period
                    </td>
                </tr>
            `;
            return;
        }
        
        reports.forEach(report => {
            const row = document.createElement('tr');
            row.className = `hover:bg-gray-50 ${!report.is_read ? 'bg-blue-50' : ''}`;
            
            const reportDate = this.formatDate(report.report_date, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            const submittedAt = this.formatDate(report.created_at, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const summary = report.summary ? 
                (report.summary.length > 100 ? report.summary.substring(0, 100) + '...' : report.summary) : 
                'No summary provided';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reportDate}
                    ${!report.is_read ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">New</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${report.staff_name || 'Unknown Staff'}</td>
                <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${summary}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${submittedAt}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="reportsManager.viewReport(${report.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${!report.is_read ? `<button onclick="reportsManager.markReportRead(${report.id})" class="text-green-600 hover:text-green-900">
                        <i class="fas fa-check"></i> Mark Read
                    </button>` : ''}
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    async viewReport(reportId) {
        try {
            const response = await this.api.get('/api/admin/pages/reports.php', {
                params: { id: reportId }
            });
            
            const data = response.data;
            
            if (data.success) {
                this.showReportModal(data.report);
                
                // Mark as read if not already
                if (!data.report.is_read) {
                    await this.markReportRead(reportId, false);
                }
            } else {
                throw new Error(data.error || 'Failed to load report');
            }
            
        } catch (error) {
            console.error('Failed to view report:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to load report: ' + errorMessage);
        }
    }
    
    showReportModal(report) {
        const modal = document.getElementById('reportViewModal');
        if (!modal) return;
        
        // Update modal content
        const elements = {
            modalReportDate: this.formatDate(report.report_date, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            modalStaffName: report.staff_name || 'Unknown Staff',
            modalSubmittedAt: this.formatDate(report.created_at, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            modalSummary: report.summary || 'No summary provided',
            modalNotes: report.daily_notes || 'No notes provided',
            modalIssues: report.issues_encountered || 'No issues reported',
            modalRecommendations: report.recommendations || 'No recommendations provided'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Update dashboard statistics if available
        const statsElement = document.getElementById('modalStats');
        if (statsElement && report.details && report.details.dashboard_stats) {
            const stats = report.details.dashboard_stats;
            statsElement.innerHTML = `
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Total Rooms:</strong> ${stats.total_rooms || 'N/A'}</div>
                    <div><strong>Available Rooms:</strong> ${stats.available_rooms || 'N/A'}</div>
                    <div><strong>Occupied Rooms:</strong> ${stats.occupied_rooms || 'N/A'}</div>
                    <div><strong>Maintenance Rooms:</strong> ${stats.maintenance_rooms || 'N/A'}</div>
                    <div><strong>Today's Bookings:</strong> ${stats.todays_bookings || 'N/A'}</div>
                    <div><strong>Check-ins Today:</strong> ${stats.checkins_today || 'N/A'}</div>
                    <div><strong>Check-outs Today:</strong> ${stats.checkouts_today || 'N/A'}</div>
                    <div><strong>Total Revenue:</strong> ${this.formatCurrency(stats.total_revenue || 0)}</div>
                </div>
            `;
        } else if (statsElement) {
            statsElement.textContent = 'No dashboard statistics available';
        }
        
        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    closeReportModal() {
        const modal = document.getElementById('reportViewModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    async markReportRead(reportId, showMessage = true) {
        try {
            const response = await this.api.put('/api/admin/pages/reports.php', {
                action: 'mark_read',
                report_id: reportId
            });
            
            const data = response.data;
            
            if (data.success) {
                if (showMessage) {
                    this.showSuccess('Report marked as read');
                }
                
                // Update unread count and refresh the table
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateUnreadBadges();
                this.loadFrontDeskReports();
            } else {
                throw new Error(data.error || 'Failed to mark report as read');
            }
            
        } catch (error) {
            console.error('Failed to mark report as read:', error);
            if (showMessage) {
                const errorMessage = error.response?.data?.error || error.message;
                this.showError('Failed to mark report as read: ' + errorMessage);
            }
        }
    }
    
    async markAllReportsRead() {
        try {
            // This would require a separate API endpoint for marking all as read
            // For now, we'll just refresh the count
            await this.loadUnreadCount();
            this.showSuccess('All reports marked as read');
            this.loadFrontDeskReports();
            
        } catch (error) {
            console.error('Failed to mark all reports as read:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to mark all reports as read: ' + errorMessage);
        }
    }
    
    validateDateRange() {
        const fromDateEl = document.getElementById('fromDate');
        const toDateEl = document.getElementById('toDate');
        
        if (!fromDateEl || !toDateEl) return true;
        
        const fromDate = new Date(fromDateEl.value);
        const toDate = new Date(toDateEl.value);
        
        if (fromDate > toDate) {
            this.showError('From date cannot be later than to date');
            return false;
        }
        
        // Check if date range is too large (more than 1 year)
        const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
            this.showWarning('Date range is larger than 1 year. Report may take longer to load.');
        }
        
        return true;
    }
    
    async loadReportData() {
        if (!this.validateDateRange()) return;
        
        try {
            console.log('Loading report data...');
            
            // Show loading state
            this.setLoadingState('reportsContent', true, 'Loading report data...');
            
            const fromDateEl = document.getElementById('fromDate');
            const toDateEl = document.getElementById('toDate');
            const reportTypeEl = document.getElementById('reportType');
            
            const fromDate = fromDateEl?.value || this.getDefaultFromDate();
            const toDate = toDateEl?.value || this.getDefaultToDate();
            const reportType = reportTypeEl?.value || 'summary';
            
            const response = await this.api.post('/api/admin/pages/reports.php', {
                from_date: fromDate,
                to_date: toDate,
                report_type: reportType,
                include_frontdesk: this.currentTab === 'frontdesk'
            });
            
            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load report data');
            }
            
            console.log('Report data loaded successfully:', data);
            this.currentData = data;
            
            // Update all sections with actual data
            this.updateSummaryCards(data);
            this.updateCharts(data);
            this.updateTables(data);
            
            // Hide loading state
            this.setLoadingState('reportsContent', false);
            
        } catch (error) {
            console.error('Failed to load report data:', error);
            const errorMessage = error.response?.data?.error || error.message;
            this.showError('Failed to load report data: ' + errorMessage);
            this.setLoadingState('reportsContent', false);
        }
    }
    
    getDefaultFromDate() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return firstDay.toISOString().split('T')[0];
    }
    
    getDefaultToDate() {
        const today = new Date();
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return lastDay.toISOString().split('T')[0];
    }
    
    updateSummaryCards(data) {
        if (!data.summary) {
            console.warn('No summary data available');
            return;
        }
        
        console.log('Updating summary cards with data:', data.summary);
        
        // Update total revenue
        const revenueEl = document.getElementById('totalRevenue');
        if (revenueEl) {
            const revenue = parseFloat(data.summary.total_revenue || 0);
            revenueEl.textContent = this.formatCurrency(revenue);
        }
        
        // Update bookings
        const bookingsEl = document.getElementById('totalBookings');
        if (bookingsEl) {
            bookingsEl.textContent = data.summary.total_bookings || 0;
        }
        
        // Update occupancy rate
        const occupancyEl = document.getElementById('occupancyRate');
        if (occupancyEl) {
            const rate = parseFloat(data.summary.occupancy_rate || 0);
            occupancyEl.textContent = rate.toFixed(1) + '%';
        }
        
        // Update customers
        const customersEl = document.getElementById('totalCustomers');
        if (customersEl) {
            customersEl.textContent = data.summary.total_customers || 0;
        }
    }
    
    initializeCharts() {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            this.charts.revenue = new Chart(revenueCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Revenue',
                        data: [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: 'rgb(59, 130, 246)',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Revenue: ₱' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Occupancy Chart
        const occupancyCtx = document.getElementById('occupancyChart');
        if (occupancyCtx) {
            this.charts.occupancy = new Chart(occupancyCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Occupied', 'Available'],
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: [
                            'rgb(34, 197, 94)',
                            'rgb(229, 231, 235)'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    updateCharts(data) {
        // Update Revenue Chart
        if (this.charts.revenue && data.revenue_trend) {
            const labels = data.revenue_trend.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const revenues = data.revenue_trend.map(item => parseFloat(item.revenue || 0));
            
            this.charts.revenue.data.labels = labels;
            this.charts.revenue.data.datasets[0].data = revenues;
            this.charts.revenue.update();
        } else if (this.charts.revenue) {
            // Fallback: show empty chart
            this.charts.revenue.data.labels = ['No Data'];
            this.charts.revenue.data.datasets[0].data = [0];
            this.charts.revenue.update();
        }
        
        // Update Occupancy Chart
        if (this.charts.occupancy && data.summary) {
            const occupancyRate = parseFloat(data.summary.occupancy_rate || 0);
            const availableRate = 100 - occupancyRate;
            
            this.charts.occupancy.data.datasets[0].data = [occupancyRate, availableRate];
            this.charts.occupancy.update();
        }
    }
    
    updateTables(data) {
        // Update Room Types Table
        this.updateRoomTypesTable(data.room_types || []);
        
        // Update Monthly Table
        this.updateMonthlyTable(data.monthly_data || []);
        
        // Update Transactions Table
        this.updateTransactionsTable(data.recent_transactions || []);
    }
    
    updateRoomTypesTable(roomTypes) {
        const tbody = document.getElementById('roomTypesTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (roomTypes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-4 text-center text-gray-500">
                        No room types data available for selected period
                    </td>
                </tr>
            `;
            return;
        }
        
        roomTypes.forEach(roomType => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            row.innerHTML = `
                <td class="px-4 py-4 text-sm text-gray-900">${roomType.type_name || 'Unknown'}</td>
                <td class="px-4 py-4 text-sm text-gray-500">${roomType.total_bookings || 0}</td>
                <td class="px-4 py-4 text-sm text-gray-500">${this.formatCurrency(roomType.total_revenue || 0)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    updateMonthlyTable(monthlyData) {
        const tbody = document.getElementById('monthlyTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (monthlyData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-4 text-center text-gray-500">
                        No monthly data available for selected period
                    </td>
                </tr>
            `;
            return;
        }
        
        monthlyData.forEach(month => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const avgRate = month.total_bookings > 0 ? 
                (parseFloat(month.total_revenue || 0) / parseInt(month.total_bookings)) : 0;
            
            row.innerHTML = `
                <td class="px-4 py-4 text-sm text-gray-900">${month.month || 'Unknown'}</td>
                <td class="px-4 py-4 text-sm text-gray-500">${month.total_bookings || 0}</td>
                <td class="px-4 py-4 text-sm text-gray-500">${this.formatCurrency(month.total_revenue || 0)}</td>
                <td class="px-4 py-4 text-sm text-gray-500">${this.formatCurrency(avgRate)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    updateTransactionsTable(transactions) {
        const tbody = document.getElementById('transactionsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No recent transactions found
                    </td>
                </tr>
            `;
            return;
        }
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const date = this.formatDate(transaction.created_at, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            // Status badge color
            let statusClass = 'bg-green-100 text-green-800';
            const status = (transaction.status || '').toLowerCase();
            if (status.includes('pending')) {
                statusClass = 'bg-yellow-100 text-yellow-800';
            } else if (status.includes('cancelled')) {
                statusClass = 'bg-red-100 text-red-800';
            } else if (status.includes('confirmed')) {
                statusClass = 'bg-blue-100 text-blue-800';
            }
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.customer_name || 'Walk-in Guest'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Room ${transaction.room_number || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatCurrency(transaction.total_amount || 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${transaction.status || 'Unknown'}
                    </span>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    printReport() {
        // Set print date
        const printDate = document.getElementById('printDate');
        if (printDate) {
            printDate.textContent = this.formatDate(new Date(), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Print the page
        window.print();
    }
    
    exportReport() {
        if (!this.currentData || !this.currentData.success) {
            this.showError('No data to export. Please generate a report first.');
            return;
        }
        
        try {
            // Create CSV content
            let csvContent = "data:text/csv;charset=utf-8,";
            
            // Add header
            const fromDateEl = document.getElementById('fromDate');
            const toDateEl = document.getElementById('toDate');
            const reportTypeEl = document.getElementById('reportType');
            
            const fromDate = fromDateEl?.value || this.getDefaultFromDate();
            const toDate = toDateEl?.value || this.getDefaultToDate();
            const reportType = reportTypeEl?.value || 'summary';
            
            csvContent += `Hotel Management System - Revenue Report\n`;
            csvContent += `Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}\n`;
            csvContent += `Period: ${fromDate} to ${toDate}\n`;
            csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
            
            // Add summary
            if (this.currentData.summary) {
                csvContent += "Summary\n";
                csvContent += "Metric,Value\n";
                csvContent += `Total Revenue,${this.currentData.summary.total_revenue || 0}\n`;
                csvContent += `Total Bookings,${this.currentData.summary.total_bookings || 0}\n`;
                csvContent += `Occupancy Rate,${this.currentData.summary.occupancy_rate || 0}%\n`;
                csvContent += `Total Customers,${this.currentData.summary.total_customers || 0}\n\n`;
            }
            
            // Add room types data
            if (this.currentData.room_types && this.currentData.room_types.length > 0) {
                csvContent += "Room Types Performance\n";
                csvContent += "Room Type,Bookings,Revenue\n";
                this.currentData.room_types.forEach(roomType => {
                    csvContent += `${roomType.type_name || 'Unknown'},${roomType.total_bookings || 0},${roomType.total_revenue || 0}\n`;
                });
                csvContent += "\n";
            }
            
            // Add monthly data
            if (this.currentData.monthly_data && this.currentData.monthly_data.length > 0) {
                csvContent += "Monthly Performance\n";
                csvContent += "Month,Bookings,Revenue,Average Rate\n";
                this.currentData.monthly_data.forEach(month => {
                    const avgRate = month.total_bookings > 0 ? 
                        (parseFloat(month.total_revenue || 0) / parseInt(month.total_bookings)).toFixed(2) : '0.00';
                    csvContent += `${month.month || 'Unknown'},${month.total_bookings || 0},${month.total_revenue || 0},${avgRate}\n`;
                });
                csvContent += "\n";
            }
            
            // Add recent transactions
            if (this.currentData.recent_transactions && this.currentData.recent_transactions.length > 0) {
                csvContent += "Recent Transactions\n";
                csvContent += "Date,Customer,Room,Amount,Status\n";
                this.currentData.recent_transactions.forEach(transaction => {
                    const date = this.formatDate(transaction.created_at);
                    csvContent += `${date},${transaction.customer_name || 'Walk-in Guest'},Room ${transaction.room_number || 'N/A'},${transaction.total_amount || 0},${transaction.status || 'Unknown'}\n`;
                });
            }
            
            // Add front desk reports if available
            if (this.currentData.frontdesk_reports && this.currentData.frontdesk_reports.length > 0) {
                csvContent += "\nFront Desk Reports\n";
                csvContent += "Date,Staff,Summary,Submitted\n";
                this.currentData.frontdesk_reports.forEach(report => {
                    const date = this.formatDate(report.report_date);
                    const submitted = this.formatDate(report.created_at);
                    const summary = (report.summary || '').replace(/,/g, ';').replace(/\n/g, ' ');
                    csvContent += `${date},${report.staff_name || 'Unknown'},${summary},${submitted}\n`;
                });
            }
            
            // Create and download file
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `revenue_report_${fromDate}_to_${toDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Report exported successfully!');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export report: ' + error.message);
        }
    }
    
    // Cleanup method
    destroy() {
        super.destroy();
        
        // Cleanup charts if needed
        if (this.charts) {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
        }
    }
}

// Initialize reports manager when DOM is loaded
let reportsManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing reports manager...');
    reportsManager = new ReportsManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (reportsManager) {
        reportsManager.destroy();
    }
});

// Global functions for onclick handlers
window.reportsManager = {
    viewReport: (reportId) => reportsManager?.viewReport(reportId),
    markReportRead: (reportId) => reportsManager?.markReportRead(reportId),
    closeReportModal: () => reportsManager?.closeReportModal()
};
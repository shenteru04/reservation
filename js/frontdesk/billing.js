// js/frontdesk/billing.js - Fixed Front Desk Billing Management
class FrontdeskBillingManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.invoices = [];
        this.reservations = [];
        this.currentEditId = null;
        this.filterTimeout = null;
        this.init();
    }
    
    async init() {
        try {
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Load initial data
            await this.loadInvoices();
            await this.loadActiveReservations();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load specific reservation if URL parameter exists
            const urlParams = new URLSearchParams(window.location.search);
            const reservationId = urlParams.get('reservation_id');
            if (reservationId) {
                this.openCreateInvoiceModal(reservationId);
            }
            
            console.log('Front desk billing manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize front desk billing manager:', error);
            this.showError('Failed to initialize billing system: ' + error.message);
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/check.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.authenticated) {
                window.location.href = `${this.baseURL}/auth/login.html`;
                return false;
            }
            
            // Update admin name
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl && result.user) {
                const userName = result.user.name || 
                    `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || 
                    'Front Desk Staff';
                adminNameEl.textContent = userName;
            }
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showError('Authentication failed. Please refresh the page.');
            return false;
        }
    }
    
    async loadInvoices() {
        try {
            const params = this.buildFilterParams();
            const url = params ? `${this.baseURL}/api/frontdesk/billing.php?${params}` : `${this.baseURL}/api/frontdesk/billing.php`;
            
            const response = await fetch(url, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load invoices');
            }
            
            this.invoices = data.invoices || [];
            this.renderInvoices();
            this.updateBillingStats();
            
        } catch (error) {
            console.error('Failed to load invoices:', error);
            this.showError('Failed to load invoices: ' + error.message);
            this.renderEmptyState();
        }
    }
    
    buildFilterParams() {
        const params = new URLSearchParams();
        let hasFilters = false;
        
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            params.append('search', searchInput.value.trim());
            hasFilters = true;
        }
        
        // Payment status filter
        const statusFilter = document.getElementById('paymentStatusFilter');
        if (statusFilter && statusFilter.value && statusFilter.value !== '') {
            // Map the filter values to status text
            const statusMap = { 
                '1': 'Paid', 
                '2': 'Unpaid', 
                '3': 'Pending',
                'paid': 'Paid',
                'unpaid': 'Unpaid', 
                'pending': 'Pending'
            };
            const status = statusMap[statusFilter.value.toLowerCase()] || statusFilter.value;
            params.append('payment_status', status);
            hasFilters = true;
        }
        
        // Payment method filter
        const methodFilter = document.getElementById('paymentMethodFilter');
        if (methodFilter && methodFilter.value && methodFilter.value !== '') {
            params.append('payment_method', methodFilter.value);
            hasFilters = true;
        }
        
        // Date from filter
        const dateFromFilter = document.getElementById('dateFromFilter');
        if (dateFromFilter && dateFromFilter.value) {
            params.append('date_from', dateFromFilter.value);
            hasFilters = true;
        }
        
        // Date to filter (if exists)
        const dateToFilter = document.getElementById('dateToFilter');
        if (dateToFilter && dateToFilter.value) {
            params.append('date_to', dateToFilter.value);
            hasFilters = true;
        }
        
        return hasFilters ? params.toString() : '';
    }
    
    async loadActiveReservations() {
        try {
            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load reservations');
            }
            
            this.reservations = data.reservations || [];
            this.populateReservationSelect();
            
        } catch (error) {
            console.error('Failed to load reservations:', error);
            this.showError('Failed to load reservations: ' + error.message);
            this.reservations = [];
            this.populateReservationSelect();
        }
    }
    
    populateReservationSelect() {
        const select = document.getElementById('reservationSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Reservation</option>';
        
        // Filter for reservations that can have invoices
        const eligibleReservations = this.reservations.filter(r => 
            [2, 3, 4].includes(r.reservation_status_id) // Confirmed, Checked-in, or Checked-out
        );
        
        eligibleReservations.forEach(reservation => {
            const option = document.createElement('option');
            option.value = reservation.reservation_id;
            option.textContent = `#${reservation.reservation_id} - ${reservation.customer_name} - Room ${reservation.room_number}`;
            option.setAttribute('data-amount', reservation.total_amount);
            option.setAttribute('data-customer', reservation.customer_name);
            select.appendChild(option);
        });
    }
    
    renderInvoices() {
        const tbody = document.getElementById('billingTableBody');
        if (!tbody) return;
        
        if (this.invoices.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        tbody.innerHTML = this.invoices.map(invoice => this.createInvoiceRow(invoice)).join('');
        
        // Update total count
        const totalInvoicesEl = document.getElementById('totalInvoices');
        if (totalInvoicesEl) {
            totalInvoicesEl.textContent = this.invoices.length;
        }
    }
    
    createInvoiceRow(invoice) {
        const statusColors = {
            'Paid': 'bg-green-100 text-green-800',
            'Unpaid': 'bg-red-100 text-red-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-blue-100 text-blue-800'
        };
        
        const statusClass = statusColors[invoice.payment_status] || 'bg-gray-100 text-gray-800';
        const balance = parseFloat(invoice.balance || 0);
        const createdDate = new Date(invoice.created_at).toLocaleDateString();
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${invoice.invoice_number}</div>
                    <div class="text-sm text-gray-500">${createdDate}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${invoice.customer_name}</div>
                    <div class="text-sm text-gray-500">${invoice.email || 'No email'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">#${invoice.reservation_id}</div>
                    <div class="text-sm text-gray-500">Room ${invoice.room_number}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">₱${parseFloat(invoice.total_amount).toLocaleString()}</div>
                    <div class="text-sm text-gray-500">Paid: ₱${parseFloat(invoice.paid_amount || 0).toLocaleString()}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${invoice.payment_method || 'Cash'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${invoice.payment_status}
                    </span>
                    ${balance > 0 ? `<div class="text-xs text-red-600 mt-1">Balance: ₱${balance.toLocaleString()}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                        <button onclick="billingManager.viewInvoice(${invoice.invoice_id})" 
                                class="text-blue-600 hover:text-blue-900 p-1" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${balance > 0 ? `
                            <button onclick="billingManager.recordPayment(${invoice.invoice_id})" 
                                    class="text-green-600 hover:text-green-900 p-1" title="Record Payment">
                                <i class="fas fa-credit-card"></i>
                            </button>
                        ` : ''}
                        <button onclick="billingManager.printInvoice(${invoice.invoice_id})" 
                                class="text-purple-600 hover:text-purple-900 p-1" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    renderEmptyState() {
        const tbody = document.getElementById('billingTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-receipt text-4xl text-gray-300 mb-4"></i>
                        <p class="text-lg font-medium">No invoices found</p>
                        <p class="text-sm">Create an invoice to get started</p>
                    </div>
                </td>
            </tr>
        `;
        
        const totalInvoicesEl = document.getElementById('totalInvoices');
        if (totalInvoicesEl) {
            totalInvoicesEl.textContent = '0';
        }
    }
    
    updateBillingStats() {
        const stats = {
            totalRevenue: 0,
            paidInvoices: 0,
            unpaidInvoices: 0,
            pendingAmount: 0
        };
        
        this.invoices.forEach(invoice => {
            const total = parseFloat(invoice.total_amount || 0);
            const paid = parseFloat(invoice.paid_amount || 0);
            const balance = total - paid;
            
            if (invoice.payment_status === 'Paid') {
                stats.totalRevenue += total;
                stats.paidInvoices++;
            } else {
                stats.unpaidInvoices++;
                stats.pendingAmount += balance;
            }
        });
        
        // Update UI
        const elements = {
            totalRevenue: document.getElementById('totalRevenue'),
            paidInvoices: document.getElementById('paidInvoices'),
            unpaidInvoices: document.getElementById('unpaidInvoices'),
            pendingAmount: document.getElementById('pendingAmount')
        };
        
        if (elements.totalRevenue) {
            elements.totalRevenue.textContent = `₱${stats.totalRevenue.toLocaleString()}`;
        }
        if (elements.paidInvoices) {
            elements.paidInvoices.textContent = stats.paidInvoices;
        }
        if (elements.unpaidInvoices) {
            elements.unpaidInvoices.textContent = stats.unpaidInvoices;
        }
        if (elements.pendingAmount) {
            elements.pendingAmount.textContent = `₱${stats.pendingAmount.toLocaleString()}`;
        }
    }
    
    setupEventListeners() {
        // Create invoice button
        const createBillBtn = document.getElementById('createBillBtn');
        if (createBillBtn) {
            createBillBtn.addEventListener('click', () => this.openCreateInvoiceModal());
        }
        
        // Modal close buttons
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeBillingModal());
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeBillingModal());
        }
        
        // Form submission
        const billingForm = document.getElementById('billingForm');
        if (billingForm) {
            billingForm.addEventListener('submit', (e) => this.handleInvoiceSubmission(e));
        }
        
        // Reservation selection
        const reservationSelect = document.getElementById('reservationSelect');
        if (reservationSelect) {
            reservationSelect.addEventListener('change', (e) => this.handleReservationSelection(e));
        }
        
        // Amount calculation
        const totalAmount = document.getElementById('totalAmount');
        const paidAmount = document.getElementById('paidAmount');
        
        if (totalAmount) {
            totalAmount.addEventListener('input', () => this.calculateBalance());
        }
        if (paidAmount) {
            paidAmount.addEventListener('input', () => this.calculateBalance());
        }
        
        // Filters - Fixed implementation
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.debounceFilter());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.loadInvoices();
                }
            });
        }
        
        const statusFilter = document.getElementById('paymentStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                console.log('Status filter changed to:', statusFilter.value);
                this.loadInvoices();
            });
        }
        
        const methodFilter = document.getElementById('paymentMethodFilter');
        if (methodFilter) {
            methodFilter.addEventListener('change', () => {
                console.log('Method filter changed to:', methodFilter.value);
                this.loadInvoices();
            });
        }
        
        const dateFromFilter = document.getElementById('dateFromFilter');
        if (dateFromFilter) {
            dateFromFilter.addEventListener('change', () => {
                console.log('Date from filter changed to:', dateFromFilter.value);
                this.loadInvoices();
            });
        }
        
        const dateToFilter = document.getElementById('dateToFilter');
        if (dateToFilter) {
            dateToFilter.addEventListener('change', () => {
                console.log('Date to filter changed to:', dateToFilter.value);
                this.loadInvoices();
            });
        }
        
        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                console.log('Clearing all filters');
                this.clearAllFilters();
            });
        }
        
        // Add refresh button handler
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refreshing data');
                this.loadInvoices();
            });
        }
        
        // Payment modal
        const closePaymentModal = document.getElementById('closePaymentModal');
        if (closePaymentModal) {
            closePaymentModal.addEventListener('click', () => this.closePaymentModal());
        }
        
        const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
        if (cancelPaymentBtn) {
            cancelPaymentBtn.addEventListener('click', () => this.closePaymentModal());
        }
        
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentSubmission(e));
        }
    }
    
    debounceFilter() {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        
        this.filterTimeout = setTimeout(() => {
            console.log('Debounced search triggered');
            this.loadInvoices();
        }, 500);
    }
    
    clearAllFilters() {
        // Clear all filter inputs
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        const statusFilter = document.getElementById('paymentStatusFilter');
        if (statusFilter) statusFilter.value = '';
        
        const methodFilter = document.getElementById('paymentMethodFilter');
        if (methodFilter) methodFilter.value = '';
        
        const dateFromFilter = document.getElementById('dateFromFilter');
        if (dateFromFilter) dateFromFilter.value = '';
        
        const dateToFilter = document.getElementById('dateToFilter');
        if (dateToFilter) dateToFilter.value = '';
        
        // Reload data
        this.loadInvoices();
    }
    
    openCreateInvoiceModal(reservationId = null) {
        // Reset form
        const form = document.getElementById('billingForm');
        if (form) {
            form.reset();
        }
        
        // Pre-select reservation if provided
        if (reservationId) {
            const select = document.getElementById('reservationSelect');
            if (select) {
                select.value = reservationId;
                this.handleReservationSelection({ target: select });
            }
        }
        
        // Generate invoice number
        this.generateInvoiceNumber();
        
        // Show modal
        const modal = document.getElementById('billingModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    closeBillingModal() {
        const modal = document.getElementById('billingModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        
        // Reset form
        const form = document.getElementById('billingForm');
        if (form) {
            form.reset();
        }
        
        this.currentEditId = null;
    }
    
    generateInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        
        const invoiceNumber = `INV-${year}${month}${random}`;
        
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        if (invoiceNumberInput) {
            invoiceNumberInput.value = invoiceNumber;
        }
    }
    
    handleReservationSelection(e) {
        const selectedOption = e.target.selectedOptions[0];
        if (!selectedOption || !selectedOption.value) {
            this.clearAmountFields();
            return;
        }
        
        const amount = selectedOption.dataset.amount || '0';
        const totalAmountInput = document.getElementById('totalAmount');
        
        if (totalAmountInput) {
            totalAmountInput.value = parseFloat(amount).toFixed(2);
            this.calculateBalance();
        }
    }
    
    clearAmountFields() {
        const totalAmount = document.getElementById('totalAmount');
        const balance = document.getElementById('balance');
        
        if (totalAmount) totalAmount.value = '';
        if (balance) balance.value = '';
    }
    
    calculateBalance() {
        const totalAmount = parseFloat(document.getElementById('totalAmount')?.value || 0);
        const paidAmount = parseFloat(document.getElementById('paidAmount')?.value || 0);
        
        const balance = Math.max(0, totalAmount - paidAmount);
        
        const balanceInput = document.getElementById('balance');
        if (balanceInput) {
            balanceInput.value = balance.toFixed(2);
        }
        
        // Update payment status based on amounts
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            if (balance === 0 && totalAmount > 0) {
                paymentStatus.value = '1'; // Paid
            } else if (paidAmount > 0 && balance > 0) {
                paymentStatus.value = '3'; // Pending/Partial
            } else {
                paymentStatus.value = '2'; // Unpaid
            }
        }
    }
    
    async handleInvoiceSubmission(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            action: 'create_invoice',
            reservation_id: parseInt(formData.get('reservationSelect')),
            total_amount: parseFloat(formData.get('totalAmount')),
            paid_amount: parseFloat(formData.get('paidAmount')) || 0,
            payment_method: formData.get('paymentMethod') || null,
            payment_status: this.getPaymentStatusText(formData.get('paymentStatus')),
            notes: formData.get('notes') || ''
        };
        
        if (!data.reservation_id || !data.total_amount) {
            this.showError('Please select a reservation and enter the total amount');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading-spinner mr-2"></div>Creating Invoice...';
            
            const response = await fetch(`${this.baseURL}/api/frontdesk/billing.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create invoice');
            }
            
            this.showSuccess('Invoice created successfully');
            this.closeBillingModal();
            await this.loadInvoices();
            
        } catch (error) {
            console.error('Failed to create invoice:', error);
            this.showError('Failed to create invoice: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    getPaymentStatusText(statusId) {
        const statusMap = {
            '1': 'Paid',
            '2': 'Unpaid',
            '3': 'Pending'
        };
        return statusMap[statusId] || 'Unpaid';
    }
    
    async viewInvoice(invoiceId) {
        try {
            const response = await fetch(`${this.baseURL}/api/frontdesk/billing.php?endpoint=invoice&id=${invoiceId}`, {
                credentials: 'same-origin'
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load invoice');
            }
            
            this.showInvoiceDetails(data.invoice);
            
        } catch (error) {
            console.error('Failed to load invoice:', error);
            this.showError('Failed to load invoice details: ' + error.message);
        }
    }
    
    showInvoiceDetails(invoice) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Invoice Details</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 class="font-medium text-gray-700">Invoice Information</h4>
                                    <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                    <p><strong>Created:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
                                    <p><strong>Status:</strong> <span class="px-2 py-1 rounded text-sm ${this.getStatusColor(invoice.payment_status)}">${invoice.payment_status}</span></p>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-700">Customer Information</h4>
                                    <p><strong>Name:</strong> ${invoice.customer_name}</p>
                                    <p><strong>Email:</strong> ${invoice.email || 'N/A'}</p>
                                    <p><strong>Phone:</strong> ${invoice.phone_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-700 mb-2">Reservation Details</h4>
                            <p><strong>Reservation ID:</strong> #${invoice.reservation_id}</p>
                            <p><strong>Room:</strong> ${invoice.room_number} (${invoice.room_type_name})</p>
                            <p><strong>Check-in:</strong> ${new Date(invoice.check_in_date).toLocaleDateString()}</p>
                            <p><strong>Check-out:</strong> ${new Date(invoice.check_out_date).toLocaleDateString()}</p>
                        </div>
                        
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-medium text-blue-800 mb-2">Payment Summary</h4>
                            <div class="space-y-1">
                                <div class="flex justify-between">
                                    <span>Total Amount:</span>
                                    <span class="font-medium">₱${parseFloat(invoice.total_amount).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Paid Amount:</span>
                                    <span class="font-medium text-green-600">₱${parseFloat(invoice.paid_amount || 0).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between border-t pt-1">
                                    <span class="font-medium">Balance:</span>
                                    <span class="font-medium ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}">
                                        ₱${Math.abs(invoice.balance).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    getStatusColor(status) {
        const colors = {
            'Paid': 'bg-green-100 text-green-800',
            'Unpaid': 'bg-red-100 text-red-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-blue-100 text-blue-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }
    
    recordPayment(invoiceId) {
        const invoice = this.invoices.find(inv => inv.invoice_id === invoiceId);
        if (!invoice) {
            this.showError('Invoice not found');
            return;
        }
        
        const balance = parseFloat(invoice.balance || 0);
        if (balance <= 0) {
            this.showError('This invoice is already fully paid');
            return;
        }
        
        // Set payment details
        document.getElementById('paymentBillingId').value = invoiceId;
        document.getElementById('outstandingBalance').value = `₱${balance.toLocaleString()}`;
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentAmount').max = balance;
        document.getElementById('paymentMethodSelect').value = '';
        
        // Show payment modal
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        
        // Reset form
        const form = document.getElementById('paymentForm');
        if (form) {
            form.reset();
        }
    }
    
    async handlePaymentSubmission(e) {
        e.preventDefault();
        
        const billingId = parseInt(document.getElementById('paymentBillingId').value);
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const paymentMethod = document.getElementById('paymentMethodSelect').value;
        
        if (!billingId || !amount || !paymentMethod) {
            this.showError('Please fill in all payment details');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading-spinner mr-2"></div>Recording Payment...';
            
            const response = await fetch(`${this.baseURL}/api/frontdesk/billing.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'record_payment',
                    invoice_id: billingId,
                    amount: amount,
                    payment_method: this.getPaymentMethodText(paymentMethod)
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to record payment');
            }
            
            this.showSuccess('Payment recorded successfully');
            this.closePaymentModal();
            await this.loadInvoices();
            
        } catch (error) {
            console.error('Failed to record payment:', error);
            this.showError('Failed to record payment: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    getPaymentMethodText(methodId) {
        const methodMap = {
            '1': 'cash',
            '2': 'gcash',
            '3': 'bank_transfer',
            'cash': 'cash',
            'gcash': 'gcash',
            'bank_transfer': 'bank_transfer'
        };
        return methodMap[methodId] || 'cash';
    }
    
    printInvoice(invoiceId) {
        const invoice = this.invoices.find(inv => inv.invoice_id === invoiceId);
        if (!invoice) {
            this.showError('Invoice not found');
            return;
        }
        
        const printContent = this.generatePrintContent(invoice);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }
    
    generatePrintContent(invoice) {
        const createdDate = new Date(invoice.created_at).toLocaleDateString();
        const checkIn = new Date(invoice.check_in_date).toLocaleDateString();
        const checkOut = new Date(invoice.check_out_date).toLocaleDateString();
        const balance = parseFloat(invoice.balance || 0);
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${invoice.invoice_number}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .header { 
                        text-align: center; 
                        border-bottom: 2px solid #333;
                        margin-bottom: 20px; 
                        padding-bottom: 10px;
                    }
                    .invoice-info { 
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px; 
                    }
                    .customer-info, .reservation-info {
                        width: 48%;
                    }
                    .charges-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0;
                    }
                    .charges-table th, 
                    .charges-table td { 
                        border: 1px solid #333; 
                        padding: 8px; 
                        text-align: left; 
                    }
                    .charges-table th { 
                        background-color: #f0f0f0; 
                        font-weight: bold;
                    }
                    .total-row { 
                        font-weight: bold; 
                        background-color: #f9f9f9;
                    }
                    .footer {
                        margin-top: 30px;
                        border-top: 1px solid #333;
                        padding-top: 10px;
                        text-align: center;
                        font-size: 10px;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>HOTEL INVOICE</h1>
                    <p>Hotel Management System</p>
                </div>
                
                <div class="invoice-info">
                    <div class="customer-info">
                        <h3>Bill To:</h3>
                        <p><strong>${invoice.customer_name}</strong></p>
                        <p>${invoice.email || ''}</p>
                        <p>${invoice.phone_number || ''}</p>
                    </div>
                    <div class="reservation-info">
                        <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
                        <p><strong>Date:</strong> ${createdDate}</p>
                        <p><strong>Reservation #:</strong> ${invoice.reservation_id}</p>
                        <p><strong>Room:</strong> ${invoice.room_number}</p>
                        <p><strong>Check-in:</strong> ${checkIn}</p>
                        <p><strong>Check-out:</strong> ${checkOut}</p>
                    </div>
                </div>
                
                <table class="charges-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Rate</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Room Accommodation</td>
                            <td>1</td>
                            <td>₱${parseFloat(invoice.total_amount).toLocaleString()}</td>
                            <td style="text-align: right;">₱${parseFloat(invoice.total_amount).toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="3">TOTAL AMOUNT</td>
                            <td style="text-align: right;">₱${parseFloat(invoice.total_amount).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td colspan="3">Amount Paid</td>
                            <td style="text-align: right;">₱${parseFloat(invoice.paid_amount || 0).toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="3">BALANCE DUE</td>
                            <td style="text-align: right; ${balance > 0 ? 'color: red;' : 'color: green;'}">
                                ₱${Math.abs(balance).toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-top: 20px;">
                    <p><strong>Payment Status:</strong> ${invoice.payment_status}</p>
                    ${balance > 0 ? '<p style="color: red; font-weight: bold;">This invoice has an outstanding balance.</p>' : 
                                   '<p style="color: green; font-weight: bold;">This invoice is fully paid.</p>'}
                </div>
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>Printed on: ${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
        `;
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification-toast');
        existing.forEach(el => el.remove());
        
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-exclamation-circle'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification-toast fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded-lg shadow-lg z-50 max-w-md border flex items-center transform transition-all duration-300 translate-x-full`;
        notification.innerHTML = `
            <i class="${icons[type]} mr-3"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-4 text-lg hover:opacity-70">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Initialize billing manager when DOM is loaded
let billingManager;

document.addEventListener('DOMContentLoaded', () => {
    billingManager = new FrontdeskBillingManager();
});

// Make manager available globally for button click handlers
window.billingManager = billingManager;
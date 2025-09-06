// js/frontdesk/billing.js - Fixed Front Desk Billing Management with Payment Logs Support
class FrontdeskBillingManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.invoices = [];
        this.reservations = [];
        this.logs = []; // Store logs data
        this.currentEditId = null;
        this.filterTimeout = null;
        this.isInitializing = false;
        this.init();
    }

    async init() {
        if (this.isInitializing) {
            console.log('Already initializing, skipping...');
            return;
        }
        this.isInitializing = true;
        try {
            console.log('Starting front desk billing manager initialization...');
            this.showLoadingState();

            // Setup event listeners first
            console.log('Setting up event listeners...');
            this.setupEventListeners();

            // Start clock immediately
            this.startClock();

            // Load data with error handling
            console.log('Loading initial data...');
            await this.loadInvoicesWithFallback();
            await this.loadActiveReservationsWithFallback();

            // Handle URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const reservationId = urlParams.get('reservation_id');
            if (reservationId) {
                console.log('Opening create invoice modal for reservation:', reservationId);
                setTimeout(() => this.openCreateInvoiceModal(reservationId), 500);
            }

            // Always render something
            this.renderInvoices();
            this.updateBillingStats();
            console.log('Front desk billing manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize front desk billing manager:', error);
            this.showError('Failed to initialize billing system: ' + error.message);
            this.renderEmptyState();
        } finally {
            this.hideLoadingState();
            this.isInitializing = false;
        }
    }

    showLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
        const tbody = document.getElementById('billingTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                            <p class="text-lg font-medium">Loading billing data...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    hideLoadingState() {
        console.log('Hiding loading state...');
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const clockElement = document.getElementById('currentDateTime');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    async loadInvoicesWithFallback() {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 15000)
            );
            await Promise.race([this.loadInvoices(), timeout]);
        } catch (error) {
            console.error('Failed to load invoices from API:', error);
            this.showError('Failed to load invoices. Please check your connection.');
            this.invoices = [];
        }
    }

    async loadActiveReservationsWithFallback() {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            );
            await Promise.race([this.loadActiveReservations(), timeout]);
        } catch (error) {
            console.error('Failed to load reservations from API:', error);
            this.showError('Failed to load reservations. Please check your connection.');
            this.reservations = [];
        }
        this.populateReservationSelect();
    }

    async loadInvoices() {
        try {
            const params = this.buildFilterParams();
            const url = params
                ? `${this.baseURL}/api/frontdesk/billing.php?${params}`
                : `${this.baseURL}/api/frontdesk/billing.php`;
            console.log('Loading invoices from:', url);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load invoices');
            }

            this.invoices = Array.isArray(data.invoices) ? data.invoices : [];
            console.log(`Loaded ${this.invoices.length} invoices from database`);
        } catch (error) {
            console.error('Failed to load invoices:', error);
            throw error;
        }
    }

    async loadActiveReservations() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php`, {
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load reservations');
            }

            this.reservations = Array.isArray(data.reservations) ? data.reservations : [];
            console.log(`Loaded ${this.reservations.length} reservations`);
        } catch (error) {
            console.error('Failed to load reservations:', error);
            throw error;
        }
    }

    buildFilterParams() {
        const params = new URLSearchParams();
        let hasFilters = false;

        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            params.append('search', searchInput.value.trim());
            hasFilters = true;
        }

        const statusFilter = document.getElementById('paymentStatusFilter');
        if (statusFilter && statusFilter.value) {
            params.append('status', statusFilter.value);
            hasFilters = true;
        }

        const methodFilter = document.getElementById('paymentMethodFilter');
        if (methodFilter && methodFilter.value) {
            params.append('payment_method', methodFilter.value);
            hasFilters = true;
        }

        const dateFromFilter = document.getElementById('dateFromFilter');
        if (dateFromFilter && dateFromFilter.value) {
            params.append('date_from', dateFromFilter.value);
            hasFilters = true;
        }

        const dateToFilter = document.getElementById('dateToFilter');
        if (dateToFilter && dateToFilter.value) {
            params.append('date_to', dateToFilter.value);
            hasFilters = true;
        }

        return hasFilters ? params.toString() : '';
    }

    populateReservationSelect() {
        const select = document.getElementById('reservationSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select Reservation</option>';
        const eligibleReservations = this.reservations.filter(r =>
            r && r.reservation_status_id && [2, 3, 4].includes(parseInt(r.reservation_status_id))
        );

        eligibleReservations.forEach(reservation => {
            const option = document.createElement('option');
            option.value = reservation.reservation_id || '';
            option.textContent = `#${reservation.reservation_id} - ${reservation.customer_name} - Room ${reservation.room_number}`;
            option.setAttribute('data-amount', reservation.total_amount || '0');
            option.setAttribute('data-customer', reservation.customer_name || '');
            option.setAttribute('data-email', reservation.email || '');
            option.setAttribute('data-room', reservation.room_number || 'N/A');
            select.appendChild(option);
        });
    }

    renderInvoices() {
        const tbody = document.getElementById('billingTableBody');
        if (!tbody) return;

        if (!Array.isArray(this.invoices) || this.invoices.length === 0) {
            this.renderEmptyState();
            return;
        }

        tbody.innerHTML = this.invoices.map(inv => this.createInvoiceRow(inv)).join('');
        const totalInvoicesEl = document.getElementById('totalInvoices');
        if (totalInvoicesEl) totalInvoicesEl.textContent = this.invoices.length;
    }

    createInvoiceRow(invoice) {
        if (!invoice) return '';

        const statusColors = {
            'Paid': 'bg-green-100 text-green-800',
            'Unpaid': 'bg-red-100 text-red-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-blue-100 text-blue-800'
        };
        const statusClass = statusColors[invoice.payment_status] || 'bg-gray-100 text-gray-800';
        const balance = parseFloat(invoice.balance || 0);
        const createdDate = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A';

        return `
            <tr class="hover:bg-gray-50 table-row">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${invoice.invoice_number || 'N/A'}</div>
                    <div class="text-sm text-gray-500">${createdDate}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${invoice.customer_name || 'N/A'}</div>
                    <div class="text-sm text-gray-500">${invoice.email || 'No email'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">#${invoice.reservation_id || 'N/A'}</div>
                    <div class="text-sm text-gray-500">Room ${invoice.room_number || 'N/A'}</div>
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
                        ${invoice.payment_status || 'Unknown'}
                    </span>
                    ${balance > 0 ? `<div class="text-xs text-red-600 mt-1">Balance: ₱${balance.toLocaleString()}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                        <button onclick="window.billingManager.viewInvoice(${invoice.invoice_id || 0})" 
                                class="text-blue-600 hover:text-blue-900 p-1" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${balance > 0 ? `
                            <button onclick="window.billingManager.recordPayment(${invoice.invoice_id || 0})" 
                                    class="text-green-600 hover:text-green-900 p-1" title="Record Payment">
                                <i class="fas fa-credit-card"></i>
                            </button>
                        ` : ''}
                        <button onclick="window.billingManager.printInvoice(${invoice.invoice_id || 0})" 
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
                        <button onclick="window.billingManager.openCreateInvoiceModal()" 
                                class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Create Invoice
                        </button>
                    </div>
                </td>
            </tr>
        `;

        const totalInvoicesEl = document.getElementById('totalInvoices');
        if (totalInvoicesEl) totalInvoicesEl.textContent = '0';
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
                stats.pendingAmount += Math.max(0, balance);
            }
        });

        this.updateStatElement('totalRevenue', `₱${stats.totalRevenue.toLocaleString()}`);
        this.updateStatElement('paidInvoices', stats.paidInvoices.toString());
        this.updateStatElement('unpaidInvoices', stats.unpaidInvoices.toString());
        this.updateStatElement('pendingAmount', `₱${stats.pendingAmount.toLocaleString()}`);
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    }

    setupEventListeners() {
        try {
            console.log('Setting up event listeners...');

            // Core buttons
            this.addEventListenerSafely('createBillBtn', 'click', () => this.openCreateInvoiceModal());
            this.addEventListenerSafely('viewLogsBtn', 'click', () => this.openLogsModal());

            // Modal close buttons
            this.addEventListenerSafely('closeModal', 'click', () => this.closeBillingModal());
            this.addEventListenerSafely('cancelBtn', 'click', () => this.closeBillingModal());
            this.addEventListenerSafely('closePaymentModal', 'click', () => this.closePaymentModal());
            this.addEventListenerSafely('cancelPaymentBtn', 'click', () => this.closePaymentModal());
            this.addEventListenerSafely('closeLogsModal', 'click', () => this.closeLogsModal());

            // Form submissions
            this.addEventListenerSafely('billingForm', 'submit', (e) => this.handleInvoiceSubmission(e));
            this.addEventListenerSafely('paymentForm', 'submit', (e) => this.handlePaymentSubmission(e));

            // Reservation & amount logic
            this.addEventListenerSafely('reservationSelect', 'change', (e) => this.handleReservationSelection(e));
            this.addEventListenerSafely('totalAmount', 'input', () => this.calculateBalance());
            this.addEventListenerSafely('paidAmount', 'input', () => this.calculateBalance());

            // Filters
            this.addEventListenerSafely('searchInput', 'input', () => this.debounceFilter());
            this.addEventListenerSafely('paymentStatusFilter', 'change', () => this.applyFilters());
            this.addEventListenerSafely('paymentMethodFilter', 'change', () => this.applyFilters());
            this.addEventListenerSafely('dateFromFilter', 'change', () => this.applyFilters());
            this.addEventListenerSafely('dateToFilter', 'change', () => this.applyFilters());
            this.addEventListenerSafely('clearFilters', 'click', () => this.clearAllFilters());
            this.addEventListenerSafely('refreshBtn', 'click', () => this.refreshData());

            // Logs modal
            this.addEventListenerSafely('applyLogFiltersBtn', 'click', () => this.applyLogFilters());
            this.addEventListenerSafely('clearLogFiltersBtn', 'click', () => this.clearLogFilters());
            this.addEventListenerSafely('exportLogsBtn', 'click', () => this.exportLogs());

            console.log('Event listeners setup completed');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    addEventListenerSafely(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`Event listener added for ${elementId}:${event}`);
        } else {
            console.warn(`Element ${elementId} not found for event listener`);
        }
    }

    async refreshData() {
        try {
            this.showLoadingState();
            await Promise.allSettled([
                this.loadInvoicesWithFallback(),
                this.loadActiveReservationsWithFallback()
            ]);
            this.renderInvoices();
            this.updateBillingStats();
            this.hideLoadingState();
            this.showSuccess('Data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.hideLoadingState();
            this.showError('Failed to refresh data');
        }
    }

    debounceFilter() {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            console.log('Debounced search triggered');
            this.applyFilters();
        }, 500);
    }

    async applyFilters() {
        try {
            await this.loadInvoicesWithFallback();
            this.renderInvoices();
            this.updateBillingStats();
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showError('Failed to apply filters');
        }
    }

    clearAllFilters() {
        try {
            const filterIds = ['searchInput', 'paymentStatusFilter', 'paymentMethodFilter', 'dateFromFilter', 'dateToFilter'];
            filterIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = '';
                }
            });
            this.applyFilters();
        } catch (error) {
            console.error('Error clearing filters:', error);
        }
    }

    openCreateInvoiceModal(reservationId = null) {
        const form = document.getElementById('billingForm');
        if (form) form.reset();

        if (reservationId) {
            const select = document.getElementById('reservationSelect');
            if (select) {
                select.value = reservationId;
                this.handleReservationSelection({ target: select });
            }
        }

        this.generateInvoiceNumber();
        const modal = document.getElementById('billingModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        } else {
            this.showError('Modal not found');
        }
    }

    closeBillingModal() {
        const modal = document.getElementById('billingModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        const form = document.getElementById('billingForm');
        if (form) form.reset();
        this.currentEditId = null;
    }

    generateInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const invoiceNumber = `INV-${year}${month}${random}`;
        const input = document.getElementById('invoiceNumber');
        if (input) input.value = invoiceNumber;
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
        ['totalAmount', 'paidAmount', 'balance'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    calculateBalance() {
        const total = parseFloat(document.getElementById('totalAmount')?.value || 0);
        const paid = parseFloat(document.getElementById('paidAmount')?.value || 0);
        const balance = Math.max(0, total - paid);
        const balanceInput = document.getElementById('balance');
        if (balanceInput) balanceInput.value = balance.toFixed(2);

        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            if (balance === 0 && total > 0) {
                paymentStatus.value = '1'; // Paid
            } else if (paid > 0) {
                paymentStatus.value = '3'; // Partial
            } else {
                paymentStatus.value = '2'; // Unpaid
            }
        }

        this.updateInvoicePreview();
    }

    updateInvoicePreview() {
        try {
            const invoiceNumber = document.getElementById('invoiceNumber')?.value || '-';
            const customer = document.getElementById('reservationSelect')?.selectedOptions[0]?.dataset.customer || '-';
            const totalAmount = document.getElementById('totalAmount')?.value || '0';
            const status = document.getElementById('paymentStatus')?.value;
            const statusText = { '1': '🟢 Paid', '2': '🔴 Unpaid', '3': '🟡 Pending' }[status] || '🔴 Unpaid';

            document.getElementById('previewInvoiceNumber').textContent = invoiceNumber;
            document.getElementById('previewCustomer').textContent = customer;
            document.getElementById('previewTotal').textContent = `₱${parseFloat(totalAmount).toLocaleString()}`;
            document.getElementById('previewStatus').textContent = statusText;

            const previewStatus = document.getElementById('previewStatus');
            if (previewStatus) {
                previewStatus.className = 'status-badge';
                if (status === '1') previewStatus.classList.add('status-paid');
                else if (status === '2') previewStatus.classList.add('status-unpaid');
                else if (status === '3') previewStatus.classList.add('status-pending');
            }
        } catch (error) {
            console.error('Error updating invoice preview:', error);
        }
    }

    async handleInvoiceSubmission(e) {
        e.preventDefault();
        try {
            console.log('Handling invoice submission...');
            const formData = new FormData(e.target);
            const data = {
                action: 'create_invoice',
                reservation_id: parseInt(formData.get('reservationSelect')),
                total_amount: parseFloat(formData.get('totalAmount')),
                paid_amount: parseFloat(formData.get('paidAmount')) || 0,
                payment_method: formData.get('paymentMethod') || null,
                payment_status: document.getElementById('paymentStatus').options[document.getElementById('paymentStatus').selectedIndex].text.replace(/^[🔴🟢🟡🔵]\s/, ''),
                notes: formData.get('notes') || ''
            };

            console.log('Invoice data:', data);

            if (!data.reservation_id || !data.total_amount) {
                this.showError('Please select a reservation and enter the total amount');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn?.innerHTML || 'Save Invoice';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>Creating...';
            }

            const response = await fetch(`${this.baseURL}/api/frontdesk/billing.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                const textResponse = await response.text();
                console.log('Raw response:', textResponse);
                throw new Error('Invalid response from server');
            }

            if (!result.success) {
                throw new Error(result.error || 'Failed to create invoice');
            }

            this.showSuccess('Invoice created successfully!');
            this.closeBillingModal();
            await this.refreshData();
        } catch (error) {
            console.error('Failed to create invoice:', error);
            this.showError('Failed to create invoice: ' + error.message);
        } finally {
            const submitBtn = document.querySelector('#billingForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i><span class="btn-text">Save Invoice</span>';
            }
        }
    }

    viewInvoice(invoiceId) {
    try {
        const invoice = this.invoices.find(inv => inv.invoice_id === invoiceId);
        if (!invoice) {
            this.showError('Invoice not found');
            return;
        }

        // Calculate balance and format dates
        const totalAmount = parseFloat(invoice.total_amount || 0);
        const paidAmount = parseFloat(invoice.paid_amount || 0);
        const balance = totalAmount - paidAmount;
        const createdDate = invoice.created_at 
            ? new Date(invoice.created_at).toLocaleDateString() 
            : 'N/A';

        // Format currency with proper locale
        const formatCurrency = (amount) => `₱${amount.toLocaleString('en-PH', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;

        // Build invoice details with better structure
        const invoiceDetails = this.buildInvoiceDetailsHTML({
            invoiceNumber: invoice.invoice_number || 'N/A',
            createdDate,
            customerName: invoice.customer_name || 'N/A',
            email: invoice.email || 'No email provided',
            roomNumber: invoice.room_number || 'N/A',
            totalAmount: formatCurrency(totalAmount),
            paidAmount: formatCurrency(paidAmount),
            balance: formatCurrency(balance),
            paymentMethod: invoice.payment_method || 'Cash',
            paymentStatus: invoice.payment_status || 'Pending',
            notes: invoice.notes || ''
        });

        // Display using SweetAlert2 with better styling
        Swal.fire({
            title: 'Invoice Details',
            html: invoiceDetails,
            width: '600px',
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Close',
            customClass: {
                popup: 'invoice-modal',
                title: 'invoice-modal-title',
                htmlContainer: 'invoice-modal-content'
            }
        });
        
    } catch (error) {
        console.error('Error viewing invoice:', error);
        this.showError('Failed to view invoice details. Please try again.');
    }
}

// Helper method to build formatted invoice details
buildInvoiceDetailsHTML(data) {
    return `
        <div class="invoice-details">
            <div class="invoice-header">
                <h3>Invoice #${data.invoiceNumber}</h3>
                <p class="invoice-date">Created: ${data.createdDate}</p>
            </div>
            
            <div class="invoice-section">
                <h4>Customer Information</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Name:</strong> ${data.customerName}
                    </div>
                    <div class="info-item">
                        <strong>Email:</strong> ${data.email}
                    </div>
                    <div class="info-item">
                        <strong>Room:</strong> ${data.roomNumber}
                    </div>
                </div>
            </div>
            
            <div class="invoice-section">
                <h4>Payment Information</h4>
                <div class="payment-grid">
                    <div class="payment-row">
                        <span class="payment-label">Total Amount:</span>
                        <span class="payment-amount">${data.totalAmount}</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Paid Amount:</span>
                        <span class="payment-amount paid">${data.paidAmount}</span>
                    </div>
                    <div class="payment-row balance-row">
                        <span class="payment-label"><strong>Balance:</strong></span>
                        <span class="payment-amount balance"><strong>${data.balance}</strong></span>
                    </div>
                </div>
                
                <div class="payment-info">
                    <div class="info-item">
                        <strong>Payment Method:</strong> ${data.paymentMethod}
                    </div>
                    <div class="info-item">
                        <strong>Status:</strong> 
                        <span class="status-badge status-${data.paymentStatus.toLowerCase()}">
                            ${data.paymentStatus}
                        </span>
                    </div>
                </div>
            </div>
            
            ${data.notes ? `
                <div class="invoice-section">
                    <h4>Notes</h4>
                    <p class="notes">${data.notes}</p>
                </div>
            ` : ''}
        </div>
        
        <style>
            .invoice-details {
                text-align: left;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .invoice-header {
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            
            .invoice-header h3 {
                margin: 0;
                color: #333;
                font-size: 1.5em;
            }
            
            .invoice-date {
                color: #666;
                margin: 5px 0 0 0;
            }
            
            .invoice-section {
                margin-bottom: 20px;
            }
            
            .invoice-section h4 {
                color: #444;
                margin-bottom: 10px;
                font-size: 1.1em;
                border-bottom: 1px solid #f0f0f0;
                padding-bottom: 5px;
            }
            
            .info-grid, .payment-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .info-item {
                background: #f9f9f9;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 0.9em;
            }
            
            .payment-grid {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            
            .payment-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            
            .payment-row:last-child {
                border-bottom: none;
            }
            
            .balance-row {
                margin-top: 10px;
                padding-top: 15px;
                border-top: 2px solid #dee2e6;
                font-size: 1.1em;
            }
            
            .payment-amount.balance {
                color: #dc3545;
            }
            
            .payment-amount.paid {
                color: #28a745;
            }
            
            .status-badge {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .status-paid {
                background: #d4edda;
                color: #155724;
            }
            
            .status-pending {
                background: #fff3cd;
                color: #856404;
            }
            
            .status-overdue {
                background: #f8d7da;
                color: #721c24;
            }
            
            .notes {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 4px;
                border-left: 4px solid #007bff;
                font-style: italic;
                margin: 0;
            }
        </style>
    `;
}
    recordPayment(invoiceId) {
        try {
            console.log('Recording payment for invoice:', invoiceId);
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

            const paymentBillingId = document.getElementById('paymentBillingId');
            const outstandingBalance = document.getElementById('outstandingBalance');
            const paymentAmount = document.getElementById('paymentAmount');
            const paymentMethodSelect = document.getElementById('paymentMethodSelect');

            if (paymentBillingId) paymentBillingId.value = invoiceId;
            if (outstandingBalance) outstandingBalance.value = `₱${balance.toLocaleString()}`;
            if (paymentAmount) {
                paymentAmount.value = '';
                paymentAmount.max = balance;
            }
            if (paymentMethodSelect) paymentMethodSelect.value = '';

            const modal = document.getElementById('paymentModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                console.log('Payment modal opened');
            } else {
                console.error('Payment modal not found');
                this.showError('Payment form not available');
            }
        } catch (error) {
            console.error('Error opening payment modal:', error);
            this.showError('Failed to open payment form');
        }
    }

    closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        const form = document.getElementById('paymentForm');
        if (form) {
            form.reset();
        }
    }

    async handlePaymentSubmission(e) {
        e.preventDefault();
        try {
            console.log('Handling payment submission...');
            const billingId = parseInt(document.getElementById('paymentBillingId').value);
            const amount = parseFloat(document.getElementById('paymentAmount').value);
            const paymentMethod = document.getElementById('paymentMethodSelect').value;
            const referenceNumber = document.getElementById('referenceNumber')?.value || '';
            const notes = document.getElementById('paymentNotes')?.value || '';

            if (!billingId || !amount || !paymentMethod) {
                this.showError('Please fill in all required payment details');
                return;
            }
            if (amount <= 0) {
                this.showError('Payment amount must be greater than zero');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent || 'Submit';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>Recording Payment...';
            }

            console.log('Making API request to record payment...');
            const data = {
                action: 'record_payment',
                invoice_id: billingId,
                amount: amount,
                payment_method: paymentMethod,
                reference_number: referenceNumber || 'PAY-' + Date.now(),
                notes: notes || 'Payment recorded via front desk'
            };

            console.log('Payment data:', data);
            const response = await fetch(`${this.baseURL}/api/frontdesk/billing.php`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('Payment recording response status:', response.status);
            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                const textResponse = await response.text();
                console.log('Raw response:', textResponse);
                throw new Error('Invalid response from server');
            }

            console.log('Payment recording result:', result);
            if (!response.ok || !result.success) {
                throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            this.showSuccess('Payment recorded successfully!');
            this.closePaymentModal();
            await this.refreshData();
            this.showSuccess('Payment recorded and data refreshed.');
        } catch (error) {
            console.error('Failed to record payment:', error);
            this.showError('Failed to record payment: ' + error.message);
        } finally {
            const submitBtn = document.querySelector('#paymentForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Record Payment';
            }
        }
    }

    printInvoice(invoiceId) {
        try {
            console.log('Printing invoice:', invoiceId);
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
        } catch (error) {
            console.error('Error printing invoice:', error);
            this.showError('Failed to print invoice');
        }
    }

    generatePrintContent(invoice) {
        return `
            <html>
            <head>
                <title>Invoice #${invoice.invoice_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; }
                    .info { margin: 15px 0; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .table th { background-color: #f2f2f2; }
                    .footer { margin-top: 30px; text-align: right; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">Invoice</div>
                    <div>Hotel Name</div>
                    <div>Contact Info</div>
                </div>
                <div class="info">
                    <strong>Invoice Number:</strong> ${invoice.invoice_number}<br>
                    <strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}<br>
                    <strong>Customer:</strong> ${invoice.customer_name}<br>
                    <strong>Room:</strong> ${invoice.room_number}
                </div>
                <table class="table">
                    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                    <tbody><tr><td>Room Charges & Services</td><td>₱${parseFloat(invoice.total_amount).toLocaleString()}</td></tr></tbody>
                </table>
                <div class="footer">
                    <strong>Total: ₱${parseFloat(invoice.total_amount).toLocaleString()}</strong><br>
                    <strong>Paid: ₱${parseFloat(invoice.paid_amount || 0).toLocaleString()}</strong><br>
                    <strong>Balance: ₱${parseFloat(invoice.balance || 0).toLocaleString()}</strong>
                </div>
            </body>
            </html>
        `;
    }

    // =============== PAYMENT LOGS MODAL FUNCTIONS ===============

    openLogsModal() {
        const modal = document.getElementById('logsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            this.loadPaymentLogs();
        } else {
            this.showError('Logs modal not found');
        }
    }

    closeLogsModal() {
        const modal = document.getElementById('logsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    async loadPaymentLogs() {
        try {
            const params = new URLSearchParams();
            const filters = ['logInvoiceFilter', 'logActionFilter', 'logDateFromFilter', 'logDateToFilter'];
            filters.forEach(id => {
                const el = document.getElementById(id);
                if (el?.value) params.append(id.replace('log', '').replace('Filter', '').toLowerCase(), el.value);
            });

            const url = `${this.baseURL}/api/frontdesk/billing.php?endpoint=payment_logs&${params}`;
            console.log('Loading logs from:', url);

            const response = await fetch(url, { method: 'GET', credentials: 'same-origin' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            this.logs = data.logs || [];
            this.renderPaymentLogs();
            this.updateLogCount();
        } catch (error) {
            console.error('Failed to load logs:', error);
            this.showError('Failed to load payment logs');
            this.renderEmptyLogs();
        }
    }

    renderPaymentLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;

        if (!this.logs.length) {
            this.renderEmptyLogs();
            return;
        }

        const logHtml = this.logs.map(log => {
            const timestamp = new Date(log.recorded_at).toLocaleString();
            const statusBadge = log.new_status
                ? `<span class="status-badge status-${log.new_status.toLowerCase().replace(/\s+/g, '-')}">${log.new_status}</span>`
                : '<span class="text-gray-500">—</span>';

            return `
                <div class="log-entry p-4 bg-white rounded-xl shadow-sm border-l-4 hover:shadow transition-shadow">
                    <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800">${log.action_type.replace('_', ' ').toUpperCase()}</div>
                            <div class="text-sm text-gray-600 mt-1">
                                <strong>Invoice:</strong> ${log.invoice_number} | 
                                <strong>Customer:</strong> ${log.customer_name} | 
                                <strong>Amount:</strong> ₱${parseFloat(log.amount).toLocaleString()}
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                <strong>Method:</strong> ${log.payment_method || 'N/A'} | 
                                <strong>Ref:</strong> ${log.reference_number || 'N/A'}
                            </div>
                            ${log.notes ? `<p class="text-sm text-gray-700 mt-2 italic">"${log.notes}"</p>` : ''}
                        </div>
                        <div class="text-right whitespace-nowrap">
                            <div class="log-timestamp">${timestamp}</div>
                            <div class="mt-1">${statusBadge}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = logHtml;
    }

    renderEmptyLogs() {
        const container = document.getElementById('logsContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-history text-4xl mb-3 opacity-50"></i>
                    <p class="text-lg">No logs found.</p>
                </div>
            `;
        }
    }

    updateLogCount() {
        const countEl = document.getElementById('logCount');
        if (countEl) countEl.textContent = this.logs.length;
    }

    applyLogFilters() {
        this.loadPaymentLogs();
    }

    clearLogFilters() {
        ['logInvoiceFilter', 'logActionFilter', 'logDateFromFilter', 'logDateToFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.loadPaymentLogs();
    }

    exportLogs() {
        if (!this.logs.length) {
            this.showWarning('No logs to export.');
            return;
        }

        const headers = ['Timestamp', 'Action', 'Invoice', 'Customer', 'Amount', 'Method', 'Status', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...this.logs.map(log => [
                `"${new Date(log.recorded_at).toLocaleString()}"`,
                `"${log.action_type}"`,
                `"${log.invoice_number}"`,
                `"${log.customer_name}"`,
                `"₱${parseFloat(log.amount).toLocaleString()}"`,
                `"${log.payment_method}"`,
                `"${log.new_status || 'N/A'}"`,
                `"${(log.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `payment_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Notification Helpers
    showSuccess(msg) {
        this.showNotification(msg, 'success');
    }

    showError(msg) {
        this.showNotification(msg, 'error');
    }

    showWarning(msg) {
        this.showNotification(msg, 'warning');
    }

    showNotification(msg, type) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white shadow-lg z-50 transition-opacity duration-300 ${type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-green-600'}`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// Initialize globally
let billingManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing billing manager...');
    billingManager = new FrontdeskBillingManager();
    window.billingManager = billingManager;
});
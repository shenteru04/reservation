/**
 * Sky Oro Hotel - Handyman Dashboard
 * Enhanced & Updated JavaScript to match PHP API
 * File: js/handyman/handydashboard.js
 */

class HandymanDashboard {
  constructor() {
    this.apiBaseURL = '../../api/handyman/handydashboard.php';
    this.baseURL = window.location.origin + '/reservation'; // Fixed: Added baseURL like frontdashboard
    this.currentUser = null;
    this.tasks = [];
    this.rooms = [];
    this.maintenanceTypes = [];
    this.maintenanceStatuses = [];
    this.timer = {
      isRunning: false,
      startTime: null,
      elapsed: 0,
      interval: null
    };
    
    // Configure request defaults like frontdashboard
    this.setupHttpClient();
    this.init();
  }

  setupHttpClient() {
    // Set up fetch defaults like frontdashboard
    this.fetchDefaults = {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    };
  }

  async init() {
    try {
      this.setupEventListeners();
      this.updateCurrentDate();
      await this.loadUserInfo();
      if (this.currentUser) {
        await this.loadMaintenanceTypes();
        await this.loadMaintenanceStatuses();
        await this.loadDashboardData();
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize dashboard. Please refresh.');
    }
  }

  setupEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout(); // Fixed: Use consistent method name
      });
    }

    const startTimerBtn = document.getElementById('start-timer');
    const stopTimerBtn = document.getElementById('stop-timer');

    if (startTimerBtn) {
      startTimerBtn.addEventListener('click', () => this.startTimer());
    }
    if (stopTimerBtn) {
      stopTimerBtn.addEventListener('click', () => this.stopTimer());
    }

    const taskForm = document.getElementById('task-update-form');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateTask();
      });
    }

    const createTaskForm = document.getElementById('create-task-form');
    if (createTaskForm) {
      createTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createMaintenanceTask();
      });
    }

    // Close modal events
    const closeModalBtns = document.querySelectorAll('.close-modal');
    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal();
        this.closeCreateTaskModal();
      });
    });
  }

  updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  async loadUserInfo() {
    const nameEl = document.getElementById('handyman-name');
    if (nameEl) nameEl.textContent = 'Loading...';

    try {
      const response = await fetch(`${this.apiBaseURL}?action=user_info`);
      if (!response.ok) {
        if (response.status === 401) {
          this.showError('Session expired. Redirecting to login...');
          setTimeout(() => {
            this.redirectToLogin(); // Fixed: Use consistent method
          }, 1500);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Expected JSON response');
      }

      const data = await response.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        if (nameEl) {
          nameEl.textContent = `${data.user.first_name} ${data.user.last_name}`;
        }
      } else {
        this.showError(data.message || 'User data not found');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      this.showError('Unable to connect. Check your network or contact admin.');
      if (error.message.includes('401')) {
        this.redirectToLogin(); // Fixed: Use consistent method
      }
    }
  }

  async loadMaintenanceTypes() {
    try {
      const response = await fetch(`${this.apiBaseURL}?action=maintenance_types`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response from server');
      }

      const data = await response.json();
      if (data.success) {
        this.maintenanceTypes = Array.isArray(data.maintenance_types) ? data.maintenance_types : [];
      } else {
        console.warn('No maintenance types loaded:', data.message);
      }
    } catch (error) {
      console.error('Error loading maintenance types:', error);
    }
  }

  async loadMaintenanceStatuses() {
    try {
      const response = await fetch(`${this.apiBaseURL}?action=get_maintenance_statuses`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response from server');
      }

      const data = await response.json();
      if (data.success) {
        this.maintenanceStatuses = Array.isArray(data.statuses) ? data.statuses : [];
      } else {
        console.warn('No maintenance statuses loaded:', data.message);
      }
    } catch (error) {
      console.error('Error loading maintenance statuses:', error);
    }
  }

  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadStats(),
        this.loadTasks(),
        this.loadRooms(),
        this.loadMaintenanceLog()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showError('Some data failed to load.');
    }
  }

  async loadStats() {
    const ids = ['pending-count', 'progress-count', 'completed-count', 'urgent-count'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '...';
    });

    try {
      const response = await fetch(`${this.apiBaseURL}?action=stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response');
      }

      const data = await response.json();
      if (data.success && data.stats) {
        const pendingEl = document.getElementById('pending-count');
        const progressEl = document.getElementById('progress-count');
        const completedEl = document.getElementById('completed-count');
        const urgentEl = document.getElementById('urgent-count');
        
        if (pendingEl) pendingEl.textContent = data.stats.pending || 0;
        if (progressEl) progressEl.textContent = data.stats.in_progress || 0;
        if (completedEl) completedEl.textContent = data.stats.completed_today || 0;
        if (urgentEl) urgentEl.textContent = data.stats.urgent || 0;
      } else {
        this.showError('Stats: ' + (data.message || 'Unknown'));
      }
    } catch (error) {
      console.error('Load stats error:', error);
      this.showError('Failed to load stats');
    }
  }

  async loadTasks() {
    const loadingEl = document.getElementById('tasks-loading');
    const listEl = document.getElementById('task-list');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (listEl) listEl.innerHTML = '';

    try {
      const response = await fetch(`${this.apiBaseURL}?action=tasks`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON');
      }

      const data = await response.json();
      if (data.success) {
        this.tasks = Array.isArray(data.tasks) ? data.tasks : [];
        this.renderTasks();
      } else {
        if (listEl) listEl.innerHTML = `<div class="text-center py-4 text-red-500">Error: ${data.message || 'Unknown'}</div>`;
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      if (listEl) listEl.innerHTML = `<div class="text-center py-4 text-red-500">Failed to load tasks.</div>`;
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  renderTasks() {
    const listEl = document.getElementById('task-list');
    if (!listEl) return;

    if (this.tasks.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-4 text-slate-500">
          <i class="fas fa-clipboard-check text-3xl opacity-30"></i>
          <p>No tasks assigned</p>
        </div>`;
      return;
    }

    listEl.innerHTML = this.tasks.map(task => {
      const statusClass = {
        '1': 'bg-yellow-100 text-yellow-800',    // Scheduled/Pending
        '2': 'bg-blue-100 text-blue-800',       // In Progress
        '3': 'bg-green-100 text-green-800',     // Completed
        '4': 'bg-orange-100 text-orange-800',   // Cancelled
        '5': 'bg-red-100 text-red-800'          // Failed/Emergency
      }[task.maintenance_status_id] || 'bg-gray-100 text-gray-800';

      const isPending = task.maintenance_status_id == 1;
      const isInProgress = task.maintenance_status_id == 2;
      const isCompleted = task.maintenance_status_id == 3;

      return `
        <div class="bg-white p-4 rounded-lg border border-slate-200 space-y-2 shadow-sm">
          <div class="flex flex-wrap justify-between items-center">
            <div>
              <strong class="text-slate-800">Room ${task.room_number}</strong>
              <span class="ml-2 px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                ${task.status_name}
              </span>
              ${task.maintenance_type_name ? `<small class="ml-2 text-slate-500">(${task.maintenance_type_name})</small>` : ''}
            </div>
            <small class="text-slate-500">${this.formatDate(task.scheduled_date)}</small>
          </div>
          <p class="text-sm text-slate-700">${this.escapeHtml(task.notes || 'No description')}</p>
          ${task.cost ? `<p class="text-xs text-green-600"><i class="fas fa-tag"></i> ₱${parseFloat(task.cost).toFixed(2)}</p>` : ''}
          ${isInProgress && task.started_at ? `<p class="text-xs text-blue-600"><i class="fas fa-clock"></i> Started: ${this.formatDateTime(task.started_at)}</p>` : ''}
          <div class="flex gap-2 mt-2">
            <button onclick="window.dashboard.openTaskModal(${task.maintenance_id})"
              class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1">
              <i class="fas fa-edit"></i> Update
            </button>
            ${isPending ? `
            <button onclick="window.dashboard.startTask(${task.maintenance_id})"
              class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1">
              <i class="fas fa-play"></i> Start
            </button>` : ''}
            ${isInProgress ? `
            <button onclick="window.dashboard.completeTask(${task.maintenance_id})"
              class="text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded flex items-center gap-1">
              <i class="fas fa-check"></i> Complete
            </button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  async loadRooms() {
    const loadingEl = document.getElementById('rooms-loading');
    const gridEl = document.getElementById('room-grid');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (gridEl) gridEl.innerHTML = '';

    try {
      const response = await fetch(`${this.apiBaseURL}?action=rooms`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response');
      }

      const data = await response.json();
      if (data.success) {
        this.rooms = Array.isArray(data.rooms) ? data.rooms : [];
        this.renderRooms();
      } else {
        if (gridEl) gridEl.innerHTML = `<div class="text-center py-4 text-red-500">Error: ${data.message}</div>`;
      }
    } catch (error) {
      console.error('Load rooms error:', error);
      if (gridEl) gridEl.innerHTML = `<div class="text-center py-4 text-red-500">Failed to load rooms.</div>`;
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  renderRooms() {
    const gridEl = document.getElementById('room-grid');
    if (!gridEl) return;

    if (this.rooms.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-full text-center py-4 text-slate-500">
          <i class="fas fa-home text-3xl opacity-30"></i>
          <p>No rooms need attention</p>
        </div>`;
      return;
    }

    gridEl.innerHTML = this.rooms.map(room => {
      const statusClass = room.status_name === 'Out of Order' ? 'bg-red-100 border-red-300' : 'bg-orange-100 border-orange-300';
      return `
        <div onclick="window.dashboard.openCreateTaskModal(${room.room_id})"
          class="p-4 rounded-lg border-2 ${statusClass} cursor-pointer hover:shadow-md transition text-center">
          <div class="font-bold text-lg">${room.room_number}</div>
          <div class="text-sm">${room.status_name}</div>
          <small class="text-xs text-slate-600">${room.type_name}</small>
        </div>
      `;
    }).join('');
  }

  async loadMaintenanceLog() {
    const loadingEl = document.getElementById('log-loading');
    const logBody = document.getElementById('log-body');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (logBody) logBody.innerHTML = '';

    try {
      const response = await fetch(`${this.apiBaseURL}?action=get_maintenance_logs&limit=10&page=1`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.records) && data.records.length > 0) {
        if (logBody) {
          logBody.innerHTML = data.records.map(log => {
            const statusClass = log.status_name === 'Completed'
              ? 'bg-green-100 text-green-800'
              : log.status_name === 'In Progress'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800';

            return `
              <tr class="border-b hover:bg-slate-50">
                <td class="py-2 px-2 font-medium">${log.room_number}</td>
                <td class="py-2 px-2">
                  <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
                    ${log.status_name}
                  </span>
                </td>
                <td class="py-2 px-2 text-slate-700">${this.truncateText(this.escapeHtml(log.description || log.notes || 'No description'), 60)}</td>
                <td class="py-2 px-2 text-slate-600">${this.formatDate(log.created_at)}</td>
              </tr>
            `;
          }).join('');
        }
      } else {
        if (logBody) logBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-500">No maintenance history found.</td></tr>`;
      }
    } catch (error) {
      console.error('Load maintenance log error:', error);
      if (logBody) logBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Failed to load log.</td></tr>`;
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  // Utility Functions
  truncateText(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }

  formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  }

  showError(msg) {
    alert('⚠️ ' + msg);
  }

  showSuccess(msg) {
    alert('✅ ' + msg);
  }

  // Fixed: Consistent logout implementation based on frontdashboard.js
  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`Making ${method} request to:`, url);
    
    try {
      const options = {
        method: method,
        ...this.fetchDefaults
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP ${response.status} Error:`, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }
      
      const result = await response.json();
      console.log('Request successful:', result);
      return result;
      
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async handleLogout() {
    try {
      console.log('Logging out...');
      await this.makeRequest('/api/auth/logout.php', 'POST');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.redirectToLogin();
    }
  }

  redirectToLogin() {
    console.log('Redirecting to login...');
    window.location.href = `${this.baseURL}/index.html`;
  }

  // Deprecated: Keep for backward compatibility but redirect to handleLogout
  logout() {
    this.handleLogout();
  }

  // --- Modals ---
  openTaskModal(taskId) {
    const modal = document.getElementById('task-modal');
    const taskIdInput = document.getElementById('task-id');
    const taskStatusSelect = document.getElementById('task-status');
    const taskCostInput = document.getElementById('task-cost');
    const taskNotesInput = document.getElementById('task-notes');
    const timerSection = document.getElementById('timer-section');
    const timerDisplay = document.getElementById('timer-display');

    if (!modal || !taskIdInput || !taskStatusSelect || !taskCostInput || !taskNotesInput) {
      this.showError('Modal elements missing.');
      return;
    }

    const task = this.tasks.find(t => t.maintenance_id == taskId);
    if (!task) {
      this.showError('Task not found.');
      return;
    }

    // Populate form
    taskIdInput.value = task.maintenance_id;
    taskCostInput.value = task.cost || '';
    taskNotesInput.value = task.notes || '';

    // Populate status dropdown
    if (taskStatusSelect && this.maintenanceStatuses.length > 0) {
      taskStatusSelect.innerHTML = '<option value="">Select Status</option>';
      this.maintenanceStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status.maintenance_status_id;
        option.textContent = status.status_name;
        option.selected = status.maintenance_status_id == task.maintenance_status_id;
        taskStatusSelect.appendChild(option);
      });
    } else {
      taskStatusSelect.value = task.maintenance_status_id || '';
    }

    // Handle timer for in-progress tasks
    if (timerSection && timerDisplay) {
      if (task.maintenance_status_id == 2 && task.started_at && !task.completed_at) {
        timerSection.style.display = 'block';
        this.initTimer(task.started_at);
      } else {
        timerSection.style.display = 'none';
        this.stopTimer();
        timerDisplay.textContent = '00:00:00';
      }
    }

    modal.classList.remove('hidden');
  }

  closeModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.add('hidden');
    this.stopTimer();
  }

  initTimer(startTime) {
    if (!startTime) return;
    
    const start = new Date(startTime);
    const now = new Date();
    this.timer.elapsed = Math.floor((now - start) / 1000);
    this.updateTimerDisplay();
    this.startTimer();
  }

  startTimer() {
    if (this.timer.isRunning) return;
    
    this.timer.isRunning = true;
    const startBtn = document.getElementById('start-timer');
    const stopBtn = document.getElementById('stop-timer');
    
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    
    this.timer.interval = setInterval(() => {
      this.timer.elapsed++;
      this.updateTimerDisplay();
    }, 1000);
  }

  stopTimer() {
    if (!this.timer.isRunning) return;
    
    this.timer.isRunning = false;
    const startBtn = document.getElementById('start-timer');
    const stopBtn = document.getElementById('stop-timer');
    
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';
    
    if (this.timer.interval) {
      clearInterval(this.timer.interval);
      this.timer.interval = null;
    }
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;
    
    const h = Math.floor(this.timer.elapsed / 3600).toString().padStart(2, '0');
    const m = Math.floor((this.timer.elapsed % 3600) / 60).toString().padStart(2, '0');
    const s = (this.timer.elapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${h}:${m}:${s}`;
  }

  async updateTask() {
    const taskId = document.getElementById('task-id')?.value;
    const status = document.getElementById('task-status')?.value;
    const cost = document.getElementById('task-cost')?.value || null;
    const notes = document.getElementById('task-notes')?.value || null;

    if (!taskId || !status) {
      this.showError('Task ID and Status are required.');
      return;
    }

    try {
      const params = new URLSearchParams({
        action: 'update_task',
        task_id: taskId,
        status: status
      });

      if (cost !== null && cost !== '') {
        params.append('cost', cost);
      }
      if (notes !== null && notes !== '') {
        params.append('notes', notes);
      }
      params.append('work_time_seconds', this.timer.elapsed || 0);

      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        this.showSuccess('Task updated successfully');
        this.closeModal();
        await this.loadDashboardData();
      } else {
        this.showError(data.message || 'Update failed');
      }
    } catch (error) {
      this.showError('Update error: ' + error.message);
    }
  }

  openCreateTaskModal(roomId) {
    const room = this.rooms.find(r => r.room_id == roomId);
    if (!room) {
      this.showError('Room not found.');
      return;
    }

    const modal = document.getElementById('create-task-modal');
    const roomIdInput = document.getElementById('create-task-room-id');
    const roomInfo = document.getElementById('create-task-room-info');
    const typeSelect = document.getElementById('create-task-type');
    const descriptionInput = document.getElementById('create-task-description');

    if (roomIdInput) roomIdInput.value = room.room_id;
    if (roomInfo) roomInfo.value = `Room ${room.room_number} (${room.type_name})`;
    if (descriptionInput) descriptionInput.value = ''; // Clear previous input
    
    if (typeSelect) {
      typeSelect.innerHTML = '<option value="">Select Type (Optional)</option>';
      this.maintenanceTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.maintenance_type_id;
        option.textContent = type.type_name;
        typeSelect.appendChild(option);
      });
    }

    if (modal) modal.classList.remove('hidden');
  }

  closeCreateTaskModal() {
    const modal = document.getElementById('create-task-modal');
    if (modal) modal.classList.add('hidden');
    
    // Clear form
    const form = document.getElementById('create-task-form');
    if (form) form.reset();
  }

  async createMaintenanceTask() {
    const roomId = document.getElementById('create-task-room-id')?.value;
    const description = document.getElementById('create-task-description')?.value?.trim();
    const maintenanceTypeId = document.getElementById('create-task-type')?.value || null;

    if (!roomId) {
      this.showError('Room ID is missing.');
      return;
    }
    if (!description) {
      this.showError('Description is required.');
      const descInput = document.getElementById('create-task-description');
      if (descInput) descInput.focus();
      return;
    }

    try {
      const formData = new FormData();
      formData.append('action', 'create_task');
      formData.append('room_id', roomId);
      formData.append('description', description);
      if (maintenanceTypeId) {
        formData.append('maintenance_type_id', maintenanceTypeId);
      }

      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response');
      }

      const data = await response.json();
      if (data.success) {
        this.showSuccess('Task created successfully');
        this.closeCreateTaskModal();
        await this.loadDashboardData();
      } else {
        this.showError(data.message || 'Failed to create task');
      }
    } catch (error) {
      this.showError('Create error: ' + error.message);
    }
  }

  async startTask(taskId) {
    if (!taskId) {
      this.showError('Task ID missing.');
      return;
    }
    if (!confirm('Start this task? Timer will begin.')) return;

    try {
      const params = new URLSearchParams({ 
        action: 'start_task', 
        task_id: taskId 
      });
      
      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.success) {
        this.showSuccess('Task started');
        await this.loadDashboardData();
      } else {
        this.showError(data.message || 'Failed to start task');
      }
    } catch (error) {
      this.showError('Start failed: ' + error.message);
    }
  }

  async completeTask(taskId) {
    if (!taskId) {
      this.showError('Task ID is missing.');
      return;
    }
    if (!confirm('Mark this task as completed?')) return;

    try {
      const params = new URLSearchParams({ 
        action: 'complete_task', 
        task_id: taskId 
      });
      
      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.success) {
        this.showSuccess('Task completed');
        await this.loadDashboardData();
      } else {
        this.showError(data.message || 'Failed to complete task');
      }
    } catch (error) {
      this.showError('Complete failed: ' + error.message);
    }
  }

  // === Maintenance Log Management Functions ===

  async createMaintenanceLogEntry(roomId, statusId, description, priority = 'medium') {
    try {
      const requestData = {
        room_id: roomId,
        maintenance_status_id: statusId,
        description: description,
        priority: priority
      };

      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_maintenance_log',
          ...requestData
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        this.showSuccess('Maintenance log entry created successfully');
        await this.loadMaintenanceLog();
        return data.log_id;
      } else {
        this.showError(data.error || data.message || 'Failed to create log entry');
        return null;
      }
    } catch (error) {
      this.showError('Error creating log entry: ' + error.message);
      return null;
    }
  }

  async updateMaintenanceLogEntry(logId, updates) {
    try {
      const requestData = {
        log_id: logId,
        ...updates
      };

      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_maintenance_log',
          ...requestData
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        this.showSuccess('Maintenance log updated successfully');
        await this.loadMaintenanceLog();
        return true;
      } else {
        this.showError(data.error || data.message || 'Failed to update log entry');
        return false;
      }
    } catch (error) {
      this.showError('Error updating log entry: ' + error.message);
      return false;
    }
  }

  async deleteMaintenanceLogEntry(logId) {
    if (!confirm('Are you sure you want to delete this maintenance log entry?')) {
      return false;
    }

    try {
      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_maintenance_log',
          log_id: logId
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        this.showSuccess('Maintenance log entry deleted successfully');
        await this.loadMaintenanceLog();
        return true;
      } else {
        this.showError(data.error || data.message || 'Failed to delete log entry');
        return false;
      }
    } catch (error) {
      this.showError('Error deleting log entry: ' + error.message);
      return false;
    }
  }

  // === Advanced Search and Filter Functions ===

  async searchMaintenanceLogs(filters = {}) {
    try {
      const params = new URLSearchParams({
        action: 'get_maintenance_logs',
        page: filters.page || 1,
        limit: filters.limit || 50
      });

      if (filters.room_id) params.append('room_id', filters.room_id);
      if (filters.status_id) params.append('status_id', filters.status_id);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`${this.apiBaseURL}?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        return {
          records: data.records || [],
          pagination: data.pagination || {}
        };
      } else {
        this.showError(data.message || 'Failed to search maintenance logs');
        return { records: [], pagination: {} };
      }
    } catch (error) {
      this.showError('Search error: ' + error.message);
      return { records: [], pagination: {} };
    }
  }

  // === Enhanced Task Management ===

  async getTaskDetails(taskId) {
    const task = this.tasks.find(t => t.maintenance_id == taskId);
    if (task) {
      return task;
    }

    // If not in current tasks, try to fetch from server
    try {
      await this.loadTasks();
      return this.tasks.find(t => t.maintenance_id == taskId);
    } catch (error) {
      console.error('Error fetching task details:', error);
      return null;
    }
  }

  async assignTaskToHandyman(taskId, handymanId) {
    try {
      const params = new URLSearchParams({
        action: 'assign_task',
        task_id: taskId,
        handyman_id: handymanId
      });

      const response = await fetch(this.apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        this.showSuccess('Task assigned successfully');
        await this.loadDashboardData();
        return true;
      } else {
        this.showError(data.message || 'Failed to assign task');
        return false;
      }
    } catch (error) {
      this.showError('Assignment error: ' + error.message);
      return false;
    }
  }

  // === Utility Functions for Enhanced Features ===

  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  calculateTaskProgress(task) {
    if (!task) return 0;
    
    switch (task.maintenance_status_id) {
      case 1: return 0;   // Scheduled/Pending
      case 2: return 50;  // In Progress
      case 3: return 100; // Completed
      case 4: return 0;   // Cancelled
      case 5: return 25;  // Failed/Emergency
      default: return 0;
    }
  }

  getTaskPriority(task) {
    if (!task) return 'low';
    
    // Determine priority based on room status and task type
    if (task.room_status_name === 'Out of Order') return 'high';
    if (task.maintenance_type_name && task.maintenance_type_name.toLowerCase().includes('emergency')) return 'high';
    if (task.maintenance_status_id == 2) return 'medium'; // In progress
    
    return 'low';
  }

  getStatusColor(statusId) {
    const colors = {
      1: '#fbbf24', // yellow - pending
      2: '#3b82f6', // blue - in progress  
      3: '#10b981', // green - completed
      4: '#f97316', // orange - cancelled
      5: '#ef4444'  // red - failed/emergency
    };
    return colors[statusId] || '#6b7280'; // gray default
  }

  // === Data Export Functions ===

  exportTasksToCSV() {
    if (this.tasks.length === 0) {
      this.showError('No tasks to export');
      return;
    }

    const headers = ['Room', 'Status', 'Type', 'Description', 'Cost', 'Scheduled Date', 'Started', 'Completed'];
    const csvContent = [
      headers.join(','),
      ...this.tasks.map(task => [
        task.room_number,
        task.status_name,
        task.maintenance_type_name || '',
        `"${(task.notes || '').replace(/"/g, '""')}"`,
        task.cost || '',
        task.scheduled_date || '',
        task.started_at || '',
        task.completed_at || ''
      ].join(','))
    ].join('\n');

    this.downloadCSV(csvContent, 'maintenance_tasks.csv');
  }

  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // === Performance Metrics ===

  getAverageCompletionTime() {
    const completedTasks = this.tasks.filter(task => 
      task.maintenance_status_id == 3 && task.started_at && task.completed_at
    );

    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const start = new Date(task.started_at);
      const end = new Date(task.completed_at);
      return sum + (end - start);
    }, 0);

    return totalTime / completedTasks.length / 1000; // Return in seconds
  }

  getTaskCompletionRate() {
    if (this.tasks.length === 0) return 0;
    const completed = this.tasks.filter(task => task.maintenance_status_id == 3).length;
    return (completed / this.tasks.length * 100).toFixed(1);
  }

  // === Real-time Updates ===

  startRealTimeUpdates(intervalMs = 30000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        await this.loadStats();
        await this.loadTasks();
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, intervalMs);
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // === Cleanup ===

  destroy() {
    this.stopTimer();
    this.stopRealTimeUpdates();
    
    // Remove event listeners
    const elements = document.querySelectorAll('[onclick*="dashboard"]');
    elements.forEach(el => {
      el.onclick = null;
    });
  }
}

// Initialize dashboard and make it globally available
window.dashboard = new HandymanDashboard();

// Optional: Start real-time updates (30 seconds interval)
// window.dashboard.startRealTimeUpdates();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.dashboard) {
    window.dashboard.destroy();
  }
});
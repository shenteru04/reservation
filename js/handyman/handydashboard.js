// Handyman Dashboard JavaScript
class HandymanDashboard {
    constructor() {
         this.baseURL = window.location.origin + '/reservation';
        this.currentUser = null;
        this.tasks = [];
        this.rooms = [];
        this.timer = {
            isRunning: false,
            startTime: null,
            elapsed: 0,
            interval: null
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateCurrentDate();
        await this.loadUserInfo();
        await this.loadDashboardData();
        
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    setupEventListeners() {
        // Task update form
        document.getElementById('task-update-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTask();
        });

        // Timer controls
        document.getElementById('start-timer').addEventListener('click', () => this.startTimer());
        document.getElementById('stop-timer').addEventListener('click', () => this.stopTimer());

        // Close modal on outside click
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeModal();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
    }

    async loadUserInfo() {
        try {
            const response = await fetch('api/handyman/handydashboard.php?action=user_info');
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                document.getElementById('handyman-name').textContent = 
                    `${data.user.first_name} ${data.user.last_name}`;
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            this.showError('Failed to load user information');
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadStats(),
            this.loadTasks(),
            this.loadRooms()
        ]);
    }

    async loadStats() {
        try {
            const response = await fetch('api/handyman/handydashboard.php?action=stats');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('pending-count').textContent = data.stats.pending || 0;
                document.getElementById('progress-count').textContent = data.stats.in_progress || 0;
                document.getElementById('completed-count').textContent = data.stats.completed_today || 0;
                document.getElementById('urgent-count').textContent = data.stats.urgent || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadTasks() {
        const loadingElement = document.getElementById('tasks-loading');
        const taskListElement = document.getElementById('task-list');
        
        try {
            loadingElement.classList.add('active');
            
            const response = await fetch('api/handyman/handydashboard.php?action=tasks');
            const data = await response.json();
            
            if (data.success) {
                this.tasks = data.tasks;
                this.renderTasks();
            } else {
                this.showError('Failed to load tasks');
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Failed to load tasks');
        } finally {
            loadingElement.classList.remove('active');
        }
    }

    async loadRooms() {
        const loadingElement = document.getElementById('rooms-loading');
        
        try {
            loadingElement.classList.add('active');
            
            const response = await fetch('api/handyman/handydashboard.php?action=rooms');
            const data = await response.json();
            
            if (data.success) {
                this.rooms = data.rooms;
                this.renderRooms();
            } else {
                this.showError('Failed to load rooms');
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showError('Failed to load rooms');
        } finally {
            loadingElement.classList.remove('active');
        }
    }

    renderTasks() {
        const taskListElement = document.getElementById('task-list');
        
        if (this.tasks.length === 0) {
            taskListElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <p>No active tasks assigned</p>
                </div>
            `;
            return;
        }

        taskListElement.innerHTML = this.tasks.map(task => {
            const statusClass = this.getStatusClass(task.status_name);
            const priorityClass = task.room_status_name === 'Out of Order' ? 'urgent' : 
                                 task.status_name === 'In Progress' ? 'in-progress' : '';
            
            return `
                <div class="task-item ${priorityClass}" data-task-id="${task.maintenance_id}">
                    <div class="task-header">
                        <div class="room-info">
                            Room ${task.room_number} - Floor ${task.floor_number}
                            <br>
                            <small>${task.type_name}</small>
                        </div>
                        <span class="task-status ${statusClass}">
                            ${task.status_name}
                        </span>
                    </div>
                    
                    <div class="task-details">
                        ${task.notes || 'No description provided'}
                    </div>
                    
                    <div class="task-meta">
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(task.scheduled_date)}</span>
                        ${task.cost ? `<span><i class="fas fa-peso-sign"></i> ₱${parseFloat(task.cost).toFixed(2)}</span>` : ''}
                        ${task.started_at ? `<span><i class="fas fa-play"></i> Started: ${this.formatDateTime(task.started_at)}</span>` : ''}
                    </div>
                    
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="dashboard.openTaskModal(${task.maintenance_id})">
                            <i class="fas fa-edit"></i> Update
                        </button>
                        ${task.status_name === 'Scheduled' ? `
                            <button class="btn btn-success" onclick="dashboard.startTask(${task.maintenance_id})">
                                <i class="fas fa-play"></i> Start
                            </button>
                        ` : ''}
                        ${task.status_name === 'In Progress' ? `
                            <button class="btn btn-warning" onclick="dashboard.completeTask(${task.maintenance_id})">
                                <i class="fas fa-check"></i> Complete
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="dashboard.viewRoomDetails(${task.room_id})">
                            <i class="fas fa-door-open"></i> View Room
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRooms() {
        const roomGridElement = document.getElementById('room-grid');
        
        if (this.rooms.length === 0) {
            roomGridElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-home"></i>
                    <p>No rooms need maintenance</p>
                </div>
            `;
            return;
        }

        roomGridElement.innerHTML = this.rooms.map(room => {
            const statusClass = room.status_name === 'Out of Order' ? 'out-of-order' : 'maintenance';
            
            return `
                <div class="room-card ${statusClass}" onclick="dashboard.createMaintenanceTask(${room.room_id})">
                    <div class="room-number">${room.room_number}</div>
                    <div class="room-status">${room.status_name}</div>
                    <small>${room.type_name}</small>
                </div>
            `;
        }).join('');
    }

    async openTaskModal(taskId) {
        const task = this.tasks.find(t => t.maintenance_id == taskId);
        if (!task) return;

        // Populate form
        document.getElementById('task-id').value = task.maintenance_id;
        document.getElementById('task-status').value = task.maintenance_status_id;
        document.getElementById('task-cost').value = task.cost || '';
        document.getElementById('task-notes').value = task.notes || '';

        // Show timer section if task is in progress
        const timerSection = document.getElementById('timer-section');
        if (task.status_name === 'In Progress') {
            timerSection.style.display = 'block';
            if (task.started_at && !task.completed_at) {
                this.initTimer(task.started_at);
            }
        } else {
            timerSection.style.display = 'none';
            this.stopTimer();
        }

        document.getElementById('task-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('task-modal').classList.remove('active');
        this.stopTimer();
    }

    async updateTask() {
        const formData = new FormData(document.getElementById('task-update-form'));
        const taskId = document.getElementById('task-id').value;
        
        try {
            const response = await fetch('api/handyman/handydashboard.php', {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'update_task',
                    task_id: taskId,
                    status: formData.get('status'),
                    cost: formData.get('cost'),
                    notes: formData.get('notes')
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Task updated successfully');
                this.closeModal();
                await this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            this.showError('Failed to update task');
        }
    }

    async startTask(taskId) {
        try {
            const response = await fetch('api/handyman/handydashboard.php', {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'start_task',
                    task_id: taskId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Task started successfully');
                await this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed to start task');
            }
        } catch (error) {
            console.error('Error starting task:', error);
            this.showError('Failed to start task');
        }
    }

    async completeTask(taskId) {
        if (!confirm('Are you sure you want to mark this task as completed?')) {
            return;
        }

        try {
            const response = await fetch('api/handyman/handydashboard.php', {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'complete_task',
                    task_id: taskId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Task completed successfully');
                await this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed to complete task');
            }
        } catch (error) {
            console.error('Error completing task:', error);
            this.showError('Failed to complete task');
        }
    }

    async createMaintenanceTask(roomId) {
        const description = prompt('Enter maintenance description:');
        if (!description) return;

        try {
            const response = await fetch('api/handyman/handydashboard.php', {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'create_task',
                    room_id: roomId,
                    description: description
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Maintenance task created successfully');
                await this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed to create task');
            }
        } catch (error) {
            console.error('Error creating task:', error);
            this.showError('Failed to create task');
        }
    }

    viewRoomDetails(roomId) {
        // This could open a detailed room view modal
        // For now, we'll show basic room info
        const room = this.rooms.find(r => r.room_id == roomId);
        if (room) {
            alert(`Room ${room.room_number}\nType: ${room.type_name}\nStatus: ${room.status_name}\nFloor: ${room.floor_number}`);
        }
    }

    // Timer functions
    initTimer(startTime) {
        const start = new Date(startTime);
        const now = new Date();
        this.timer.elapsed = Math.floor((now - start) / 1000);
        this.updateTimerDisplay();
        this.startTimer();
    }

    startTimer() {
        if (this.timer.isRunning) return;
        
        this.timer.isRunning = true;
        document.getElementById('start-timer').style.display = 'none';
        document.getElementById('stop-timer').style.display = 'inline-flex';
        
        this.timer.interval = setInterval(() => {
            this.timer.elapsed++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (!this.timer.isRunning) return;
        
        this.timer.isRunning = false;
        document.getElementById('start-timer').style.display = 'inline-flex';
        document.getElementById('stop-timer').style.display = 'none';
        
        if (this.timer.interval) {
            clearInterval(this.timer.interval);
            this.timer.interval = null;
        }
    }

    updateTimerDisplay() {
        const hours = Math.floor(this.timer.elapsed / 3600);
        const minutes = Math.floor((this.timer.elapsed % 3600) / 60);
        const seconds = this.timer.elapsed % 60;
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = display;
    }

    // Utility functions
    getStatusClass(statusName) {
        const statusMap = {
            'Scheduled': 'status-scheduled',
            'In Progress': 'status-progress',
            'Completed': 'status-completed',
            'Delayed': 'status-urgent',
            'Cancelled': 'status-urgent'
        };
        return statusMap[statusName] || 'status-scheduled';
    }

    formatDate(dateString) {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'Not set';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showSuccess(message) {
        // You can implement a toast notification system here
        alert('Success: ' + message);
    }

    showError(message) {
        // You can implement a toast notification system here
        alert('Error: ' + message);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new HandymanDashboard();
});

// Make closeModal available globally for onclick handlers
window.closeModal = () => {
    if (window.dashboard) {
        window.dashboard.closeModal();
    }
};
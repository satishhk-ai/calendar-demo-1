class MyCalendar {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.tasks = JSON.parse(localStorage.getItem('calendarTasks')) || [];
        this.reminders = JSON.parse(localStorage.getItem('calendarReminders')) || [];
        this.settings = JSON.parse(localStorage.getItem('calendarSettings')) || {
            globalDoNotDisturb: false,
            showWeekends: true,
            startOnMonday: false
        };
        this.selectedDate = null;
        this.selectedTask = null;
        this.draggedTask = null;
        
        this.init();
    }

    init() {
        console.log('MyCalendar: Initializing...');
        this.setupEventListeners();
        this.renderCurrentView();
        this.checkReminders();
        this.startReminderChecker();
        git .log('MyCalendar: Initialization complete');
    }

    setupEventListeners() {
        // View switching
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Navigation
        document.getElementById('prevBtn').addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigate(1));
        
        // Modals
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openModal('taskModal'));
        document.getElementById('viewRemindersBtn').addEventListener('click', () => this.openModal('remindersModal'));
        document.getElementById('settingsBtn').addEventListener('click', () => this.openModal('settingsModal'));
        
        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });
        
        // Task form
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));
        document.getElementById('taskTitle').addEventListener('input', (e) => this.updateCharCount(e));
        
        // Settings
        document.getElementById('globalDoNotDisturb').addEventListener('change', (e) => this.updateSetting('globalDoNotDisturb', e.target.checked));
        document.getElementById('showWeekends').addEventListener('change', (e) => this.updateSetting('showWeekends', e.target.checked));
        document.getElementById('startOnMonday').addEventListener('change', (e) => this.updateSetting('startOnMonday', e.target.checked));
        
        // Task actions
        document.getElementById('deleteTaskBtn').addEventListener('click', () => this.deleteTask());
        document.getElementById('editTaskBtn').addEventListener('click', () => this.editTask());
        
        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.renderCurrentView();
    }

    navigate(direction) {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
            case 'workweek':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
            case 'year':
                this.currentDate.setFullYear(this.currentDate.getFullYear() + direction);
                break;
        }
        this.renderCurrentView();
    }

    renderCurrentView() {
        console.log('MyCalendar: Rendering view:', this.currentView);
        
        // Hide all calendar views
        document.querySelectorAll('.calendar-view').forEach(view => view.classList.remove('active'));
        
        // Show the current view
        const currentViewElement = document.getElementById(`${this.currentView}View`);
        if (currentViewElement) {
            currentViewElement.classList.add('active');
            console.log('MyCalendar: Set active class on', this.currentView + 'View');
        } else {
            console.error('MyCalendar: Could not find element:', this.currentView + 'View');
        }
        
        switch (this.currentView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'workweek':
                this.renderWorkWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
            case 'agenda':
                this.renderAgendaView();
                break;
            case 'year':
                this.renderYearView();
                break;
        }
        this.updateHeader();
    }

    updateHeader() {
        const header = document.getElementById('currentDate');
        switch (this.currentView) {
            case 'month':
                header.textContent = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                break;
            case 'week':
            case 'workweek':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                header.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                break;
            case 'day':
                header.textContent = this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                break;
            case 'year':
                header.textContent = this.currentDate.getFullYear().toString();
                break;
        }
    }

    renderMonthView() {
        console.log('MyCalendar: Rendering month view');
        const grid = document.getElementById('monthGrid');
        if (!grid) {
            console.error('MyCalendar: Could not find monthGrid element');
            return;
        }
        grid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = this.settings.startOnMonday ? 
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });
        
        // Generate calendar days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        
        if (this.settings.startOnMonday) {
            startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
        } else {
            startDate.setDate(startDate.getDate() - firstDay.getDay());
        }
        
        // Generate 6 weeks (42 days) for consistent grid
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const dayCell = this.createDayCell(currentDate, this.currentDate.getMonth());
                grid.appendChild(dayCell);
            }
        }
    }

    renderWeekView() {
        const grid = document.getElementById('weekGrid');
        grid.innerHTML = '';
        
        // Add time slots
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            grid.appendChild(timeSlot);
        }
        
        // Add day headers and cells
        const weekStart = this.getWeekStart(this.currentDate);
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + day);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day';
            dayHeader.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
            grid.appendChild(dayHeader);
            
            for (let hour = 0; hour < 24; hour++) {
                const weekCell = this.createWeekCell(currentDate, hour);
                grid.appendChild(weekCell);
            }
        }
    }

    renderWorkWeekView() {
        const grid = document.getElementById('workweekGrid');
        grid.innerHTML = '';
        
        // Add time slots
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            grid.appendChild(timeSlot);
        }
        
        // Add work day headers and cells (Monday to Friday)
        const weekStart = this.getWeekStart(this.currentDate);
        for (let day = 0; day < 5; day++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + day);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day';
            dayHeader.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
            grid.appendChild(dayHeader);
            
            for (let hour = 0; hour < 24; hour++) {
                const weekCell = this.createWeekCell(currentDate, hour);
                grid.appendChild(weekCell);
            }
        }
    }

    renderDayView() {
        const grid = document.getElementById('dayGrid');
        grid.innerHTML = '';
        
        // Add time slots
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'day-time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            grid.appendChild(timeSlot);
            
            const daySlot = this.createDaySlot(this.currentDate, hour);
            grid.appendChild(daySlot);
        }
    }

    renderAgendaView() {
        const list = document.getElementById('agendaList');
        const upcomingTasks = this.tasks
            .filter(task => new Date(task.date) >= new Date())
            .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
        
        if (upcomingTasks.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #605e5c; padding: 20px;">No upcoming events</p>';
            return;
        }
        
        list.innerHTML = upcomingTasks.map(task => `
            <div class="agenda-item" onclick="calendar.showTaskDetails(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                <h4>
                    <i class="${task.icon || 'fas fa-calendar'}"></i>
                    ${task.title}
                </h4>
                <p><strong>Date:</strong> ${new Date(task.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${task.time}</p>
                ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            </div>
        `).join('');
    }

    renderYearView() {
        const grid = document.getElementById('yearGrid');
        grid.innerHTML = '';
        
        for (let month = 0; month < 12; month++) {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'year-month';
            
            const monthName = new Date(this.currentDate.getFullYear(), month).toLocaleDateString('en-US', { month: 'long' });
            monthDiv.innerHTML = `<h4>${monthName}</h4><div class="year-month-grid"></div>`;
            
            const monthGrid = monthDiv.querySelector('.year-month-grid');
            
            // Add day headers
            const dayHeaders = this.settings.startOnMonday ? 
                ['M', 'T', 'W', 'T', 'F', 'S', 'S'] :
                ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            dayHeaders.forEach(day => {
                const dayHeader = document.createElement('div');
                dayHeader.className = 'year-day';
                dayHeader.textContent = day;
                dayHeader.style.background = '#f3f2f1';
                monthGrid.appendChild(dayHeader);
            });
            
            // Add days
            const firstDay = new Date(this.currentDate.getFullYear(), month, 1);
            const lastDay = new Date(this.currentDate.getFullYear(), month + 1, 0);
            const startDate = new Date(firstDay);
            
            if (this.settings.startOnMonday) {
                startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
            } else {
                startDate.setDate(startDate.getDate() - firstDay.getDay());
            }
            
            for (let week = 0; week < 6; week++) {
                for (let day = 0; day < 7; day++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + (week * 7) + day);
                    
                    const dayDiv = document.createElement('div');
                    dayDiv.className = 'year-day';
                    dayDiv.textContent = currentDate.getDate();
                    
                    if (currentDate.getMonth() === month) {
                        const dateStr = this.formatDate(currentDate);
                        const dayTasks = this.tasks.filter(task => task.date === dateStr);
                        if (dayTasks.length > 0) {
                            dayDiv.classList.add('has-tasks');
                        }
                    } else {
                        dayDiv.style.color = '#a19f9d';
                    }
                    
                    monthGrid.appendChild(dayDiv);
                }
            }
            
            grid.appendChild(monthDiv);
        }
    }

    createDayCell(date, currentMonth) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isToday(date);
        
        if (!isCurrentMonth) {
            dayCell.classList.add('other-month');
        }
        
        if (isToday) {
            dayCell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayCell.appendChild(dayNumber);
        
        // Add tasks for this date
        const dateStr = this.formatDate(date);
        const dayTasks = this.tasks.filter(task => task.date === dateStr);
        
        if (dayTasks.length > 0) {
            dayCell.classList.add('has-tasks');
            
            dayTasks.forEach(task => {
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.innerHTML = `<i class="${task.icon || 'fas fa-calendar'}"></i> ${task.title}`;
                taskIndicator.draggable = true;
                taskIndicator.addEventListener('dragstart', (e) => this.handleDragStart(e, task));
                taskIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                });
                dayCell.appendChild(taskIndicator);
            });
        }
        
        dayCell.addEventListener('click', () => {
            this.selectedDate = dateStr;
            this.openModal('taskModal');
            document.getElementById('taskDate').value = dateStr;
        });
        
        dayCell.addEventListener('dragover', (e) => this.handleDragOver(e));
        dayCell.addEventListener('drop', (e) => this.handleDrop(e, dateStr));
        
        return dayCell;
    }

    createWeekCell(date, hour) {
        const weekCell = document.createElement('div');
        weekCell.className = 'week-cell';
        
        const dateStr = this.formatDate(date);
        const hourTasks = this.tasks.filter(task => 
            task.date === dateStr && 
            parseInt(task.time.split(':')[0]) === hour
        );
        
        if (hourTasks.length > 0) {
            hourTasks.forEach(task => {
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.innerHTML = `<i class="${task.icon || 'fas fa-calendar'}"></i> ${task.title}`;
                taskIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                });
                weekCell.appendChild(taskIndicator);
            });
        }
        
        weekCell.addEventListener('click', () => {
            this.selectedDate = dateStr;
            this.openModal('taskModal');
            document.getElementById('taskDate').value = dateStr;
            document.getElementById('taskTime').value = `${hour.toString().padStart(2, '0')}:00`;
        });
        
        return weekCell;
    }

    createDaySlot(date, hour) {
        const daySlot = document.createElement('div');
        daySlot.className = 'day-slot';
        
        const dateStr = this.formatDate(date);
        const hourTasks = this.tasks.filter(task => 
            task.date === dateStr && 
            parseInt(task.time.split(':')[0]) === hour
        );
        
        if (hourTasks.length > 0) {
            hourTasks.forEach(task => {
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.innerHTML = `<i class="${task.icon || 'fas fa-calendar'}"></i> ${task.title}`;
                taskIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                });
                daySlot.appendChild(taskIndicator);
            });
        }
        
        daySlot.addEventListener('click', () => {
            this.selectedDate = dateStr;
            this.openModal('taskModal');
            document.getElementById('taskDate').value = dateStr;
            document.getElementById('taskTime').value = `${hour.toString().padStart(2, '0')}:00`;
        });
        
        return daySlot;
    }

    getWeekStart(date) {
        const startDate = new Date(date);
        if (this.settings.startOnMonday) {
            startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
        } else {
            startDate.setDate(startDate.getDate() - startDate.getDay());
        }
        return startDate;
    }

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        
        if (modalId === 'remindersModal') {
            this.renderReminders();
        } else if (modalId === 'settingsModal') {
            this.loadSettings();
        }
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    handleTaskSubmit(e) {
        e.preventDefault();
        
        const task = {
            id: Date.now(),
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            icon: document.getElementById('taskIcon').value,
            date: document.getElementById('taskDate').value,
            time: document.getElementById('taskTime').value,
            duration: parseFloat(document.getElementById('taskDuration').value),
            reminder: document.getElementById('enableReminder').checked,
            doNotDisturb: document.getElementById('doNotDisturb').checked,
            createdAt: new Date().toISOString()
        };
        
        this.tasks.push(task);
        this.saveTasks();
        
        // Schedule reminder if enabled
        if (task.reminder) {
            this.scheduleReminder(task);
        }
        
        this.closeModal(document.getElementById('taskModal'));
        this.renderCurrentView();
        this.resetTaskForm();
        
        this.showNotification('Event added successfully!', 'success');
    }

    scheduleReminder(task) {
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const reminderTime = new Date(taskDateTime.getTime() - (24 * 60 * 60 * 1000));
        
        if (reminderTime > new Date()) {
            const reminder = {
                id: `reminder_${task.id}`,
                taskId: task.id,
                taskTitle: task.title,
                taskDate: task.date,
                taskTime: task.time,
                reminderTime: reminderTime.toISOString(),
                notified: false,
                doNotDisturb: task.doNotDisturb
            };
            
            this.reminders.push(reminder);
            this.saveReminders();
        }
    }

    checkReminders() {
        if (this.settings.globalDoNotDisturb) return;
        
        const now = new Date();
        const upcomingReminders = this.reminders.filter(reminder => 
            !reminder.notified && new Date(reminder.reminderTime) <= now
        );
        
        upcomingReminders.forEach(reminder => {
            this.showReminderNotification(reminder);
            reminder.notified = true;
        });
        
        if (upcomingReminders.length > 0) {
            this.saveReminders();
        }
    }

    showReminderNotification(reminder) {
        if (reminder.doNotDisturb || this.settings.globalDoNotDisturb) return;
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">
                <i class="fas fa-bell"></i> Reminder
            </div>
            <div style="font-size: 0.9rem;">
                <strong>${reminder.taskTitle}</strong><br>
                Due: ${new Date(`${reminder.taskDate}T${reminder.taskTime}`).toLocaleString()}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 10000);
    }

    startReminderChecker() {
        setInterval(() => {
            this.checkReminders();
        }, 60000);
    }

    renderReminders() {
        const remindersList = document.getElementById('remindersList');
        const upcomingReminders = this.reminders.filter(reminder => !reminder.notified);
        
        if (upcomingReminders.length === 0) {
            remindersList.innerHTML = '<p style="text-align: center; color: #605e5c;">No upcoming reminders</p>';
            return;
        }
        
        remindersList.innerHTML = upcomingReminders.map(reminder => `
            <div class="agenda-item">
                <h4>${reminder.taskTitle}</h4>
                <p>Due: ${new Date(`${reminder.taskDate}T${reminder.taskTime}`).toLocaleString()}</p>
                <p>Reminder: ${new Date(reminder.reminderTime).toLocaleString()}</p>
            </div>
        `).join('');
    }

    showTaskDetails(task) {
        this.selectedTask = task;
        const taskDetails = document.getElementById('taskDetails');
        
        taskDetails.innerHTML = `
            <div class="agenda-item">
                <h4>
                    <i class="${task.icon || 'fas fa-calendar'}"></i>
                    ${task.title}
                </h4>
                <p><strong>Date:</strong> ${new Date(task.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${task.time}</p>
                <p><strong>Duration:</strong> ${task.duration} hours</p>
                <p><strong>Description:</strong> ${task.description || 'No description'}</p>
                <p><strong>Created:</strong> ${new Date(task.createdAt).toLocaleString()}</p>
                <p><strong>Reminder:</strong> ${task.reminder ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Do Not Disturb:</strong> ${task.doNotDisturb ? 'Yes' : 'No'}</p>
            </div>
        `;
        
        this.openModal('taskDetailsModal');
    }

    deleteTask() {
        if (this.selectedTask) {
            this.tasks = this.tasks.filter(task => task.id !== this.selectedTask.id);
            this.reminders = this.reminders.filter(reminder => reminder.taskId !== this.selectedTask.id);
            
            this.saveTasks();
            this.saveReminders();
            this.closeModal(document.getElementById('taskDetailsModal'));
            this.renderCurrentView();
            this.showNotification('Event deleted successfully!', 'success');
        }
    }

    editTask() {
        if (this.selectedTask) {
            this.closeModal(document.getElementById('taskDetailsModal'));
            this.openModal('taskModal');
            
            // Populate form with existing data
            document.getElementById('taskTitle').value = this.selectedTask.title;
            document.getElementById('taskDescription').value = this.selectedTask.description || '';
            document.getElementById('taskIcon').value = this.selectedTask.icon || 'fas fa-calendar';
            document.getElementById('taskDate').value = this.selectedTask.date;
            document.getElementById('taskTime').value = this.selectedTask.time;
            document.getElementById('taskDuration').value = this.selectedTask.duration || 1;
            document.getElementById('enableReminder').checked = this.selectedTask.reminder || false;
            document.getElementById('doNotDisturb').checked = this.selectedTask.doNotDisturb || false;
            
            // Update form submit handler for editing
            document.getElementById('taskForm').onsubmit = (e) => {
                e.preventDefault();
                this.updateTask();
            };
        }
    }

    updateTask() {
        const taskIndex = this.tasks.findIndex(task => task.id === this.selectedTask.id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                title: document.getElementById('taskTitle').value,
                description: document.getElementById('taskDescription').value,
                icon: document.getElementById('taskIcon').value,
                date: document.getElementById('taskDate').value,
                time: document.getElementById('taskTime').value,
                duration: parseFloat(document.getElementById('taskDuration').value),
                reminder: document.getElementById('enableReminder').checked,
                doNotDisturb: document.getElementById('doNotDisturb').checked
            };
            
            this.saveTasks();
            this.closeModal(document.getElementById('taskModal'));
            this.renderCurrentView();
            this.resetTaskForm();
            this.showNotification('Event updated successfully!', 'success');
        }
    }

    resetTaskForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('enableReminder').checked = true;
        document.getElementById('taskForm').onsubmit = (e) => this.handleTaskSubmit(e);
    }

    updateCharCount(e) {
        const charCount = e.target.value.length;
        document.querySelector('.char-count').textContent = `${charCount}/200 characters`;
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.renderCurrentView();
    }

    loadSettings() {
        document.getElementById('globalDoNotDisturb').checked = this.settings.globalDoNotDisturb;
        document.getElementById('showWeekends').checked = this.settings.showWeekends;
        document.getElementById('startOnMonday').checked = this.settings.startOnMonday;
    }

    saveSettings() {
        localStorage.setItem('calendarSettings', JSON.stringify(this.settings));
    }

    saveTasks() {
        localStorage.setItem('calendarTasks', JSON.stringify(this.tasks));
    }

    saveReminders() {
        localStorage.setItem('calendarReminders', JSON.stringify(this.reminders));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Drag and Drop functionality
    handleDragStart(e, task) {
        this.draggedTask = task;
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    handleDrop(e, newDate) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (this.draggedTask) {
            // Check for conflicts
            const conflictingTasks = this.tasks.filter(task => 
                task.date === newDate && 
                task.time === this.draggedTask.time &&
                task.id !== this.draggedTask.id
            );
            
            if (conflictingTasks.length > 0) {
                if (confirm(`There's already an event at ${this.draggedTask.time} on ${new Date(newDate).toLocaleDateString()}. Do you want to move it anyway?`)) {
                    this.moveTask(this.draggedTask, newDate);
                }
            } else {
                this.moveTask(this.draggedTask, newDate);
            }
            
            this.draggedTask = null;
        }
    }

    moveTask(task, newDate) {
        const taskIndex = this.tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].date = newDate;
            this.saveTasks();
            this.renderCurrentView();
            this.showNotification('Event moved successfully!', 'success');
        }
    }
}

// Initialize the app
let calendar;
document.addEventListener('DOMContentLoaded', () => {
    calendar = new MyCalendar();
});
// Browser-Compatible Calendar Script
// This version ensures compatibility across Chrome, Firefox, Safari, and Edge

(function() {
    'use strict';

    // Browser compatibility helpers
    var BrowserCompat = {
        // Check if browser supports modern features
        supportsModernJS: function() {
            return typeof Promise !== 'undefined' && 
                   typeof Array.from !== 'undefined' && 
                   typeof Object.assign !== 'undefined';
        },

        // Polyfill for Array.from if not supported
        polyfillArrayFrom: function() {
            if (!Array.from) {
                Array.from = function(arrayLike) {
                    var result = [];
                    for (var i = 0; i < arrayLike.length; i++) {
                        result.push(arrayLike[i]);
                    }
                    return result;
                };
            }
        },

        // Polyfill for Object.assign if not supported
        polyfillObjectAssign: function() {
            if (!Object.assign) {
                Object.assign = function(target) {
                    for (var i = 1; i < arguments.length; i++) {
                        var source = arguments[i];
                        for (var key in source) {
                            if (source.hasOwnProperty(key)) {
                                target[key] = source[key];
                            }
                        }
                    }
                    return target;
                };
            }
        },

        // Safe querySelector with fallback
        querySelector: function(selector) {
            try {
                return document.querySelector(selector);
            } catch (e) {
                console.warn('querySelector failed for:', selector);
                return null;
            }
        },

        // Safe querySelectorAll with fallback
        querySelectorAll: function(selector) {
            try {
                return document.querySelectorAll(selector);
            } catch (e) {
                console.warn('querySelectorAll failed for:', selector);
                return [];
            }
        },

        // Safe getElementById with fallback
        getElementById: function(id) {
            try {
                return document.getElementById(id);
            } catch (e) {
                console.warn('getElementById failed for:', id);
                return null;
            }
        },

        // Safe addEventListener with fallback
        addEventListener: function(element, event, handler) {
            if (element && typeof element.addEventListener === 'function') {
                element.addEventListener(event, handler);
            } else if (element && typeof element.attachEvent === 'function') {
                element.attachEvent('on' + event, handler);
            }
        },

        // Safe removeEventListener with fallback
        removeEventListener: function(element, event, handler) {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            } else if (element && typeof element.detachEvent === 'function') {
                element.detachEvent('on' + event, handler);
            }
        }
    };

    // Initialize polyfills
    BrowserCompat.polyfillArrayFrom();
    BrowserCompat.polyfillObjectAssign();

    // Main Calendar Class
    function MyCalendar() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.tasks = this.loadFromStorage('calendarTasks') || [];
        this.reminders = this.loadFromStorage('calendarReminders') || [];
        this.settings = {
            defaultReminderHours: 24,
            globalDoNotDisturb: false
        };
        
        // Load settings
        var savedSettings = this.loadFromStorage('calendarSettings');
        if (savedSettings) {
            this.settings = Object.assign(this.settings, savedSettings);
        }
    }

    MyCalendar.prototype.init = function() {
        console.log('MyCalendar: Initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            BrowserCompat.addEventListener(document, 'DOMContentLoaded', this.setupEventListeners.bind(this));
        } else {
            this.setupEventListeners();
        }
        
        this.renderCurrentView();
        this.checkReminders();
        this.startReminderChecker();
        console.log('MyCalendar: Initialization complete');
    };

    MyCalendar.prototype.setupEventListeners = function() {
        console.log('MyCalendar: Setting up event listeners...');
        
        // View switching buttons
        var monthBtn = BrowserCompat.getElementById('monthViewBtn');
        var weekBtn = BrowserCompat.getElementById('weekViewBtn');
        var dayBtn = BrowserCompat.getElementById('dayViewBtn');
        var agendaBtn = BrowserCompat.getElementById('agendaViewBtn');
        var yearBtn = BrowserCompat.getElementById('yearViewBtn');

        if (monthBtn) BrowserCompat.addEventListener(monthBtn, 'click', this.switchView.bind(this, 'month'));
        if (weekBtn) BrowserCompat.addEventListener(weekBtn, 'click', this.switchView.bind(this, 'week'));
        if (dayBtn) BrowserCompat.addEventListener(dayBtn, 'click', this.switchView.bind(this, 'day'));
        if (agendaBtn) BrowserCompat.addEventListener(agendaBtn, 'click', this.switchView.bind(this, 'agenda'));
        if (yearBtn) BrowserCompat.addEventListener(yearBtn, 'click', this.switchView.bind(this, 'year'));

        // Navigation buttons
        var prevBtn = BrowserCompat.getElementById('prevBtn');
        var nextBtn = BrowserCompat.getElementById('nextBtn');

        if (prevBtn) BrowserCompat.addEventListener(prevBtn, 'click', this.navigate.bind(this, -1));
        if (nextBtn) BrowserCompat.addEventListener(nextBtn, 'click', this.navigate.bind(this, 1));

        // Task management buttons
        var addTaskBtn = BrowserCompat.getElementById('addTaskBtn');
        var viewRemindersBtn = BrowserCompat.getElementById('viewRemindersBtn');
        var settingsBtn = BrowserCompat.getElementById('settingsBtn');

        if (addTaskBtn) BrowserCompat.addEventListener(addTaskBtn, 'click', this.showTaskModal.bind(this));
        if (viewRemindersBtn) BrowserCompat.addEventListener(viewRemindersBtn, 'click', this.showRemindersModal.bind(this));
        if (settingsBtn) BrowserCompat.addEventListener(settingsBtn, 'click', this.showSettingsModal.bind(this));

        // Task form
        var taskForm = BrowserCompat.getElementById('taskForm');
        if (taskForm) {
            BrowserCompat.addEventListener(taskForm, 'submit', this.handleTaskSubmit.bind(this));
        }

        // Delete task button
        var deleteTaskBtn = BrowserCompat.getElementById('deleteTaskBtn');
        if (deleteTaskBtn) {
            BrowserCompat.addEventListener(deleteTaskBtn, 'click', this.deleteTask.bind(this));
        }

        // Modal close buttons
        var closeButtons = BrowserCompat.querySelectorAll('.close');
        for (var i = 0; i < closeButtons.length; i++) {
            BrowserCompat.addEventListener(closeButtons[i], 'click', function(e) {
                var modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Close modals when clicking outside
        BrowserCompat.addEventListener(window, 'click', function(e) {
            if (e.target.classList && e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        console.log('MyCalendar: Event listeners set up');
    };

    MyCalendar.prototype.switchView = function(view) {
        console.log('MyCalendar: Switching to view:', view);
        this.currentView = view;
        
        // Update view buttons
        var viewButtons = BrowserCompat.querySelectorAll('.view-btn');
        for (var i = 0; i < viewButtons.length; i++) {
            viewButtons[i].classList.remove('active');
        }
        
        var currentViewBtn = BrowserCompat.getElementById(view + 'ViewBtn');
        if (currentViewBtn) {
            currentViewBtn.classList.add('active');
        }
        
        this.renderCurrentView();
    };

    MyCalendar.prototype.navigate = function(direction) {
        console.log('MyCalendar: Navigating:', direction);
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
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
    };

    MyCalendar.prototype.renderCurrentView = function() {
        console.log('MyCalendar: Rendering view:', this.currentView);
        
        // Hide all calendar views
        var calendarViews = BrowserCompat.querySelectorAll('.calendar-view');
        for (var i = 0; i < calendarViews.length; i++) {
            calendarViews[i].classList.remove('active');
        }
        
        // Show the current view
        var currentViewElement = BrowserCompat.getElementById(this.currentView + 'View');
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
    };

    MyCalendar.prototype.renderMonthView = function() {
        console.log('MyCalendar: Rendering month view');
        var grid = BrowserCompat.getElementById('monthGrid');
        if (!grid) {
            console.error('MyCalendar: Could not find monthGrid element');
            return;
        }
        
        grid.innerHTML = '';
        
        var year = this.currentDate.getFullYear();
        var month = this.currentDate.getMonth();
        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);
        var startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Day headers
        var dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (var i = 0; i < dayHeaders.length; i++) {
            var dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = dayHeaders[i];
            grid.appendChild(dayHeader);
        }
        
        // Calendar days
        for (var i = 0; i < 42; i++) {
            var currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            var dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            
            if (currentDay.getMonth() !== month) {
                dayCell.classList.add('other-month');
            }
            
            if (this.isToday(currentDay)) {
                dayCell.classList.add('today');
            }
            
            var dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDay.getDate();
            dayCell.appendChild(dayNumber);
            
            // Add tasks for this day
            var dayTasks = this.getTasksForDate(currentDay);
            for (var j = 0; j < dayTasks.length; j++) {
                var task = dayTasks[j];
                var taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.textContent = task.title;
                taskIndicator.title = task.title;
                
                BrowserCompat.addEventListener(taskIndicator, 'click', function(e) {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                }.bind(this));
                
                dayCell.appendChild(taskIndicator);
            }
            
            BrowserCompat.addEventListener(dayCell, 'click', function(clickedDay) {
                return function() {
                    this.currentDate = new Date(clickedDay);
                    this.showTaskModal();
                };
            }(currentDay).bind(this));
            
            grid.appendChild(dayCell);
        }
    };

    MyCalendar.prototype.renderWeekView = function() {
        var grid = BrowserCompat.getElementById('weekGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        var startOfWeek = this.getWeekStart(this.currentDate);
        var dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (var i = 0; i < dayHeaders.length; i++) {
            var dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = dayHeaders[i];
            grid.appendChild(dayHeader);
        }
        
        for (var i = 0; i < 7; i++) {
            var currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            
            var dayCell = document.createElement('div');
            dayCell.className = 'day-cell week-day';
            
            if (this.isToday(currentDay)) {
                dayCell.classList.add('today');
            }
            
            var dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDay.getDate();
            dayCell.appendChild(dayNumber);
            
            var dayTasks = this.getTasksForDate(currentDay);
            for (var j = 0; j < dayTasks.length; j++) {
                var task = dayTasks[j];
                var taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.textContent = task.title;
                taskIndicator.title = task.title;
                
                BrowserCompat.addEventListener(taskIndicator, 'click', function(e) {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                }.bind(this));
                
                dayCell.appendChild(taskIndicator);
            }
            
            BrowserCompat.addEventListener(dayCell, 'click', function(clickedDay) {
                return function() {
                    this.currentDate = new Date(clickedDay);
                    this.showTaskModal();
                };
            }(currentDay).bind(this));
            
            grid.appendChild(dayCell);
        }
    };

    MyCalendar.prototype.renderDayView = function() {
        var grid = BrowserCompat.getElementById('dayGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (var hour = 0; hour < 24; hour++) {
            var hourSlot = document.createElement('div');
            hourSlot.className = 'hour-slot';
            
            var hourLabel = document.createElement('div');
            hourLabel.className = 'hour-label';
            hourLabel.textContent = (hour < 10 ? '0' : '') + hour + ':00';
            hourSlot.appendChild(hourLabel);
            
            var hourContent = document.createElement('div');
            hourContent.className = 'hour-content';
            
            var dayTasks = this.getTasksForDate(this.currentDate);
            for (var i = 0; i < dayTasks.length; i++) {
                var task = dayTasks[i];
                var taskDate = new Date(task.date);
                if (taskDate.getHours() === hour) {
                    var taskIndicator = document.createElement('div');
                    taskIndicator.className = 'task-indicator';
                    taskIndicator.textContent = task.title;
                    taskIndicator.title = task.title;
                    
                    BrowserCompat.addEventListener(taskIndicator, 'click', function(e) {
                        e.stopPropagation();
                        this.showTaskDetails(task);
                    }.bind(this));
                    
                    hourContent.appendChild(taskIndicator);
                }
            }
            
            hourSlot.appendChild(hourContent);
            grid.appendChild(hourSlot);
        }
    };

    MyCalendar.prototype.renderAgendaView = function() {
        var grid = BrowserCompat.getElementById('agendaGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        var allTasks = this.tasks.concat(this.reminders);
        allTasks.sort(function(a, b) {
            var dateA = new Date(a.date || a.taskDate);
            var dateB = new Date(b.date || b.taskDate);
            return dateA - dateB;
        });
        
        for (var i = 0; i < allTasks.length; i++) {
            var task = allTasks[i];
            var taskItem = document.createElement('div');
            taskItem.className = 'agenda-item';
            
            var taskDate = new Date(task.date || task.taskDate);
            var dateStr = taskDate.toLocaleDateString();
            var timeStr = taskDate.toLocaleTimeString();
            
            taskItem.innerHTML = '<div class="agenda-date">' + dateStr + '</div>' +
                               '<div class="agenda-time">' + timeStr + '</div>' +
                               '<div class="agenda-title">' + (task.title || task.taskTitle) + '</div>' +
                               '<div class="agenda-description">' + (task.description || task.taskDescription || '') + '</div>';
            
            BrowserCompat.addEventListener(taskItem, 'click', this.showTaskDetails.bind(this, task));
            grid.appendChild(taskItem);
        }
    };

    MyCalendar.prototype.renderYearView = function() {
        var grid = BrowserCompat.getElementById('yearGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        var year = this.currentDate.getFullYear();
        
        for (var month = 0; month < 12; month++) {
            var monthCell = document.createElement('div');
            monthCell.className = 'month-cell';
            
            var monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
            var monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            monthHeader.textContent = monthName;
            monthCell.appendChild(monthHeader);
            
            var monthGrid = document.createElement('div');
            monthGrid.className = 'month-mini-grid';
            
            var firstDay = new Date(year, month, 1);
            var lastDay = new Date(year, month + 1, 0);
            var startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            for (var i = 0; i < 42; i++) {
                var currentDay = new Date(startDate);
                currentDay.setDate(startDate.getDate() + i);
                
                var dayCell = document.createElement('div');
                dayCell.className = 'mini-day-cell';
                
                if (currentDay.getMonth() !== month) {
                    dayCell.classList.add('other-month');
                }
                
                if (this.isToday(currentDay)) {
                    dayCell.classList.add('today');
                }
                
                dayCell.textContent = currentDay.getDate();
                
                var dayTasks = this.getTasksForDate(currentDay);
                if (dayTasks.length > 0) {
                    dayCell.classList.add('has-tasks');
                }
                
                monthGrid.appendChild(dayCell);
            }
            
            monthCell.appendChild(monthGrid);
            grid.appendChild(monthCell);
        }
    };

    MyCalendar.prototype.updateHeader = function() {
        var headerElement = BrowserCompat.getElementById('currentDate');
        if (!headerElement) return;
        
        switch (this.currentView) {
            case 'month':
                headerElement.textContent = this.currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                break;
            case 'week':
                var weekStart = this.getWeekStart(this.currentDate);
                var weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                headerElement.textContent = weekStart.toLocaleDateString() + ' - ' + weekEnd.toLocaleDateString();
                break;
            case 'day':
                headerElement.textContent = this.currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                });
                break;
            case 'agenda':
                headerElement.textContent = 'Agenda View';
                break;
            case 'year':
                headerElement.textContent = this.currentDate.getFullYear().toString();
                break;
        }
    };

    MyCalendar.prototype.getWeekStart = function(date) {
        var start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        return start;
    };

    MyCalendar.prototype.isToday = function(date) {
        var today = new Date();
        return date.toDateString() === today.toDateString();
    };

    MyCalendar.prototype.getTasksForDate = function(date) {
        var dateStr = date.toDateString();
        var result = [];
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            var taskDate = new Date(task.date);
            if (taskDate.toDateString() === dateStr) {
                result.push(task);
            }
        }
        return result;
    };

    MyCalendar.prototype.showTaskModal = function() {
        var modal = BrowserCompat.getElementById('taskModal');
        if (modal) {
            modal.style.display = 'block';
            this.resetTaskForm();
        }
    };

    MyCalendar.prototype.showRemindersModal = function() {
        var modal = BrowserCompat.getElementById('remindersModal');
        if (modal) {
            modal.style.display = 'block';
            this.renderReminders();
        }
    };

    MyCalendar.prototype.showSettingsModal = function() {
        var modal = BrowserCompat.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadSettings();
        }
    };

    MyCalendar.prototype.handleTaskSubmit = function(e) {
        e.preventDefault();
        
        var titleEl = BrowserCompat.getElementById('taskTitle');
        var descriptionEl = BrowserCompat.getElementById('taskDescription');
        var enableReminderEl = BrowserCompat.getElementById('enableReminder');
        
        if (!titleEl || !descriptionEl || !enableReminderEl) return;
        
        var title = titleEl.value;
        var description = descriptionEl.value;
        var enableReminder = enableReminderEl.checked;
        
        if (!title || !title.trim()) return;
        
        var task = {
            id: Date.now(),
            title: title.trim(),
            description: description.trim(),
            date: this.currentDate.toISOString(),
            enableReminder: enableReminder
        };
        
        this.tasks.push(task);
        this.saveToStorage('calendarTasks', this.tasks);
        
        if (enableReminder) {
            this.scheduleReminder(task);
        }
        
        this.renderCurrentView();
        this.closeModal('taskModal');
        this.showNotification('Task added successfully!');
    };

    MyCalendar.prototype.scheduleReminder = function(task) {
        var reminderTime = new Date(task.date);
        reminderTime.setHours(reminderTime.getHours() - this.settings.defaultReminderHours);
        
        var reminder = {
            id: Date.now(),
            taskId: task.id,
            taskTitle: task.title,
            taskDate: task.date,
            reminderTime: reminderTime.toISOString(),
            title: 'Reminder: ' + task.title,
            description: task.description
        };
        
        this.reminders.push(reminder);
        this.saveToStorage('calendarReminders', this.reminders);
    };

    MyCalendar.prototype.checkReminders = function() {
        var now = new Date();
        var upcomingReminders = [];
        
        for (var i = 0; i < this.reminders.length; i++) {
            var reminder = this.reminders[i];
            var reminderTime = new Date(reminder.reminderTime);
            if (reminderTime <= now && !reminder.notified) {
                upcomingReminders.push(reminder);
            }
        }
        
        for (var i = 0; i < upcomingReminders.length; i++) {
            this.showReminderNotification(upcomingReminders[i]);
            upcomingReminders[i].notified = true;
        }
        
        if (upcomingReminders.length > 0) {
            this.saveToStorage('calendarReminders', this.reminders);
        }
    };

    MyCalendar.prototype.showReminderNotification = function(reminder) {
        if (this.settings.globalDoNotDisturb) return;
        
        var notification = document.createElement('div');
        notification.className = 'reminder-notification';
        notification.innerHTML = '<div class="reminder-content">' +
                                '<h4>' + reminder.title + '</h4>' +
                                '<p>' + (reminder.description || '') + '</p>' +
                                '<button onclick="this.parentElement.parentElement.remove()">Dismiss</button>' +
                                '</div>';
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    };

    MyCalendar.prototype.startReminderChecker = function() {
        var self = this;
        setInterval(function() {
            self.checkReminders();
        }, 60000); // Check every minute
    };

    MyCalendar.prototype.renderReminders = function() {
        var container = BrowserCompat.getElementById('remindersList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.reminders.length === 0) {
            container.innerHTML = '<p>No reminders scheduled.</p>';
            return;
        }
        
        for (var i = 0; i < this.reminders.length; i++) {
            var reminder = this.reminders[i];
            var reminderItem = document.createElement('div');
            reminderItem.className = 'reminder-item';
            
            var reminderDate = new Date(reminder.reminderTime);
            var taskDate = new Date(reminder.taskDate);
            
            reminderItem.innerHTML = '<div class="reminder-info">' +
                                   '<h4>' + reminder.title + '</h4>' +
                                   '<p>Task: ' + reminder.taskTitle + '</p>' +
                                   '<p>Reminder: ' + reminderDate.toLocaleString() + '</p>' +
                                   '<p>Task Date: ' + taskDate.toLocaleString() + '</p>' +
                                   '</div>' +
                                   '<button onclick="calendar.deleteReminder(' + reminder.id + ')">Delete</button>';
            
            container.appendChild(reminderItem);
        }
    };

    MyCalendar.prototype.deleteReminder = function(reminderId) {
        var newReminders = [];
        for (var i = 0; i < this.reminders.length; i++) {
            if (this.reminders[i].id !== reminderId) {
                newReminders.push(this.reminders[i]);
            }
        }
        this.reminders = newReminders;
        this.saveToStorage('calendarReminders', this.reminders);
        this.renderReminders();
    };

    MyCalendar.prototype.loadSettings = function() {
        var defaultReminderHoursEl = BrowserCompat.getElementById('defaultReminderHours');
        var globalDoNotDisturbEl = BrowserCompat.getElementById('globalDoNotDisturb');
        
        if (defaultReminderHoursEl) {
            defaultReminderHoursEl.value = this.settings.defaultReminderHours;
        }
        if (globalDoNotDisturbEl) {
            globalDoNotDisturbEl.checked = this.settings.globalDoNotDisturb;
        }
    };

    MyCalendar.prototype.saveSettings = function() {
        var defaultReminderHoursEl = BrowserCompat.getElementById('defaultReminderHours');
        var globalDoNotDisturbEl = BrowserCompat.getElementById('globalDoNotDisturb');
        
        if (defaultReminderHoursEl) {
            this.settings.defaultReminderHours = parseInt(defaultReminderHoursEl.value) || 24;
        }
        if (globalDoNotDisturbEl) {
            this.settings.globalDoNotDisturb = globalDoNotDisturbEl.checked;
        }
        
        this.saveToStorage('calendarSettings', this.settings);
    };

    MyCalendar.prototype.showTaskDetails = function(task) {
        var modal = BrowserCompat.getElementById('taskDetailsModal');
        if (!modal) return;
        
        modal.style.display = 'block';
        
        var taskDate = new Date(task.date);
        var titleEl = BrowserCompat.getElementById('taskDetailsTitle');
        var descriptionEl = BrowserCompat.getElementById('taskDetailsDescription');
        var dateEl = BrowserCompat.getElementById('taskDetailsDate');
        
        if (titleEl) titleEl.textContent = task.title;
        if (descriptionEl) descriptionEl.textContent = task.description || 'No description';
        if (dateEl) dateEl.textContent = taskDate.toLocaleString();
        
        // Store current task for deletion
        this.currentTask = task;
    };

    MyCalendar.prototype.deleteTask = function() {
        if (!this.currentTask) return;
        
        var newTasks = [];
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].id !== this.currentTask.id) {
                newTasks.push(this.tasks[i]);
            }
        }
        this.tasks = newTasks;
        this.saveToStorage('calendarTasks', this.tasks);
        
        // Also remove associated reminders
        var newReminders = [];
        for (var i = 0; i < this.reminders.length; i++) {
            if (this.reminders[i].taskId !== this.currentTask.id) {
                newReminders.push(this.reminders[i]);
            }
        }
        this.reminders = newReminders;
        this.saveToStorage('calendarReminders', this.reminders);
        
        this.renderCurrentView();
        this.closeModal('taskDetailsModal');
        this.showNotification('Task deleted successfully!');
    };

    MyCalendar.prototype.resetTaskForm = function() {
        var titleEl = BrowserCompat.getElementById('taskTitle');
        var descriptionEl = BrowserCompat.getElementById('taskDescription');
        var enableReminderEl = BrowserCompat.getElementById('enableReminder');
        
        if (titleEl) titleEl.value = '';
        if (descriptionEl) descriptionEl.value = '';
        if (enableReminderEl) enableReminderEl.checked = true;
    };

    MyCalendar.prototype.closeModal = function(modalId) {
        var modal = BrowserCompat.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    };

    MyCalendar.prototype.saveToStorage = function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    };

    MyCalendar.prototype.loadFromStorage = function(key) {
        try {
            var data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return null;
        }
    };

    MyCalendar.prototype.showNotification = function(message) {
        var notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; z-index: 1000; animation: slideIn 0.3s ease;';
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    };

    // Initialize calendar when DOM is ready
    function initCalendar() {
        window.calendar = new MyCalendar();
        window.calendar.init();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        BrowserCompat.addEventListener(document, 'DOMContentLoaded', initCalendar);
    } else {
        initCalendar();
    }

})();

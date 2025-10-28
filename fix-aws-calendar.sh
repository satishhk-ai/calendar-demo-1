#!/bin/bash

# Fix AWS Calendar Deployment Script
# This script will fix the calendar on your AWS instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to update calendar files on AWS
update_calendar_files() {
    print_status "Updating calendar files on AWS instance..."
    
    # Create the application directory
    mkdir -p /var/www/html/calendar-app
    chown -R apache:apache /var/www/html/calendar-app
    chmod -R 755 /var/www/html/calendar-app
    
    # Copy files from source directory
    if [[ -d "/home/ec2-user/calendar-demo-1" ]]; then
        print_status "Copying files from source directory..."
        cp /home/ec2-user/calendar-demo-1/index.html /var/www/html/calendar-app/
        cp /home/ec2-user/calendar-demo-1/styles.css /var/www/html/calendar-app/
        cp /home/ec2-user/calendar-demo-1/script.js /var/www/html/calendar-app/
        chown -R apache:apache /var/www/html/calendar-app
        print_success "Files copied successfully"
    else
        print_error "Source directory not found: /home/ec2-user/calendar-demo-1"
        print_status "Please ensure the calendar files are in the correct location"
        return 1
    fi
}

# Function to fix the calendar JavaScript
fix_calendar_javascript() {
    print_status "Fixing calendar JavaScript..."
    
    local script_file="/var/www/html/calendar-app/script.js"
    
    if [[ ! -f "$script_file" ]]; then
        print_error "Script file not found: $script_file"
        return 1
    fi
    
    # Backup original
    cp "$script_file" "$script_file.backup"
    print_status "Original script backed up to: $script_file.backup"
    
    # Create a fixed version of the script
    cat > "$script_file" << 'EOF'
class MyCalendar {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.tasks = JSON.parse(localStorage.getItem('calendarTasks')) || [];
        this.reminders = JSON.parse(localStorage.getItem('calendarReminders')) || [];
        this.settings = {
            defaultReminderHours: 24,
            globalDoNotDisturb: false
        };
    }

    init() {
        console.log('MyCalendar: Initializing...');
        this.setupEventListeners();
        this.renderCurrentView();
        this.checkReminders();
        this.startReminderChecker();
        console.log('MyCalendar: Initialization complete');
    }

    setupEventListeners() {
        // View switching
        document.getElementById('monthViewBtn')?.addEventListener('click', () => this.switchView('month'));
        document.getElementById('weekViewBtn')?.addEventListener('click', () => this.switchView('week'));
        document.getElementById('dayViewBtn')?.addEventListener('click', () => this.switchView('day'));
        document.getElementById('agendaViewBtn')?.addEventListener('click', () => this.switchView('agenda'));
        document.getElementById('yearViewBtn')?.addEventListener('click', () => this.switchView('year'));

        // Navigation
        document.getElementById('prevBtn')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextBtn')?.addEventListener('click', () => this.navigate(1));

        // Task management
        document.getElementById('addTaskBtn')?.addEventListener('click', () => this.showTaskModal());
        document.getElementById('viewRemindersBtn')?.addEventListener('click', () => this.showRemindersModal());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettingsModal());

        // Task form
        document.getElementById('taskForm')?.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        document.getElementById('deleteTaskBtn')?.addEventListener('click', () => this.deleteTask());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    switchView(view) {
        console.log('MyCalendar: Switching to view:', view);
        this.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}ViewBtn`)?.classList.add('active');
        
        this.renderCurrentView();
    }

    navigate(direction) {
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

    renderMonthView() {
        console.log('MyCalendar: Rendering month view');
        const grid = document.getElementById('monthGrid');
        if (!grid) {
            console.error('MyCalendar: Could not find monthGrid element');
            return;
        }
        
        grid.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });
        
        // Calendar days
        for (let i = 0; i < 42; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            
            if (currentDay.getMonth() !== month) {
                dayCell.classList.add('other-month');
            }
            
            if (this.isToday(currentDay)) {
                dayCell.classList.add('today');
            }
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDay.getDate();
            dayCell.appendChild(dayNumber);
            
            // Add tasks for this day
            const dayTasks = this.getTasksForDate(currentDay);
            dayTasks.forEach(task => {
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.textContent = task.title;
                taskIndicator.title = task.title;
                taskIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                });
                dayCell.appendChild(taskIndicator);
            });
            
            dayCell.addEventListener('click', () => {
                this.currentDate = new Date(currentDay);
                this.showTaskModal();
            });
            
            grid.appendChild(dayCell);
        }
    }

    renderWeekView() {
        const grid = document.getElementById('weekGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const startOfWeek = this.getWeekStart(this.currentDate);
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });
        
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell week-day';
            
            if (this.isToday(currentDay)) {
                dayCell.classList.add('today');
            }
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDay.getDate();
            dayCell.appendChild(dayNumber);
            
            const dayTasks = this.getTasksForDate(currentDay);
            dayTasks.forEach(task => {
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.textContent = task.title;
                taskIndicator.title = task.title;
                taskIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                });
                dayCell.appendChild(taskIndicator);
            });
            
            dayCell.addEventListener('click', () => {
                this.currentDate = new Date(currentDay);
                this.showTaskModal();
            });
            
            grid.appendChild(dayCell);
        }
    }

    renderDayView() {
        const grid = document.getElementById('dayGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const hours = Array.from({length: 24}, (_, i) => i);
        
        hours.forEach(hour => {
            const hourSlot = document.createElement('div');
            hourSlot.className = 'hour-slot';
            
            const hourLabel = document.createElement('div');
            hourLabel.className = 'hour-label';
            hourLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            hourSlot.appendChild(hourLabel);
            
            const hourContent = document.createElement('div');
            hourContent.className = 'hour-content';
            
            const dayTasks = this.getTasksForDate(this.currentDate);
            const hourTasks = dayTasks.filter(task => {
                const taskDate = new Date(task.date);
                return taskDate.getHours() === hour;
            });
            
            hourTasks.forEach(task => {
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.textContent = task.title;
                taskIndicator.title = task.title;
                taskIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showTaskDetails(task);
                });
                hourContent.appendChild(taskIndicator);
            });
            
            hourSlot.appendChild(hourContent);
            grid.appendChild(hourSlot);
        });
    }

    renderAgendaView() {
        const grid = document.getElementById('agendaGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const allTasks = [...this.tasks, ...this.reminders].sort((a, b) => {
            const dateA = new Date(a.date || a.taskDate);
            const dateB = new Date(b.date || b.taskDate);
            return dateA - dateB;
        });
        
        allTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'agenda-item';
            
            const taskDate = new Date(task.date || task.taskDate);
            const dateStr = taskDate.toLocaleDateString();
            const timeStr = taskDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            taskItem.innerHTML = `
                <div class="agenda-date">${dateStr}</div>
                <div class="agenda-time">${timeStr}</div>
                <div class="agenda-title">${task.title || task.taskTitle}</div>
                <div class="agenda-description">${task.description || task.taskDescription || ''}</div>
            `;
            
            taskItem.addEventListener('click', () => this.showTaskDetails(task));
            grid.appendChild(taskItem);
        });
    }

    renderYearView() {
        const grid = document.getElementById('yearGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        
        for (let month = 0; month < 12; month++) {
            const monthCell = document.createElement('div');
            monthCell.className = 'month-cell';
            
            const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            monthHeader.textContent = monthName;
            monthCell.appendChild(monthHeader);
            
            const monthGrid = document.createElement('div');
            monthGrid.className = 'month-mini-grid';
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            for (let i = 0; i < 42; i++) {
                const currentDay = new Date(startDate);
                currentDay.setDate(startDate.getDate() + i);
                
                const dayCell = document.createElement('div');
                dayCell.className = 'mini-day-cell';
                
                if (currentDay.getMonth() !== month) {
                    dayCell.classList.add('other-month');
                }
                
                if (this.isToday(currentDay)) {
                    dayCell.classList.add('today');
                }
                
                dayCell.textContent = currentDay.getDate();
                
                const dayTasks = this.getTasksForDate(currentDay);
                if (dayTasks.length > 0) {
                    dayCell.classList.add('has-tasks');
                }
                
                monthGrid.appendChild(dayCell);
            }
            
            monthCell.appendChild(monthGrid);
            grid.appendChild(monthCell);
        }
    }

    updateHeader() {
        const headerElement = document.getElementById('currentDate');
        if (!headerElement) return;
        
        switch (this.currentView) {
            case 'month':
                headerElement.textContent = this.currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                break;
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                headerElement.textContent = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
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
    }

    getWeekStart(date) {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        return start;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getTasksForDate(date) {
        const dateStr = date.toDateString();
        return this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate.toDateString() === dateStr;
        });
    }

    showTaskModal() {
        document.getElementById('taskModal').style.display = 'block';
        this.resetTaskForm();
    }

    showRemindersModal() {
        document.getElementById('remindersModal').style.display = 'block';
        this.renderReminders();
    }

    showSettingsModal() {
        document.getElementById('settingsModal').style.display = 'block';
        this.loadSettings();
    }

    handleTaskSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const enableReminder = document.getElementById('enableReminder').checked;
        
        if (!title.trim()) return;
        
        const task = {
            id: Date.now(),
            title: title.trim(),
            description: description.trim(),
            date: this.currentDate.toISOString(),
            enableReminder
        };
        
        this.tasks.push(task);
        this.saveTasks();
        
        if (enableReminder) {
            this.scheduleReminder(task);
        }
        
        this.renderCurrentView();
        this.closeModal('taskModal');
        this.showNotification('Task added successfully!');
    }

    scheduleReminder(task) {
        const reminderTime = new Date(task.date);
        reminderTime.setHours(reminderTime.getHours() - this.settings.defaultReminderHours);
        
        const reminder = {
            id: Date.now(),
            taskId: task.id,
            taskTitle: task.title,
            taskDate: task.date,
            reminderTime: reminderTime.toISOString(),
            title: `Reminder: ${task.title}`,
            description: task.description
        };
        
        this.reminders.push(reminder);
        this.saveReminders();
    }

    checkReminders() {
        const now = new Date();
        const upcomingReminders = this.reminders.filter(reminder => {
            const reminderTime = new Date(reminder.reminderTime);
            return reminderTime <= now && !reminder.notified;
        });
        
        upcomingReminders.forEach(reminder => {
            this.showReminderNotification(reminder);
            reminder.notified = true;
        });
        
        if (upcomingReminders.length > 0) {
            this.saveReminders();
        }
    }

    showReminderNotification(reminder) {
        if (this.settings.globalDoNotDisturb) return;
        
        const notification = document.createElement('div');
        notification.className = 'reminder-notification';
        notification.innerHTML = `
            <div class="reminder-content">
                <h4>${reminder.title}</h4>
                <p>${reminder.description || ''}</p>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    startReminderChecker() {
        setInterval(() => this.checkReminders(), 60000); // Check every minute
    }

    renderReminders() {
        const container = document.getElementById('remindersList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.reminders.length === 0) {
            container.innerHTML = '<p>No reminders scheduled.</p>';
            return;
        }
        
        this.reminders.forEach(reminder => {
            const reminderItem = document.createElement('div');
            reminderItem.className = 'reminder-item';
            
            const reminderDate = new Date(reminder.reminderTime);
            const taskDate = new Date(reminder.taskDate);
            
            reminderItem.innerHTML = `
                <div class="reminder-info">
                    <h4>${reminder.title}</h4>
                    <p>Task: ${reminder.taskTitle}</p>
                    <p>Reminder: ${reminderDate.toLocaleString()}</p>
                    <p>Task Date: ${taskDate.toLocaleString()}</p>
                </div>
                <button onclick="calendar.deleteReminder(${reminder.id})">Delete</button>
            `;
            
            container.appendChild(reminderItem);
        });
    }

    deleteReminder(reminderId) {
        this.reminders = this.reminders.filter(r => r.id !== reminderId);
        this.saveReminders();
        this.renderReminders();
    }

    loadSettings() {
        document.getElementById('defaultReminderHours').value = this.settings.defaultReminderHours;
        document.getElementById('globalDoNotDisturb').checked = this.settings.globalDoNotDisturb;
    }

    saveSettings() {
        this.settings.defaultReminderHours = parseInt(document.getElementById('defaultReminderHours').value);
        this.settings.globalDoNotDisturb = document.getElementById('globalDoNotDisturb').checked;
        localStorage.setItem('calendarSettings', JSON.stringify(this.settings));
    }

    showTaskDetails(task) {
        document.getElementById('taskDetailsModal').style.display = 'block';
        
        const taskDate = new Date(task.date);
        document.getElementById('taskDetailsTitle').textContent = task.title;
        document.getElementById('taskDetailsDescription').textContent = task.description || 'No description';
        document.getElementById('taskDetailsDate').textContent = taskDate.toLocaleString();
        
        // Store current task for deletion
        this.currentTask = task;
    }

    deleteTask() {
        if (!this.currentTask) return;
        
        this.tasks = this.tasks.filter(t => t.id !== this.currentTask.id);
        this.saveTasks();
        
        // Also remove associated reminders
        this.reminders = this.reminders.filter(r => r.taskId !== this.currentTask.id);
        this.saveReminders();
        
        this.renderCurrentView();
        this.closeModal('taskDetailsModal');
        this.showNotification('Task deleted successfully!');
    }

    resetTaskForm() {
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('enableReminder').checked = true;
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    saveTasks() {
        localStorage.setItem('calendarTasks', JSON.stringify(this.tasks));
    }

    saveReminders() {
        localStorage.setItem('calendarReminders', JSON.stringify(this.reminders));
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new MyCalendar();
    window.calendar.init();
});
EOF
    
    print_success "Calendar JavaScript fixed"
}

# Function to create Apache configuration
create_apache_config() {
    print_status "Creating Apache configuration..."
    
    cat > /etc/httpd/conf.d/calendar-app.conf << 'EOF'
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/html/calendar-app
    
    <Directory /var/www/html/calendar-app>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html
    </Directory>
    
    ErrorLog /var/log/httpd/calendar-app_error.log
    CustomLog /var/log/httpd/calendar-app_access.log combined
</VirtualHost>
EOF
    
    print_success "Apache configuration created"
}

# Function to restart Apache
restart_apache() {
    print_status "Restarting Apache..."
    
    systemctl restart httpd
    
    if systemctl is-active --quiet httpd; then
        print_success "Apache restarted successfully"
    else
        print_error "Failed to restart Apache"
        return 1
    fi
}

# Function to test the calendar
test_calendar() {
    print_status "Testing calendar access..."
    
    # Test local access
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost/calendar-app" | grep -q "200"; then
        print_success "✅ Calendar accessible locally"
    else
        print_warning "⚠️ Calendar not accessible locally"
    fi
    
    # Test external access
    if curl -s -o /dev/null -w "%{http_code}" "http://54.160.243.127/calendar-app" | grep -q "200"; then
        print_success "✅ Calendar accessible externally"
    else
        print_warning "⚠️ Calendar may not be accessible externally (check security groups)"
    fi
}

# Main function
main() {
    echo "=========================================="
    echo "    Fix AWS Calendar Deployment Script"
    echo "=========================================="
    echo
    
    check_root
    update_calendar_files
    fix_calendar_javascript
    create_apache_config
    restart_apache
    test_calendar
    
    echo
    print_success "🎉 Calendar fix complete!"
    echo
    print_status "📱 Access your calendar at:"
    print_status "   http://54.160.243.127/calendar-app"
    echo
    print_status "🔍 Check if it's working by opening the URL in your browser"
    echo
}

# Run main function
main "$@"

#!/bin/bash

# AWS Calendar Troubleshooting Script
# This script will diagnose and fix calendar issues on AWS Linux instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check Apache status
check_apache() {
    print_status "Checking Apache status..."
    
    if systemctl is-active --quiet httpd; then
        print_success "Apache is running"
    else
        print_warning "Apache is not running. Starting Apache..."
        systemctl start httpd
        systemctl enable httpd
        print_success "Apache started and enabled"
    fi
}

# Function to check Apache configuration
check_apache_config() {
    print_status "Checking Apache configuration..."
    
    if [[ -f "/etc/httpd/conf.d/calendar-app.conf" ]]; then
        print_success "Calendar app configuration found"
        print_status "Configuration content:"
        cat /etc/httpd/conf.d/calendar-app.conf
    else
        print_warning "Calendar app configuration not found. Creating it..."
        create_apache_config
    fi
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

# Function to check application directory
check_app_directory() {
    print_status "Checking application directory..."
    
    if [[ -d "/var/www/html/calendar-app" ]]; then
        print_success "Application directory exists"
        print_status "Directory contents:"
        ls -la /var/www/html/calendar-app/
    else
        print_warning "Application directory not found. Creating it..."
        mkdir -p /var/www/html/calendar-app
        chown -R apache:apache /var/www/html/calendar-app
        print_success "Application directory created"
    fi
}

# Function to check application files
check_app_files() {
    print_status "Checking application files..."
    
    local files=("index.html" "styles.css" "script.js")
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [[ -f "/var/www/html/calendar-app/$file" ]]; then
            print_success "Found $file"
        else
            print_warning "Missing $file"
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_status "Copying missing files from source directory..."
        copy_app_files
    fi
}

# Function to copy application files
copy_app_files() {
    print_status "Copying application files..."
    
    local source_dir="/home/ec2-user/calendar-demo-1"
    
    if [[ -d "$source_dir" ]]; then
        print_status "Source directory found: $source_dir"
        
        # Copy files
        cp "$source_dir/index.html" /var/www/html/calendar-app/
        cp "$source_dir/styles.css" /var/www/html/calendar-app/
        cp "$source_dir/script.js" /var/www/html/calendar-app/
        
        # Set permissions
        chown -R apache:apache /var/www/html/calendar-app
        chmod -R 755 /var/www/html/calendar-app
        
        print_success "Files copied and permissions set"
    else
        print_error "Source directory not found: $source_dir"
        print_status "Please ensure the calendar files are in the correct location"
        return 1
    fi
}

# Function to check file permissions
check_permissions() {
    print_status "Checking file permissions..."
    
    local app_dir="/var/www/html/calendar-app"
    
    # Check ownership
    local owner=$(stat -c '%U:%G' "$app_dir")
    if [[ "$owner" == "apache:apache" ]]; then
        print_success "Correct ownership: $owner"
    else
        print_warning "Incorrect ownership: $owner. Fixing..."
        chown -R apache:apache "$app_dir"
        print_success "Ownership fixed"
    fi
    
    # Check permissions
    local perms=$(stat -c '%a' "$app_dir")
    if [[ "$perms" == "755" ]]; then
        print_success "Correct permissions: $perms"
    else
        print_warning "Incorrect permissions: $perms. Fixing..."
        chmod -R 755 "$app_dir"
        print_success "Permissions fixed"
    fi
}

# Function to check Apache error logs
check_apache_logs() {
    print_status "Checking Apache error logs..."
    
    local error_log="/var/log/httpd/error_log"
    local calendar_error_log="/var/log/httpd/calendar-app_error.log"
    
    if [[ -f "$error_log" ]]; then
        print_status "Recent Apache errors:"
        tail -20 "$error_log" | grep -i calendar || print_status "No calendar-related errors found"
    fi
    
    if [[ -f "$calendar_error_log" ]]; then
        print_status "Calendar app specific errors:"
        tail -20 "$calendar_error_log" || print_status "No calendar app errors found"
    fi
}

# Function to test calendar access
test_calendar_access() {
    print_status "Testing calendar access..."
    
    local url="http://localhost/calendar-app"
    
    # Test local access
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        print_success "Calendar accessible locally"
    else
        print_warning "Calendar not accessible locally"
    fi
    
    # Test file access
    local files=("index.html" "styles.css" "script.js")
    for file in "${files[@]}"; do
        local file_url="http://localhost/calendar-app/$file"
        if curl -s -o /dev/null -w "%{http_code}" "$file_url" | grep -q "200"; then
            print_success "File accessible: $file"
        else
            print_warning "File not accessible: $file"
        fi
    done
}

# Function to fix common calendar issues
fix_calendar_issues() {
    print_status "Applying common calendar fixes..."
    
    local script_file="/var/www/html/calendar-app/script.js"
    
    if [[ -f "$script_file" ]]; then
        print_status "Backing up original script.js..."
        cp "$script_file" "$script_file.backup"
        
        print_status "Applying fixes to script.js..."
        
        # Fix 1: Ensure renderCurrentView properly sets active class
        sed -i 's/this.renderCurrentView();/this.renderCurrentView();\n        \/\/ Ensure month view is active\n        const monthView = document.getElementById("monthView");\n        if (monthView) {\n            document.querySelectorAll(".calendar-view").forEach(view => view.classList.remove("active"));\n            monthView.classList.add("active");\n        }/' "$script_file"
        
        # Fix 2: Add error handling to renderCurrentView
        sed -i 's/renderCurrentView() {/renderCurrentView() {\n        console.log("MyCalendar: Rendering view:", this.currentView);\n        \n        \/\/ Hide all calendar views\n        document.querySelectorAll(".calendar-view").forEach(view => view.classList.remove("active"));\n        \n        \/\/ Show the current view\n        const currentViewElement = document.getElementById(`${this.currentView}View`);\n        if (currentViewElement) {\n            currentViewElement.classList.add("active");\n            console.log("MyCalendar: Set active class on", this.currentView + "View");\n        } else {\n            console.error("MyCalendar: Could not find element:", this.currentView + "View");\n        }/' "$script_file"
        
        print_success "Calendar fixes applied"
    else
        print_error "Script file not found: $script_file"
    fi
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

# Function to show final status
show_final_status() {
    print_status "Final status check..."
    
    echo
    print_status "=== CALENDAR APPLICATION STATUS ==="
    echo
    
    # Apache status
    if systemctl is-active --quiet httpd; then
        print_success "✅ Apache is running"
    else
        print_error "❌ Apache is not running"
    fi
    
    # Application directory
    if [[ -d "/var/www/html/calendar-app" ]]; then
        print_success "✅ Application directory exists"
    else
        print_error "❌ Application directory missing"
    fi
    
    # Application files
    local files=("index.html" "styles.css" "script.js")
    for file in "${files[@]}"; do
        if [[ -f "/var/www/html/calendar-app/$file" ]]; then
            print_success "✅ $file exists"
        else
            print_error "❌ $file missing"
        fi
    done
    
    # Access URLs
    echo
    print_status "=== ACCESS INFORMATION ==="
    echo
    print_status "Local access: http://localhost/calendar-app"
    print_status "External access: http://54.160.243.127/calendar-app"
    print_status "Direct file access: http://54.160.243.127/calendar-app/index.html"
    echo
    
    # Test external access
    print_status "Testing external access..."
    if curl -s -o /dev/null -w "%{http_code}" "http://54.160.243.127/calendar-app" | grep -q "200"; then
        print_success "✅ Calendar accessible externally"
    else
        print_warning "⚠️ Calendar may not be accessible externally (check security groups)"
    fi
}

# Main function
main() {
    echo "=========================================="
    echo "    AWS Calendar Troubleshooting Script"
    echo "=========================================="
    echo
    
    check_root
    check_apache
    check_apache_config
    check_app_directory
    check_app_files
    check_permissions
    check_apache_logs
    fix_calendar_issues
    restart_apache
    test_calendar_access
    show_final_status
    
    echo
    print_success "Troubleshooting complete!"
    print_status "Check the calendar at: http://54.160.243.127/calendar-app"
}

# Run main function
main "$@"

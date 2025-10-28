#!/bin/bash

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

# Function to install Apache if not present
install_apache() {
    print_status "Installing Apache web server..."
    
    if [[ $EUID -eq 0 ]]; then
        yum update -y
        yum install -y httpd
        systemctl start httpd
        systemctl enable httpd
    else
        sudo yum update -y
        sudo yum install -y httpd
        sudo systemctl start httpd
        sudo systemctl enable httpd
    fi
    
    print_success "Apache installed and started successfully"
}

# Function to setup firewall
setup_firewall() {
    print_status "Setting up firewall rules..."
    
    # Check if firewalld is running
    if systemctl is-active --quiet firewalld; then
        if [[ $EUID -eq 0 ]]; then
            firewall-cmd --permanent --add-port=80/tcp
            firewall-cmd --permanent --add-port=3000/tcp
            firewall-cmd --reload
        else
            sudo firewall-cmd --permanent --add-port=80/tcp
            sudo firewall-cmd --permanent --add-port=3000/tcp
            sudo firewall-cmd --reload
        fi
        print_success "Firewall rules added for ports 80 and 3000"
    else
        print_warning "Firewalld is not running. Please ensure ports 80 and 3000 are open in your security group."
    fi
}

# Function to create application directory
setup_app_directory() {
    print_status "Setting up application directory..."
    
    # Create app directory
    if [[ $EUID -eq 0 ]]; then
        mkdir -p /var/www/html/calendar-app
        chown -R apache:apache /var/www/html/calendar-app
        cd /var/www/html/calendar-app
    else
        sudo mkdir -p /var/www/html/calendar-app
        sudo chown -R apache:apache /var/www/html/calendar-app
        cd /var/www/html/calendar-app
    fi
    
    print_success "Application directory created at /var/www/html/calendar-app"
}

# Function to copy application files
copy_app_files() {
    print_status "Copying application files..."
    
    # Copy files from source directory
    if [[ -f "/home/ec2-user/calendar-demo-1/index.html" ]]; then
        print_status "Copying application files from source directory..."
        if [[ $EUID -eq 0 ]]; then
            cp /home/ec2-user/calendar-demo-1/index.html .
            cp /home/ec2-user/calendar-demo-1/styles.css .
            cp /home/ec2-user/calendar-demo-1/script.js .
            chown -R apache:apache .
        else
            sudo cp /home/ec2-user/calendar-demo-1/index.html .
            sudo cp /home/ec2-user/calendar-demo-1/styles.css .
            sudo cp /home/ec2-user/calendar-demo-1/script.js .
            sudo chown -R apache:apache .
        fi
        print_success "Application files copied successfully"
    else
        print_warning "Source files not found in /home/ec2-user/calendar-demo-1/"
        print_status "Please ensure all files are copied to the AWS instance first"
        exit 1
    fi
}

# Function to create Apache virtual host
create_apache_config() {
    print_status "Creating Apache configuration..."
    
    if [[ $EUID -eq 0 ]]; then
        cat > /etc/httpd/conf.d/calendar-app.conf << 'EOF'
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/html/calendar-app
    
    <Directory /var/www/html/calendar-app>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html
    </Directory>
    
    # Enable CORS
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
</VirtualHost>
EOF
    else
        sudo tee /etc/httpd/conf.d/calendar-app.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/html/calendar-app
    
    <Directory /var/www/html/calendar-app>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html
    </Directory>
    
    # Enable CORS
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
</VirtualHost>
EOF
    fi
    
    print_success "Apache configuration created"
}

# Function to start the application
start_application() {
    print_status "Starting My Calendar Application..."
    
    # Restart Apache to apply configuration
    if [[ $EUID -eq 0 ]]; then
        systemctl restart httpd
        systemctl status httpd --no-pager
    else
        sudo systemctl restart httpd
        sudo systemctl status httpd --no-pager
    fi
    
    # Check if Apache is running
    if systemctl is-active --quiet httpd; then
        print_success "My Calendar Application is running!"
        print_status "Application is accessible at: http://$AWS_IP"
        print_status "Application is also accessible at: http://$AWS_IP/calendar-app"
    else
        print_error "Failed to start Apache"
        print_status "Checking Apache logs..."
        if [[ $EUID -eq 0 ]]; then
            journalctl -u httpd --no-pager -l
        else
            sudo journalctl -u httpd --no-pager -l
        fi
        exit 1
    fi
}

# Function to show status
show_status() {
    print_status "Checking application status..."
    
    echo ""
    echo "=== Apache Status ==="
    if [[ $EUID -eq 0 ]]; then
        systemctl status httpd --no-pager
    else
        sudo systemctl status httpd --no-pager
    fi
    
    echo ""
    echo "=== Application Files ==="
    ls -la /var/www/html/calendar-app/
    
    echo ""
    echo "=== Apache Configuration ==="
    if [[ $EUID -eq 0 ]]; then
        cat /etc/httpd/conf.d/calendar-app.conf
    else
        sudo cat /etc/httpd/conf.d/calendar-app.conf
    fi
}

# Function to show help
show_help() {
    echo "My Calendar Direct Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script will prompt you for the AWS instance public IPv4 address"
    echo "to make the calendar accessible from the internet."
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -s, --status   Show application status"
    echo "  -r, --restart  Restart Apache"
    echo "  -l, --logs     Show Apache logs"
    echo ""
    echo "Examples:"
    echo "  $0              # Deploy the application (will prompt for IP)"
    echo "  $0 --status     # Check application status"
    echo "  $0 --restart    # Restart Apache"
}

# Main deployment function
deploy_application() {
    print_status "Starting My Calendar direct deployment..."
    
    # Get AWS instance IP
    read -p "Enter AWS instance public IPv4 address: " AWS_IP
    
    if [[ -z "$AWS_IP" ]]; then
        print_error "IP address is required"
        exit 1
    fi
    
    print_status "Deploying to: $AWS_IP"
    
    # Install Apache if not present
    if ! command -v httpd >/dev/null 2>&1; then
        install_apache
    else
        print_success "Apache is already installed"
    fi
    
    # Setup firewall
    setup_firewall
    
    # Setup application directory
    setup_app_directory
    
    # Copy application files
    copy_app_files
    
    # Create Apache configuration
    create_apache_config
    
    # Start the application
    start_application
    
    print_success "Deployment completed successfully!"
    echo ""
    print_status "My Calendar is now running at: http://$AWS_IP"
    print_status "To check status: $0 --status"
    print_status "To restart: $0 --restart"
    print_status "To view logs: $0 --logs"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -s|--status)
        show_status
        exit 0
        ;;
    -r|--restart)
        print_status "Restarting Apache..."
        if [[ $EUID -eq 0 ]]; then
            systemctl restart httpd
        else
            sudo systemctl restart httpd
        fi
        print_success "Apache restarted"
        ;;
    -l|--logs)
        print_status "Showing Apache logs..."
        if [[ $EUID -eq 0 ]]; then
            journalctl -u httpd -f
        else
            sudo journalctl -u httpd -f
        fi
        ;;
    "")
        deploy_application
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
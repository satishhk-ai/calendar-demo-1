#!/bin/bash

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

print_status "=== Fixing Calendar App Deployment ==="

# Get AWS IP
read -p "Enter AWS instance IP address: " AWS_IP

# 1. Ensure Apache is installed and running
print_status "1. Installing and starting Apache..."
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd

# 2. Setup firewall
print_status "2. Setting up firewall..."
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload

# 3. Create application directory
print_status "3. Creating application directory..."
mkdir -p /var/www/html/calendar-app
chown -R apache:apache /var/www/html/calendar-app

# 4. Copy files from source
print_status "4. Copying application files..."
if [[ -f "/home/ec2-user/calendar-app/index.html" ]]; then
    cp /home/ec2-user/calendar-app/index.html /var/www/html/calendar-app/
    cp /home/ec2-user/calendar-app/styles.css /var/www/html/calendar-app/
    cp /home/ec2-user/calendar-app/script.js /var/www/html/calendar-app/
    chown -R apache:apache /var/www/html/calendar-app
    print_success "Files copied successfully"
else
    print_error "Source files not found. Please copy files first."
    exit 1
fi

# 5. Create proper Apache configuration
print_status "5. Creating Apache configuration..."
cat > /etc/httpd/conf.d/calendar-app.conf << 'EOF'
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/html/calendar-app
    
    <Directory /var/www/html/calendar-app>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html
        Options Indexes FollowSymLinks
    </Directory>
    
    # Enable CORS
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
</VirtualHost>
EOF

# 6. Set proper permissions
print_status "6. Setting permissions..."
chmod 644 /var/www/html/calendar-app/index.html
chmod 644 /var/www/html/calendar-app/styles.css
chmod 644 /var/www/html/calendar-app/script.js
chown apache:apache /var/www/html/calendar-app/*
chown apache:apache /var/www/html/calendar-app

# 7. Test Apache configuration
print_status "7. Testing Apache configuration..."
if httpd -t; then
    print_success "Apache configuration is valid"
else
    print_error "Apache configuration has errors"
    exit 1
fi

# 8. Restart Apache
print_status "8. Restarting Apache..."
systemctl restart httpd

# 9. Verify everything is working
print_status "9. Verifying deployment..."
sleep 3

if systemctl is-active --quiet httpd; then
    print_success "Apache is running"
else
    print_error "Apache failed to start"
    exit 1
fi

# 10. Test local access
print_status "10. Testing local access..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost/calendar-app/ | grep -q "200"; then
    print_success "Application is accessible locally"
else
    print_warning "Local access test failed"
fi

print_success "=== Deployment Fix Complete ==="
echo ""
print_status "Your calendar app should now be accessible at:"
print_status "Main URL: http://$AWS_IP"
print_status "Direct URL: http://$AWS_IP/calendar-app"
echo ""
print_status "If still not accessible, check:"
print_status "1. AWS Security Group - ensure port 80 is open"
print_status "2. Try: curl http://localhost/calendar-app/"
print_status "3. Check Apache logs: tail -f /var/log/httpd/error_log"

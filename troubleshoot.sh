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

print_status "=== Calendar App Troubleshooting ==="

echo ""
print_status "1. Checking Apache status..."
if systemctl is-active --quiet httpd; then
    print_success "Apache is running"
else
    print_error "Apache is not running"
    print_status "Starting Apache..."
    systemctl start httpd
    systemctl enable httpd
fi

echo ""
print_status "2. Checking Apache configuration..."
if [[ -f "/etc/httpd/conf.d/calendar-app.conf" ]]; then
    print_success "Calendar app configuration exists"
    echo "Configuration content:"
    cat /etc/httpd/conf.d/calendar-app.conf
else
    print_error "Calendar app configuration not found"
    print_status "Creating configuration..."
    
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
fi

echo ""
print_status "3. Checking application files..."
if [[ -f "/var/www/html/calendar-app/index.html" ]]; then
    print_success "index.html exists"
    echo "File size: $(stat -c%s /var/www/html/calendar-app/index.html) bytes"
else
    print_error "index.html not found"
fi

if [[ -f "/var/www/html/calendar-app/styles.css" ]]; then
    print_success "styles.css exists"
    echo "File size: $(stat -c%s /var/www/html/calendar-app/styles.css) bytes"
else
    print_error "styles.css not found"
fi

if [[ -f "/var/www/html/calendar-app/script.js" ]]; then
    print_success "script.js exists"
    echo "File size: $(stat -c%s /var/www/html/calendar-app/script.js) bytes"
else
    print_error "script.js not found"
fi

echo ""
print_status "4. Checking file permissions..."
ls -la /var/www/html/calendar-app/

echo ""
print_status "5. Checking Apache error logs..."
if [[ -f "/var/log/httpd/error_log" ]]; then
    echo "Recent Apache errors:"
    tail -20 /var/log/httpd/error_log
else
    print_warning "Apache error log not found"
fi

echo ""
print_status "6. Testing Apache configuration..."
if httpd -t; then
    print_success "Apache configuration is valid"
else
    print_error "Apache configuration has errors"
fi

echo ""
print_status "7. Restarting Apache..."
systemctl restart httpd
sleep 2

if systemctl is-active --quiet httpd; then
    print_success "Apache restarted successfully"
else
    print_error "Apache failed to restart"
fi

echo ""
print_status "8. Testing local access..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost/calendar-app/; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/calendar-app/)
    if [[ "$HTTP_CODE" == "200" ]]; then
        print_success "Application is accessible locally (HTTP $HTTP_CODE)"
    else
        print_warning "Application returned HTTP $HTTP_CODE"
    fi
else
    print_error "Cannot access application locally"
fi

echo ""
print_status "9. Checking firewall status..."
if systemctl is-active --quiet firewalld; then
    print_status "Firewalld is running"
    firewall-cmd --list-ports
else
    print_warning "Firewalld is not running"
fi

echo ""
print_status "10. Final recommendations..."
echo "If the app is still not accessible:"
echo "1. Check AWS Security Group - ensure port 80 is open"
echo "2. Try accessing: http://YOUR_IP/calendar-app/"
echo "3. Check if files are in the correct location"
echo "4. Verify Apache is listening on port 80: netstat -tlnp | grep :80"

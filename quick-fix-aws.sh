#!/bin/bash

# Quick Fix Script for AWS Calendar
# Run this on your AWS instance to quickly fix calendar issues

echo "🔧 Quick Calendar Fix for AWS Instance"
echo "======================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "✅ Running as root"

# 1. Ensure Apache is running
echo "📋 Step 1: Checking Apache..."
systemctl start httpd
systemctl enable httpd
echo "✅ Apache started"

# 2. Create application directory if it doesn't exist
echo "📋 Step 2: Setting up application directory..."
mkdir -p /var/www/html/calendar-app
chown -R apache:apache /var/www/html/calendar-app
chmod -R 755 /var/www/html/calendar-app
echo "✅ Application directory ready"

# 3. Copy files from source directory
echo "📋 Step 3: Copying application files..."
if [[ -d "/home/ec2-user/calendar-demo-1" ]]; then
    cp /home/ec2-user/calendar-demo-1/index.html /var/www/html/calendar-app/
    cp /home/ec2-user/calendar-demo-1/styles.css /var/www/html/calendar-app/
    cp /home/ec2-user/calendar-demo-1/script.js /var/www/html/calendar-app/
    chown -R apache:apache /var/www/html/calendar-app
    echo "✅ Files copied from source directory"
else
    echo "⚠️ Source directory not found, checking if files exist in app directory..."
    if [[ -f "/var/www/html/calendar-app/index.html" ]]; then
        echo "✅ Files already exist in app directory"
    else
        echo "❌ No source files found. Please ensure calendar files are available."
        exit 1
    fi
fi

# 4. Create Apache configuration
echo "📋 Step 4: Creating Apache configuration..."
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
echo "✅ Apache configuration created"

# 5. Fix calendar JavaScript issues
echo "📋 Step 5: Fixing calendar JavaScript..."
if [[ -f "/var/www/html/calendar-app/script.js" ]]; then
    # Backup original
    cp /var/www/html/calendar-app/script.js /var/www/html/calendar-app/script.js.backup
    
    # Apply fixes
    sed -i 's/renderCurrentView() {/renderCurrentView() {\n        console.log("MyCalendar: Rendering view:", this.currentView);\n        \n        \/\/ Hide all calendar views\n        document.querySelectorAll(".calendar-view").forEach(view => view.classList.remove("active"));\n        \n        \/\/ Show the current view\n        const currentViewElement = document.getElementById(`${this.currentView}View`);\n        if (currentViewElement) {\n            currentViewElement.classList.add("active");\n            console.log("MyCalendar: Set active class on", this.currentView + "View");\n        } else {\n            console.error("MyCalendar: Could not find element:", this.currentView + "View");\n        }/' /var/www/html/calendar-app/script.js
    
    echo "✅ JavaScript fixes applied"
else
    echo "❌ Script file not found"
fi

# 6. Restart Apache
echo "📋 Step 6: Restarting Apache..."
systemctl restart httpd
echo "✅ Apache restarted"

# 7. Test access
echo "📋 Step 7: Testing access..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost/calendar-app" | grep -q "200"; then
    echo "✅ Calendar accessible locally"
else
    echo "⚠️ Calendar not accessible locally"
fi

# 8. Show final status
echo
echo "🎉 Quick Fix Complete!"
echo "====================="
echo
echo "📱 Access your calendar at:"
echo "   http://54.160.243.127/calendar-app"
echo
echo "🔍 Check if it's working by opening the URL in your browser"
echo
echo "📋 If you still have issues, run the full troubleshooting script:"
echo "   sudo bash aws-troubleshoot.sh"
echo

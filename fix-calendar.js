// Calendar Fix Script
// This script will identify and fix common calendar issues

console.log('🔧 Calendar Fix Script Starting...');

function fixCalendarIssues() {
    const fixes = [];
    
    // Fix 1: Ensure all calendar views are properly initialized
    function fixCalendarViews() {
        const calendarViews = ['monthView', 'weekView', 'workweekView', 'dayView', 'agendaView', 'yearView'];
        let fixed = 0;
        
        calendarViews.forEach(viewId => {
            const element = document.getElementById(viewId);
            if (element) {
                // Ensure the element exists and has proper classes
                if (!element.classList.contains('calendar-view')) {
                    element.classList.add('calendar-view');
                    fixed++;
                }
            } else {
                console.error(`Missing calendar view element: ${viewId}`);
            }
        });
        
        if (fixed > 0) {
            fixes.push(`✅ Fixed ${fixed} calendar view elements`);
        }
        
        return fixed > 0;
    }
    
    // Fix 2: Ensure month view is active by default
    function fixActiveView() {
        const monthView = document.getElementById('monthView');
        if (monthView) {
            // Remove active from all views
            document.querySelectorAll('.calendar-view').forEach(view => {
                view.classList.remove('active');
            });
            
            // Add active to month view
            monthView.classList.add('active');
            fixes.push('✅ Set month view as active');
            return true;
        }
        return false;
    }
    
    // Fix 3: Force calendar rendering
    function forceCalendarRender() {
        if (typeof calendar !== 'undefined' && calendar !== null) {
            try {
                // Force re-render
                calendar.renderCurrentView();
                fixes.push('✅ Forced calendar re-render');
                return true;
            } catch (error) {
                console.error('Error forcing calendar render:', error);
                fixes.push('❌ Failed to force calendar render: ' + error.message);
                return false;
            }
        } else {
            fixes.push('❌ Calendar instance not found');
            return false;
        }
    }
    
    // Fix 4: Check and fix CSS visibility
    function fixCSSVisibility() {
        const monthView = document.getElementById('monthView');
        if (monthView) {
            const computedStyle = window.getComputedStyle(monthView);
            if (computedStyle.display === 'none') {
                monthView.style.display = 'block';
                fixes.push('✅ Fixed CSS visibility (forced display: block)');
                return true;
            } else {
                fixes.push('ℹ️ CSS visibility is correct');
                return false;
            }
        }
        return false;
    }
    
    // Fix 5: Ensure proper event listeners
    function fixEventListeners() {
        if (typeof calendar !== 'undefined' && calendar !== null) {
            try {
                // Re-setup event listeners
                calendar.setupEventListeners();
                fixes.push('✅ Re-setup event listeners');
                return true;
            } catch (error) {
                console.error('Error fixing event listeners:', error);
                fixes.push('❌ Failed to fix event listeners: ' + error.message);
                return false;
            }
        }
        return false;
    }
    
    // Fix 6: Check for missing DOM elements
    function fixMissingElements() {
        const requiredElements = [
            'monthGrid', 'weekGrid', 'dayGrid', 'agendaList', 'yearGrid',
            'currentDate', 'prevBtn', 'nextBtn'
        ];
        
        let missing = 0;
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Missing required element: ${id}`);
                missing++;
            }
        });
        
        if (missing === 0) {
            fixes.push('✅ All required DOM elements present');
            return true;
        } else {
            fixes.push(`❌ ${missing} required DOM elements missing`);
            return false;
        }
    }
    
    // Fix 7: Create a minimal working calendar if needed
    function createMinimalCalendar() {
        const monthGrid = document.getElementById('monthGrid');
        if (monthGrid && monthGrid.children.length === 0) {
            // Create a basic calendar structure
            const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayHeaders.forEach(day => {
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.textContent = day;
                monthGrid.appendChild(dayHeader);
            });
            
            // Add some basic day cells
            for (let i = 1; i <= 35; i++) {
                const dayCell = document.createElement('div');
                dayCell.className = 'day-cell';
                dayCell.innerHTML = '<div class="day-number">' + i + '</div>';
                monthGrid.appendChild(dayCell);
            }
            
            fixes.push('✅ Created minimal calendar structure');
            return true;
        }
        return false;
    }
    
    // Run all fixes
    console.log('Running calendar fixes...');
    
    fixCalendarViews();
    fixActiveView();
    fixMissingElements();
    fixCSSVisibility();
    forceCalendarRender();
    fixEventListeners();
    createMinimalCalendar();
    
    // Display results
    console.log('🔧 Fix Results:');
    fixes.forEach(fix => console.log(fix));
    
    // Update page with results
    const resultsDiv = document.getElementById('fix-results') || document.createElement('div');
    resultsDiv.id = 'fix-results';
    resultsDiv.innerHTML = '<h3>Fix Results:</h3>' + fixes.map(fix => `<div>${fix}</div>`).join('');
    
    if (!document.getElementById('fix-results')) {
        document.body.appendChild(resultsDiv);
    }
    
    return fixes;
}

// Auto-run fixes when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixCalendarIssues);
} else {
    fixCalendarIssues();
}

// Export for manual use
window.fixCalendarIssues = fixCalendarIssues;

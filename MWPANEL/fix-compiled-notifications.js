const fs = require('fs');

// Read the compiled controller
const filePath = './dist/modules/students/students.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing compiled student notifications...');

// Replace the demoNotifications array with an empty array
const demoNotificationsPattern = /const demoNotifications = \[\s*{[^}]+id: 'demo_task_deadline_1'[^}]+}[^}]+{[^}]+id: 'demo_low_grade_1'[^}]+}[^}]+{[^}]+id: 'demo_exam_reminder_1'[^}]+}[^}]+{[^}]+id: 'demo_message_1'[^}]+}[^}]*\]/gs;

// Find if the pattern exists
const match = content.match(demoNotificationsPattern);
if (match) {
    console.log('✅ Found demoNotifications array, replacing with empty array...');
    console.log('📋 Original length:', match[0].length, 'characters');
    
    // Replace with empty array
    content = content.replace(demoNotificationsPattern, 'const demoNotifications = []');
    
    // Write back the fixed content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully replaced demo notifications with empty array');
    console.log('🔄 Backend needs to be restarted to apply changes');
} else {
    console.log('❌ Demo notifications pattern not found in compiled code');
    console.log('📝 Searching for simpler pattern...');
    
    // Try a simpler search
    if (content.includes('demo_task_deadline_1')) {
        console.log('✅ Found demo notification IDs, attempting manual replacement...');
        
        // Replace any line that creates demo notifications with empty array
        content = content.replace(/const demoNotifications = \[[\s\S]*?\];/g, 'const demoNotifications = [];');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Applied manual fix for demo notifications');
    } else {
        console.log('❌ No demo notification references found');
    }
}

console.log('🏁 Fix process completed');
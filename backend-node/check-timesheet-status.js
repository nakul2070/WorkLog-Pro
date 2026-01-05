/**
 * Check Timesheet Status
 * 
 * Usage: node check-timesheet-status.js
 * 
 * This script shows the status of timesheets for all users
 */

require('dotenv').config();
const db = require('./config/database');

async function checkTimesheetStatus() {
  console.log('\n🔍 Checking Timesheet Status...\n');
  
  try {
    await db.initializeDatabase();
    
    const timesheets = await db.executeQuery(`
      SELECT 
        t.id,
        t.timesheet_code as code,
        u.name as userName,
        u.email,
        t.year,
        t.month,
        t.status,
        t.total_hours as hours,
        t.submitted_at as submittedAt,
        t.created_at as createdAt
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.year DESC, t.month DESC, u.name
    `);
    
    console.log('📊 All Timesheets:\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    timesheets.forEach(ts => {
      const monthName = new Date(ts.year, ts.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const statusIcon = ts.status === 'draft' ? '📝' : 
                         ts.status === 'submitted' ? '📤' : 
                         ts.status === 'approved' ? '✅' : 
                         ts.status === 'rejected' ? '❌' : '❓';
      
      console.log(`${statusIcon} ${ts.code} - ${ts.userName}`);
      console.log(`   Email: ${ts.email}`);
      console.log(`   Month: ${monthName}`);
      console.log(`   Status: ${ts.status.toUpperCase()}`);
      console.log(`   Hours: ${ts.hours || 0}h`);
      if (ts.submittedAt) {
        console.log(`   Submitted: ${new Date(ts.submittedAt).toLocaleString()}`);
      }
      console.log('───────────────────────────────────────────────────────────────────');
    });
    
    console.log('\n💡 Status Legend:');
    console.log('   📝 draft      - Can be submitted');
    console.log('   📤 submitted  - Waiting for approval (can\'t submit again)');
    console.log('   ✅ approved   - Already approved (can\'t submit again)');
    console.log('   ❌ rejected   - Rejected (can\'t submit again)\n');
    
    const submittedCount = timesheets.filter(t => t.status !== 'draft').length;
    if (submittedCount > 0) {
      console.log('⚠️  Note: To test email notifications again, you need to:');
      console.log('   1. Reset the timesheet status back to "draft", OR');
      console.log('   2. Create a timesheet for a different month\n');
      console.log('   Run: node reset-timesheet-to-draft.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkTimesheetStatus();


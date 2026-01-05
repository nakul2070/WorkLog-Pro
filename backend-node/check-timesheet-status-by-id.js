/**
 * Check Timesheet Status by ID
 * 
 * This script checks the status of a specific timesheet.
 * Usage: node check-timesheet-status-by-id.js <timesheet-id>
 */

require('dotenv').config();
const db = require('./config/database');

async function checkTimesheetStatusById(timesheetId) {
  console.log('\n🔍 Checking Timesheet Status\n');
  
  if (!timesheetId) {
    console.error('❌ Error: Please provide a timesheet ID');
    console.log('Usage: node check-timesheet-status-by-id.js <timesheet-id>');
    process.exit(1);
  }
  
  try {
    await db.initializeDatabase();
    
    const [timesheet] = await db.executeQuery(`
      SELECT 
        t.id,
        t.timesheet_code,
        t.user_id,
        u.name as user_name,
        u.email,
        t.year,
        t.month,
        t.status,
        t.submitted_at,
        t.created_at,
        t.updated_at
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [timesheetId]);
    
    if (!timesheet) {
      console.log(`❌ Timesheet with ID "${timesheetId}" not found.\n`);
      process.exit(0);
      return;
    }
    
    const monthName = new Date(timesheet.year, timesheet.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    console.log('📋 Timesheet Details:');
    console.log(`   ID: ${timesheet.id}`);
    console.log(`   Code: ${timesheet.timesheet_code}`);
    console.log(`   User: ${timesheet.user_name} (${timesheet.email})`);
    console.log(`   Period: ${monthName}`);
    console.log(`   Status (raw): "${timesheet.status}" (type: ${typeof timesheet.status})`);
    console.log(`   Status (normalized): "${(timesheet.status || '').trim().toLowerCase() || 'NULL/EMPTY'}"`);
    console.log(`   Submitted At: ${timesheet.submitted_at || 'Not submitted'}`);
    console.log(`   Created At: ${timesheet.created_at}`);
    console.log(`   Updated At: ${timesheet.updated_at}`);
    console.log('');
    
    const normalizedStatus = (timesheet.status || '').trim().toLowerCase() || 'draft';
    
    if (normalizedStatus === 'draft') {
      console.log('✅ Status: DRAFT - Timesheet can be submitted');
    } else {
      console.log(`⚠️  Status: ${normalizedStatus.toUpperCase()} - Timesheet cannot be submitted`);
      console.log('');
      console.log('💡 To reset this timesheet to draft status, run:');
      console.log(`   node reset-timesheet-to-draft.js`);
      console.log('   (Then select this timesheet from the list)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get timesheet ID from command line arguments
const timesheetId = process.argv[2];
checkTimesheetStatusById(timesheetId);




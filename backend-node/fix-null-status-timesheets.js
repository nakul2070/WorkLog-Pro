/**
 * Fix NULL Status Timesheets
 * 
 * This script updates all timesheets with NULL status to 'draft' status.
 * Run this once to fix existing data:
 *   node fix-null-status-timesheets.js
 */

require('dotenv').config();
const db = require('./config/database');

async function fixNullStatusTimesheets() {
  console.log('\n🔧 Fixing NULL Status Timesheets\n');
  
  try {
    await db.initializeDatabase();
    
    // Find all timesheets with NULL status
    const nullStatusTimesheets = await db.executeQuery(`
      SELECT 
        t.id,
        t.timesheet_code as code,
        u.name as userName,
        u.email,
        t.year,
        t.month,
        t.status
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE t.status IS NULL
      ORDER BY t.year DESC, t.month DESC
    `);
    
    if (nullStatusTimesheets.length === 0) {
      console.log('✅ No timesheets with NULL status found. All timesheets have a valid status.\n');
      process.exit(0);
      return;
    }
    
    console.log(`📋 Found ${nullStatusTimesheets.length} timesheet(s) with NULL status:\n`);
    nullStatusTimesheets.forEach((ts, index) => {
      const monthName = new Date(ts.year, ts.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      console.log(`${index + 1}. ${ts.code} - ${ts.userName} (${ts.email})`);
      console.log(`   Month: ${monthName}`);
      console.log('');
    });
    
    // Update all NULL status timesheets to 'draft'
    const updateResult = await db.executeQuery(`
      UPDATE timesheets 
      SET status = 'draft'
      WHERE status IS NULL
    `);
    
    console.log(`✅ Updated ${nullStatusTimesheets.length} timesheet(s) to 'draft' status.\n`);
    console.log('📧 You can now submit these timesheets!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixNullStatusTimesheets();


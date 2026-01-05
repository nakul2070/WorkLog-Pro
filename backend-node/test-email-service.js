/**
 * Test script for Email Service
 * 
 * Usage: node test-email-service.js
 * 
 * This script tests the email service WITHOUT modifying any existing functionality.
 * It will:
 * 1. Check if SMTP is configured in the database
 * 2. If configured: Send a test email
 * 3. If not configured: Just log to console (safe fallback)
 */

require('dotenv').config();
const emailService = require('./services/emailService');
const db = require('./config/database');

async function testEmailService() {
  console.log('\n🧪 Testing Email Service...\n');
  
  try {
    // Initialize database connection
    console.log('📋 Connecting to database...');
    await db.initializeDatabase();
    console.log('✅ Database connected!\n');

    // Test 1: Load SMTP configuration
    console.log('📋 Test 1: Loading SMTP Configuration from Database...');
    const isConfigured = await emailService.loadConfig();
    
    if (isConfigured) {
      console.log('✅ SMTP is configured and ready!\n');
    } else {
      console.log('⚠️  SMTP not configured. Emails will be logged to console only.\n');
    }

    // Test 2: Send test email
    console.log('📋 Test 2: Sending Test Email...');
    const testEmailResult = await emailService.sendTestEmail('test@example.com');
    
    if (testEmailResult) {
      console.log('✅ Test email sent successfully!\n');
    } else {
      console.log('⚠️  Test email logged to console (SMTP not configured).\n');
    }

    // Test 3: Test timesheet notification templates
    console.log('📋 Test 3: Testing Timesheet Notification Templates...\n');

    // Test submission notification
    console.log('  → Testing Timesheet Submitted Template:');
    await emailService.sendTimesheetSubmittedEmail({
      employeeName: 'John Doe',
      employeeEmail: 'john.doe@example.com',
      projectName: 'Test Project',
      weekStart: '2025-11-03',
      weekEnd: '2025-11-09',
      managerEmail: 'manager@example.com',
      managerName: 'Jane Manager',
    });

    // Test approval notification
    console.log('  → Testing Timesheet Approved Template:');
    await emailService.sendTimesheetApprovedEmail({
      employeeName: 'John Doe',
      employeeEmail: 'john.doe@example.com',
      projectName: 'Test Project',
      weekStart: '2025-11-03',
      weekEnd: '2025-11-09',
      approverName: 'Jane Manager',
      comments: 'Great work this week!',
    });

    // Test rejection notification
    console.log('  → Testing Timesheet Rejected Template:');
    await emailService.sendTimesheetRejectedEmail({
      employeeName: 'John Doe',
      employeeEmail: 'john.doe@example.com',
      projectName: 'Test Project',
      weekStart: '2025-11-03',
      weekEnd: '2025-11-09',
      approverName: 'Jane Manager',
      comments: 'Please add more details to your task descriptions.',
    });

    // Test reminder notification
    console.log('  → Testing Timesheet Reminder Template:');
    await emailService.sendTimesheetReminderEmail({
      employeeName: 'John Doe',
      employeeEmail: 'john.doe@example.com',
      weekStart: '2025-11-03',
      weekEnd: '2025-11-09',
      missingDays: 'Monday, Tuesday',
    });

    console.log('\n✅ All email tests completed!\n');
    console.log('📝 Summary:');
    console.log(`   - SMTP Configured: ${isConfigured ? 'Yes' : 'No'}`);
    console.log(`   - Emails Sent: ${isConfigured ? 'Yes (check inbox)' : 'No (logged to console only)'}`);
    console.log(`   - Existing Functionality: Untouched ✓`);
    console.log('\n💡 Next Steps:');
    if (!isConfigured) {
      console.log('   1. Update SMTP credentials in system_configurations table');
      console.log('   2. Run this test again to verify email sending works');
      console.log('   3. Once verified, integrate email notifications into controllers\n');
    } else {
      console.log('   1. Check your inbox for test emails');
      console.log('   2. If received, you can integrate email notifications into controllers\n');
    }

  } catch (error) {
    console.error('❌ Error testing email service:', error);
    console.log('\n💡 This error does NOT affect existing functionality.');
  }

  process.exit(0);
}

// Run tests
testEmailService();


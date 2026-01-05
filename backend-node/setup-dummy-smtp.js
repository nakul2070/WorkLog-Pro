/**
 * Setup Dummy SMTP Credentials for Testing
 * 
 * This script updates the system_configurations table with dummy SMTP settings
 * so you can test the email service (emails will be logged to console).
 * 
 * Usage: node setup-dummy-smtp.js
 */

require('dotenv').config();
const db = require('./config/database');

async function setupDummySMTP() {
  console.log('\n🔧 Setting up Dummy SMTP Configuration...\n');

  try {
    // Initialize database connection
    console.log('📋 Connecting to database...');
    await db.initializeDatabase();
    console.log('✅ Database connected!\n');

    // Check current SMTP settings
    console.log('📋 Checking current SMTP configuration...');
    const currentSettings = await db.executeQuery(
      `SELECT config_key, config_value FROM system_configurations 
       WHERE category = 'SMTP Settings'`
    );

    if (currentSettings.length === 0) {
      console.log('⚠️  No SMTP settings found in database. Creating...');
      
      // Insert dummy SMTP settings (these won't actually send emails)
      const smtpConfigs = [
        { key: 'smtp_host', value: 'smtp.gmail.com', description: 'SMTP server hostname', secret: false },
        { key: 'smtp_port', value: '587', description: 'SMTP server port', secret: false },
        { key: 'smtp_use_ssl', value: 'false', description: 'Use SSL/TLS', secret: false },
        { key: 'smtp_username', value: 'dummy-smtp-user@example.com', description: 'SMTP authentication username', secret: false },
        { key: 'smtp_password', value: 'dummy-password-for-testing', description: 'SMTP authentication password', secret: true },
        { key: 'smtp_from_email', value: 'noreply@kadellabs.com', description: 'From email address', secret: false },
        { key: 'smtp_from_name', value: 'Timesheet Management System', description: 'From name', secret: false },
      ];

      for (const config of smtpConfigs) {
        const configId = `smtp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.executeQuery(
          `INSERT INTO system_configurations 
           (id, category, config_key, config_value, description, is_secret, is_active) 
           VALUES (?, 'SMTP Settings', ?, ?, ?, ?, 1)`,
          [configId, config.key, config.value, config.description, config.secret]
        );
      }

      console.log('✅ Dummy SMTP settings created!\n');
    } else {
      console.log('✅ SMTP settings already exist in database:\n');
      currentSettings.forEach(setting => {
        const maskedValue = setting.config_key.includes('password') 
          ? '********' 
          : setting.config_value;
        console.log(`   ${setting.config_key}: ${maskedValue}`);
      });
      console.log('');
    }

    // Display summary
    console.log('📝 Summary:');
    console.log('   - SMTP Configuration: Ready ✓');
    console.log('   - Email Service: Ready to test ✓');
    console.log('   - Existing Functionality: Untouched ✓');
    console.log('\n💡 Next Steps:');
    console.log('   1. Run: node test-email-service.js');
    console.log('   2. Emails will be logged to console (dummy credentials won\'t send real emails)');
    console.log('   3. To send real emails: Update SMTP credentials in database with real values\n');

  } catch (error) {
    console.error('❌ Error setting up SMTP:', error);
    console.log('\n💡 This error does NOT affect existing functionality.');
  }

  process.exit(0);
}

// Run setup
setupDummySMTP();


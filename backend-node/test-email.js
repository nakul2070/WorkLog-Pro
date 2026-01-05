/**
 * Test Email Script
 * Run this to test if your SMTP configuration is working
 * 
 * Usage: node test-email.js your-email@example.com
 */

require('dotenv').config();
const { sendTestEmail } = require('./services/emailService');

async function testEmail() {
  const testEmailAddress = process.argv[2];
  
  if (!testEmailAddress) {
    console.error('❌ Please provide an email address to test');
    console.log('Usage: node test-email.js your-email@example.com');
    process.exit(1);
  }
  
  console.log('📧 Testing email configuration...');
  console.log(`📧 Sending test email to: ${testEmailAddress}`);
  console.log('');
  
  const result = await sendTestEmail(testEmailAddress);
  
  if (result) {
    console.log('');
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Please check your inbox at: ${testEmailAddress}`);
    console.log('   (Also check spam/junk folder)');
  } else {
    console.log('');
    console.log('❌ Test email failed to send');
    console.log('');
    console.log('Please check:');
    console.log('1. SMTP configuration in .env file');
    console.log('2. SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD are set correctly');
    console.log('3. Your email provider allows SMTP access');
    console.log('4. For Gmail: You may need to use an "App Password" instead of your regular password');
  }
  
  process.exit(result ? 0 : 1);
}

testEmail().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});


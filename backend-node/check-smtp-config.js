const db = require('./config/database');

async function checkSMTPConfig() {
  try {
    await db.initializeDatabase();
    
    const configs = await db.executeQuery(
      `SELECT config_key, config_value, is_secret 
       FROM system_configurations 
       WHERE category = 'SMTP Settings' 
       ORDER BY config_key`
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('📧 SMTP Configuration Status');
    console.log('='.repeat(60) + '\n');
    
    if (configs.length === 0) {
      console.log('❌ No SMTP configuration found in database\n');
      process.exit(1);
    }
    
    console.log('Found SMTP settings:\n');
    configs.forEach(c => {
      const value = c.is_secret ? '***hidden***' : c.config_value;
      const status = c.config_value.includes('your-') || c.config_value.includes('-here') ? '⚠️  NEEDS UPDATE' : '✅ SET';
      console.log(`  ${c.config_key.padEnd(25)}: ${value.padEnd(40)} ${status}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    await db.closePool();
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSMTPConfig();


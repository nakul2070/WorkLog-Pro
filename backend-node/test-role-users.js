const db = require('./config/database');
const dotenv = require('dotenv');

dotenv.config();

async function testRoleUsers() {
  try {
    console.log('\n🧪 Testing Role-Based User System\n');
    console.log('='.repeat(60));
    
    await db.initializeDatabase();
    
    const users = await db.executeQuery(`
      SELECT name, email, is_admin, is_project_manager, is_active
      FROM users 
      WHERE is_active = 1
      ORDER BY is_admin DESC, is_project_manager DESC
    `);
    
    console.log('\n📋 Active Users by Role:\n');
    
    users.forEach(u => {
      let role = 'Employee';
      if (u.is_admin && u.is_project_manager) {
        role = 'Admin + PM';
      } else if (u.is_admin) {
        role = 'Admin';
      } else if (u.is_project_manager) {
        role = 'Project Manager';
      }
      
      console.log(`  ${role.padEnd(20)} | ${u.name.padEnd(25)} | ${u.email}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Database query successful!');
    console.log(`\n📊 Total users: ${users.length}`);
    
    await db.closePool();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testRoleUsers();


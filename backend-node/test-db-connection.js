/**
 * Database Connection Test Script
 * Tests the MySQL database connection using the credentials from .env
 */

const db = require('./config/database');

async function testDatabaseConnection() {
  console.log('===========================================');
  console.log('🔧 Database Connection Test');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    console.log('1️⃣ Initializing database connection pool...');
    const initialized = await db.initializeDatabase();
    
    if (!initialized) {
      console.error('\n❌ Failed to initialize database connection');
      process.exit(1);
    }

    console.log('\n2️⃣ Testing basic query...');
    const connection = await db.getConnection();
    
    // Test basic query
    const [testResult] = await connection.query('SELECT 1 + 1 as result');
    console.log('✅ Basic query test passed:', testResult);

    // Get database information
    const [dbInfo] = await connection.query(`
      SELECT 
        DATABASE() as current_database,
        VERSION() as mysql_version,
        NOW() as server_time
    `);
    console.log('\n📊 Database Information:');
    console.log('   • Database:', dbInfo[0].current_database);
    console.log('   • MySQL Version:', dbInfo[0].mysql_version);
    console.log('   • Server Time:', dbInfo[0].server_time);

    // List all tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Available Tables:', tables.length);
    if (tables.length > 0) {
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
    } else {
      console.log('   ⚠️  No tables found in database (database is empty)');
    }

    connection.release();

    console.log('\n===========================================');
    console.log('✅ Database Connection Test: PASSED');
    console.log('===========================================\n');

    // Close pool
    await db.closePool();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database Connection Test: FAILED');
    console.error('Error Details:', error.message);
    console.error('\nFull Error:', error);
    
    // Close pool if it exists
    try {
      await db.closePool();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();

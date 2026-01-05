/**
 * Database Seed Data Runner
 * Populates database with sample data for development and testing
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runSeedData() {
  console.log('===========================================');
  console.log('🌱 Database Seed Started');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Read the seed data file
    const seedPath = path.join(__dirname, '..', 'database', 'migrations', '002_seed_data.sql');
    console.log('📄 Reading seed data file:', seedPath);
    
    let sqlContent = fs.readFileSync(seedPath, 'utf8');
    
    // Remove all comment-only lines and USE statement
    const lines = sqlContent.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return false;
      if (trimmed.startsWith('--')) return false;
      if (trimmed.match(/USE\s+\w+/i)) return false;
      return true;
    });
    
    sqlContent = cleanedLines.join('\n');
    
    // Split by semicolon
    const allStatements = sqlContent.split(';');
    
    // Filter valid INSERT and SELECT statements
    const statements = allStatements
      .map(stmt => stmt.trim())
      .filter(stmt => {
        if (stmt.length === 0) return false;
        if (stmt.match(/INSERT INTO/i)) return true;
        if (stmt.match(/SELECT.*UNION ALL/i)) return true; // Verification query
        return false;
      });

    console.log(`📊 Found ${statements.length} statements to execute\n`);

    let successCount = 0;
    let failureCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract table name from INSERT statement
      const tableMatch = statement.match(/INSERT INTO\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : 'Verification';

      try {
        const result = await connection.query(statement);
        
        if (tableName === 'Verification') {
          // This is the verification SELECT query
          console.log(`\n✅ Data verification query executed`);
        } else {
          const affectedRows = result[0].affectedRows || 0;
          console.log(`✅ ${i + 1}. Inserted data into: ${tableName} (${affectedRows} rows)`);
        }
        successCount++;
      } catch (error) {
        console.error(`❌ ${i + 1}. Failed to insert into ${tableName}:`, error.message);
        failureCount++;
      }
    }

    console.log('\n===========================================');
    console.log('📊 Seed Summary');
    console.log('===========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total: ${statements.length}`);

    // Count records in each table
    console.log('\n===========================================');
    console.log('🔍 Verifying Seeded Data');
    console.log('===========================================\n');

    const tables = [
      'users', 'clients', 'projects', 'project_team_members',
      'timesheets', 'timesheet_entries', 'approvals', 'holidays',
      'leaves', 'system_configurations', 'sync_logs', 'audit_logs',
      'project_access_requests'
    ];

    for (const table of tables) {
      const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result[0].count;
      console.log(`   ${table.padEnd(25)} : ${count} records`);
    }

    connection.release();
    await db.closePool();

    console.log('\n===========================================');
    if (failureCount === 0) {
      console.log('✅ Database Seeding Completed Successfully!');
    } else {
      console.log('⚠️  Seeding Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Seeding Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the seed
runSeedData();

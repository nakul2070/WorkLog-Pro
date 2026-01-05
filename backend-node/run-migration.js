/**
 * Database Migration Runner
 * Executes SQL migration files to create database schema
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration() {
  console.log('===========================================');
  console.log('🚀 Database Migration Started');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_create_schema.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    let sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove all comment-only lines
    const lines = sqlContent.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      // Keep the line if it's not a comment-only line
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });
    
    sqlContent = cleanedLines.join('\n');
    
    // Split by semicolon
    const allStatements = sqlContent.split(';');
    
    // Filter valid CREATE TABLE statements
    const statements = allStatements
      .map(stmt => stmt.trim())
      .filter(stmt => {
        if (stmt.length === 0) return false;
        // Only keep CREATE TABLE statements
        if (stmt.match(/CREATE TABLE/i)) return true;
        return false;
      });

    console.log(`📊 Found ${statements.length} CREATE TABLE statements to execute\n`);

    let successCount = 0;
    let failureCount = 0;
    const createdTables = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract table name from CREATE TABLE statement
      const tableMatch = statement.match(/CREATE TABLE\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : `Unknown`;

      try {
        await connection.query(statement);
        console.log(`✅ ${i + 1}. Created table: ${tableName}`);
        createdTables.push(tableName);
        successCount++;
      } catch (error) {
        console.error(`❌ ${i + 1}. Failed to create ${tableName}:`, error.message);
        failureCount++;
      }
    }

    console.log('\n===========================================');
    console.log('📊 Migration Summary');
    console.log('===========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total: ${statements.length}`);

    // Verify tables were created
    console.log('\n===========================================');
    console.log('🔍 Verifying Created Tables');
    console.log('===========================================\n');

    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Total tables in database: ${tables.length}`);
    
    if (tables.length > 0) {
      console.log('\n📋 Tables created:\n');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
    }

    connection.release();
    await db.closePool();

    console.log('\n===========================================');
    if (failureCount === 0 && successCount === 13) {
      console.log('✅ Migration Completed Successfully!');
      console.log('✅ All 13 tables created');
    } else if (failureCount === 0) {
      console.log('✅ Migration Completed Successfully!');
    } else {
      console.log('⚠️  Migration Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the migration
runMigration();

/**
 * Database Migration Runner for Migration 011
 * Drops notifications table
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration011() {
  console.log('===========================================');
  console.log('🚀 Database Migration 011 Started');
  console.log('Dropping notifications table');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '011_drop_notifications_table.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    let sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comment lines (lines that start with --)
    const lines = sqlContent.split('\n');
    const cleanedLines = lines
      .map(line => {
        // Remove inline comments (-- at start of line or after whitespace)
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          // Check if -- is at start or after whitespace (not part of a string)
          const beforeComment = line.substring(0, commentIndex).trim();
          if (beforeComment.length === 0) {
            return ''; // Full line comment, remove it
          }
          // Keep the line but remove the comment part
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .filter(line => line.length > 0);
    
    const cleanedSql = cleanedLines.join('\n');
    
    // Split by semicolon to get individual statements
    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📊 Found ${statements.length} statement(s) to execute\n`);

    let successCount = 0;
    let failureCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract table name from DROP TABLE statement
      const tableMatch = statement.match(/DROP TABLE\s+(?:IF EXISTS\s+)?(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : `Statement ${i + 1}`;

      try {
        await connection.query(statement);
        console.log(`✅ ${i + 1}. Executed: ${tableName}`);
        successCount++;
      } catch (error) {
        // Check if table doesn't exist (which is fine with IF EXISTS)
        if (error.code === 'ER_BAD_TABLE_ERROR' || error.message.includes("doesn't exist")) {
          console.log(`⚠️  ${i + 1}. Table ${tableName} doesn't exist, skipping...`);
          successCount++;
        } else {
          console.error(`❌ ${i + 1}. Failed to execute ${tableName}:`, error.message);
          failureCount++;
        }
      }
    }

    console.log('\n===========================================');
    console.log('📊 Migration Summary');
    console.log('===========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total: ${statements.length}`);

    // Verify table was dropped
    console.log('\n===========================================');
    console.log('🔍 Verifying Table Removal');
    console.log('===========================================\n');

    try {
      const [tables] = await connection.query("SHOW TABLES LIKE 'notifications'");
      if (tables.length === 0) {
        console.log('✅ Table notifications has been successfully dropped');
      } else {
        console.log('⚠️  Table notifications still exists');
      }
    } catch (error) {
      console.error('❌ Error verifying table:', error.message);
    }

    connection.release();
    await db.closePool();

    console.log('\n===========================================');
    if (failureCount === 0) {
      console.log('✅ Migration 011 Completed Successfully!');
    } else {
      console.log('⚠️  Migration 011 Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration 011 Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the migration
runMigration011();


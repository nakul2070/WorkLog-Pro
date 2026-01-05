/**
 * Database Migration Runner for Migration 007
 * Fixes existing half-day leave entries to have correct flags and create missing leave entries
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration007() {
  console.log('===========================================');
  console.log('🚀 Database Migration 007 Started');
  console.log('Fixing existing half-day leave entries');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '007_fix_halfday_entries.sql');
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
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let failureCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        const result = await connection.query(statement + ';');
        const affectedRows = result[0]?.affectedRows || result?.affectedRows || 0;
        console.log(`✅ ${i + 1}. Executed statement ${i + 1}/${statements.length} (${affectedRows} rows affected)`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${i + 1}. Failed to execute statement ${i + 1}/${statements.length}:`, error.message);
        failureCount++;
      }
    }

    console.log('\n===========================================');
    console.log('📊 Migration Summary');
    console.log('===========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total: ${statements.length}`);

    connection.release();
    await db.closePool();

    console.log('\n===========================================');
    if (failureCount === 0) {
      console.log('✅ Migration 007 Completed Successfully!');
    } else {
      console.log('⚠️  Migration 007 Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration 007 Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the migration
runMigration007();


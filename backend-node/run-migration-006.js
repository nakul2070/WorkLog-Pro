/**
 * Database Migration Runner for Migration 006
 * Adds is_halfday column to timesheet_entries table
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration006() {
  console.log('===========================================');
  console.log('🚀 Database Migration 006 Started');
  console.log('Adding is_halfday column to timesheet_entries');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '006_add_is_halfday_column.sql');
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
        await connection.query(statement + ';');
        console.log(`✅ ${i + 1}. Executed statement ${i + 1}/${statements.length}`);
        successCount++;
      } catch (error) {
        // Check if error is because column/index already exists
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('Duplicate key name') ||
            error.message.includes('already exists')) {
          console.log(`⚠️  ${i + 1}. Statement ${i + 1}/${statements.length} - Column/Index already exists, skipping`);
          successCount++;
        } else {
          console.error(`❌ ${i + 1}. Failed to execute statement ${i + 1}/${statements.length}:`, error.message);
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

    // Verify column was added
    console.log('\n===========================================');
    console.log('🔍 Verifying is_halfday Column');
    console.log('===========================================\n');

    try {
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
         FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'timesheet_entries' 
           AND COLUMN_NAME = 'is_halfday'`
      );
      
      if (columns && columns.length > 0) {
        console.log('✅ is_halfday column exists:');
        console.log(`   - Type: ${columns[0].DATA_TYPE}`);
        console.log(`   - Default: ${columns[0].COLUMN_DEFAULT}`);
        console.log(`   - Comment: ${columns[0].COLUMN_COMMENT || 'N/A'}`);
      } else {
        console.warn('⚠️  is_halfday column not found after migration');
      }
    } catch (checkError) {
      console.warn('⚠️  Could not verify column:', checkError.message);
    }

    connection.release();
    await db.closePool();

    console.log('\n===========================================');
    if (failureCount === 0) {
      console.log('✅ Migration 006 Completed Successfully!');
    } else {
      console.log('⚠️  Migration 006 Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration 006 Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the migration
runMigration006();


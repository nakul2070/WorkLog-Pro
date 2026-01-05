/**
 * Database Migration Runner for Migration 005
 * Adds leave_type column to timesheet_entries table
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration005() {
  console.log('===========================================');
  console.log('🚀 Database Migration 005 Started');
  console.log('Adding leave_type column to timesheet_entries');
  console.log('===========================================\n');

  try {
    // Initialize database connection
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '005_add_leave_type_column.sql');
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
          // Keep the line but remove the comment part (for now, keep it simple)
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .filter(line => line.length > 0);
    
    const cleanedSql = cleanedLines.join('\n');
    
    // Split by semicolon to get individual statements
    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim().replace(/\s+/g, ' ')) // Normalize whitespace
      .filter(stmt => {
        const trimmed = stmt.trim();
        // Keep non-empty statements that contain actual SQL keywords
        return trimmed.length > 0 && 
               (trimmed.toUpperCase().includes('ALTER') || 
                trimmed.toUpperCase().includes('CREATE') || 
                trimmed.toUpperCase().includes('UPDATE') ||
                trimmed.toUpperCase().includes('INSERT') ||
                trimmed.toUpperCase().includes('DELETE'));
      });

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let failureCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement || statement.trim().length === 0) {
        continue;
      }

      try {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        // Log first 100 chars of statement for debugging
        const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
        console.log(`   ${preview}${statement.length > 100 ? '...' : ''}`);
        
        await connection.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
        successCount++;
      } catch (error) {
        // Check if column already exists (for idempotency)
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (column/index already exists)\n`);
          successCount++;
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          console.error(`   SQL: ${statement.substring(0, 200)}...\n`);
          failureCount++;
        }
      }
    }

    // Verify the column was added
    console.log('\n===========================================');
    console.log('🔍 Verifying Migration');
    console.log('===========================================\n');

    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'timesheet_entries'
        AND COLUMN_NAME = 'leave_type'
      `);

      if (columns.length > 0) {
        console.log('✅ leave_type column exists:');
        console.log(`   Type: ${columns[0].DATA_TYPE}`);
        console.log(`   Nullable: ${columns[0].IS_NULLABLE}`);
        console.log(`   Default: ${columns[0].COLUMN_DEFAULT || 'NULL'}`);
        console.log(`   Comment: ${columns[0].COLUMN_COMMENT || 'N/A'}\n`);
      } else {
        console.log('⚠️  Warning: leave_type column not found after migration\n');
      }
    } catch (error) {
      console.error('⚠️  Could not verify column:', error.message);
    }

    connection.release();
    await db.closePool();

    console.log('===========================================');
    console.log('📊 Migration Summary');
    console.log('===========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total: ${statements.length}`);

    if (failureCount === 0) {
      console.log('\n✅ Migration 005 Completed Successfully!');
      console.log('✅ leave_type column added to timesheet_entries table');
    } else {
      console.log('\n⚠️  Migration Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration Failed:', error);
    console.error(error.stack);
    await db.closePool();
    process.exit(1);
  }
}

// Run the migration
runMigration005();

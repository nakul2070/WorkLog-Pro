/**
 * Database Migration Runner for Migration 009
 * Fixes half-day leave to use single entry approach
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration009() {
  console.log('===========================================');
  console.log('🚀 Database Migration 009 Started');
  console.log('Fixing half-day leave to use single entry');
  console.log('===========================================\n');

  try {
    await db.initializeDatabase();
    const connection = await db.getConnection();

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '009_fix_halfday_single_entry.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    let sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    const lines = sqlContent.split('\n');
    const cleanedLines = lines
      .map(line => {
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          const beforeComment = line.substring(0, commentIndex).trim();
          if (beforeComment.length === 0) {
            return '';
          }
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .filter(line => line.length > 0);
    
    const cleanedSql = cleanedLines.join('\n');
    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        const result = await connection.query(statement + ';');
        const affectedRows = result[0]?.affectedRows || result?.affectedRows || 0;
        console.log(`✅ ${i + 1}. Executed statement ${i + 1}/${statements.length} (${affectedRows} rows affected)`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${i + 1}. Failed:`, error.message);
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
      console.log('✅ Migration 009 Completed Successfully!');
    } else {
      console.log('⚠️  Migration 009 Completed with Errors');
    }
    console.log('===========================================\n');

    process.exit(failureCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration 009 Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

runMigration009();

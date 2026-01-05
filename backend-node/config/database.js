const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'timesheet_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
let pool = null;

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('✅ MySQL connection pool created');
  }
  return pool;
};

// Get connection from pool
const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('❌ Error getting database connection:', error);
    throw error;
  }
};

// Execute query
const executeQuery = async (sql, params = []) => {
  try {
    // Ensure pool exists before executing query
    if (!pool) {
      console.warn('⚠️  Database pool not initialized, creating pool...');
      createPool();
      // Wait a moment for pool to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Test if pool is still valid
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (poolError) {
      // If pool is closed or invalid, recreate it
      if (poolError.message?.includes('closed') || poolError.message?.includes('Cannot add new command')) {
        console.warn('⚠️  Database pool appears closed, recreating pool...');
        pool = null; // Reset pool
        createPool();
        await new Promise(resolve => setTimeout(resolve, 100));
        // Retry the query
        const [results] = await pool.execute(sql, params);
        return results;
      }
      throw poolError;
    }
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection test successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Close all connections
const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('✅ Database connection pool closed');
    }
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    createPool();
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('📊 Database initialized successfully');
      console.log(`📍 Connected to: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
      return true;
    } else {
      console.error('❌ Failed to initialize database');
      return false;
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
};

module.exports = {
  createPool,
  getConnection,
  executeQuery,
  executeTransaction,
  testConnection,
  closePool,
  initializeDatabase,
  getPool: () => pool
};

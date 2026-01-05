const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
// --- NEW: Import the sync service ---
const { syncEmployeesFromOffice365 } = require('../services/office365Sync');


/**
 * Employee Controller
 * Manages employee data from MySQL database (synced from Office 365)
 */

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    console.log('投 Fetching employees from database...');
    
    const query = `
      SELECT 
        u.id,
        u.employee_id as employeeId,
        u.email,
        u.name,
        u.department,
        u.job_title as jobTitle,
        u.is_admin as isAdmin,
        u.is_project_manager as isProjectManager,
        u.is_active as isActive,
        u.office365_id as office365Id,
        u.office365_synced_at as office365SyncedAt,
        u.created_at as createdAt,
        manager.name as managerName,
        manager.employee_id as managerEmployeeId
      FROM users u
      LEFT JOIN users manager ON u.manager_id = manager.id
      WHERE u.is_active = TRUE
      ORDER BY u.name
    `;
    
    const employees = await db.executeQuery(query);
    
    res.json({
      success: true,
      source: 'MySQL Database (synced from Office 365)',
      count: employees.length,
      data: employees,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`投 Fetching employee: ${id}`);
    
    const query = `
      SELECT 
        u.id,
        u.employee_id as employeeId,
        u.email,
        u.name,
        u.department,
        u.job_title as jobTitle,
        u.is_admin as isAdmin,
        u.is_project_manager as isProjectManager,
        u.is_active as isActive,
        u.office365_id as office365Id,
        u.office365_synced_at as office365SyncedAt,
        u.created_at as createdAt,
        manager.name as managerName,
        manager.employee_id as managerEmployeeId
      FROM users u
      LEFT JOIN users manager ON u.manager_id = manager.id
      WHERE (u.id = ? OR u.employee_id = ?)
      LIMIT 1
    `;
    
    const employees = await db.executeQuery(query, [id, id]);
    
    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      data: employees[0]
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get current user (based on auth token)
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('投 Fetching current user...');
    
    // Get user ID from auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. User ID not found.'
      });
    }
    
    const query = `
      SELECT 
        u.id,
        u.employee_id as employeeId,
        u.email,
        u.name,
        u.department,
        u.job_title as jobTitle,
        u.is_admin as isAdmin,
        u.is_project_manager as isProjectManager,
        u.is_active as isActive,
        u.office365_id as office365Id,
        u.office365_synced_at as office365SyncedAt,
        u.created_at as createdAt,
        manager.name as managerName
      FROM users u
      LEFT JOIN users manager ON u.manager_id = manager.id
      WHERE u.id = ?
      LIMIT 1
    `;
    
    const [user] = await db.executeQuery(query, [userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update employee (admin status, PM status, etc.)
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`📝 Updating employee: ${id}`, updates);
    
    // Build the SET clause dynamically based on what's provided
    const allowedFields = ['is_admin', 'is_project_manager', 'is_active'];
    const setClause = [];
    const values = [];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });
    
    if (setClause.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    // Add the ID at the end for the WHERE clause
    values.push(id);
    
    const query = `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`;
    
    await db.executeQuery(query, values);
    
    // Fetch updated employee
    const [updatedEmployee] = await db.executeQuery(
      'SELECT id, employee_id, name, email, is_admin, is_project_manager, is_active FROM users WHERE id = ?',
      [id]
    );
    
    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// --- MODIFIED: This function now calls the real sync service ---
exports.syncEmployeesFromO365 = async (req, res) => {
  try {
    console.log('売 Employee sync from Office 365 requested via API...');
    
    // Call the service
    const result = await syncEmployeesFromOffice365();
    
    if (result.status === 'failed') {
        throw new Error(result.error_message || 'Sync failed.');
    }

    res.json({
      success: true,
      message: 'Employee sync completed successfully.',
      data: result
    });
  } catch (error) {
    console.error('Error in sync employees API call:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.result // Send partial log if available
    });
  }
};
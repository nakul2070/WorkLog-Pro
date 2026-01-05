const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { syncLeavesFromHROne: syncLeavesService } = require('../services/hroneSync');

/**
 * Leave Controller
 * Manages employee leaves from MySQL database (synced from HROne)
 */

// Get all leaves
exports.getAllLeaves = async (req, res) => {
  try {
    const { userId, status, startDate, endDate } = req.query;
    console.log('🏖️ Fetching leaves from database...');
    
    let query = `
      SELECT 
        l.id,
        l.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        l.leave_type as leaveType,
        l.start_date as startDate,
        l.end_date as endDate,
        l.total_days as totalDays,
        l.reason,
        l.status,
        l.applied_date as appliedDate,
        l.approved_by as approvedBy,
        l.hrone_id as hroneId,
        l.hrone_synced_at as hroneSyncedAt,
        l.created_at as createdAt
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      query += ' AND l.user_id = ?';
      params.push(userId);
    }
    
    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      query += ' AND l.start_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND l.end_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY l.start_date DESC';
    
    const leaves = await db.executeQuery(query, params);
    
    res.json({
      success: true,
      source: 'MySQL Database (synced from HROne)',
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get leave by ID
exports.getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        l.*,
        u.name as userName,
        u.employee_id as employeeId
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
      LIMIT 1
    `;
    
    const leaves = await db.executeQuery(query, [id]);
    
    if (leaves.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Leave not found'
      });
    }
    
    res.json({
      success: true,
      data: leaves[0]
    });
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get leaves for a user
exports.getUserLeaves = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT 
        l.id,
        l.leave_type as leaveType,
        l.start_date as startDate,
        l.end_date as endDate,
        l.total_days as totalDays,
        l.reason,
        l.status,
        l.applied_date as appliedDate,
        l.approved_by as approvedBy
      FROM leaves l
      WHERE l.user_id = ?
      ORDER BY l.start_date DESC
    `;
    
    const leaves = await db.executeQuery(query, [userId]);
    
    res.json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching user leaves:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Sync leaves from HROne
exports.syncLeavesFromHROne = async (req, res) => {
  try {
    console.log('🔄 Leave sync from HROne requested via API...');
    
    // Call the sync service
    const result = await syncLeavesService();
    
    if (result.status === 'failed') {
      throw new Error(result.error_message || 'Sync failed.');
    }

    res.json({
      success: true,
      message: 'Leave sync completed successfully.',
      data: result
    });
  } catch (error) {
    console.error('Error in sync leaves API call:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.result // Send partial log if available
    });
  }
};

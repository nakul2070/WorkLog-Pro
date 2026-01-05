const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { syncHolidaysFromHROne: syncHolidaysService } = require('../services/hroneSync');

/**
 * Holiday Controller
 * Manages holidays from MySQL database (synced from HROne)
 */

// Get all holidays
exports.getAllHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    console.log('📅 Fetching holidays from database...');
    
    let query = `
      SELECT 
        id,
        date,
        title,
        description,
        type,
        is_optional as isOptional,
        hrone_id as hroneId,
        hrone_synced_at as hroneSyncedAt,
        created_at as createdAt
      FROM holidays
      WHERE 1=1
    `;
    
    const params = [];
    
    if (year) {
      query += ' AND YEAR(date) = ?';
      params.push(year);
    }
    
    query += ' ORDER BY date';
    
    const holidays = await db.executeQuery(query, params);
    
    res.json({
      success: true,
      source: 'MySQL Database (synced from HROne)',
      count: holidays.length,
      data: holidays
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get holiday by ID
exports.getHolidayById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM holidays WHERE id = ? LIMIT 1';
    const holidays = await db.executeQuery(query, [id]);
    
    if (holidays.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      data: holidays[0]
    });
  } catch (error) {
    console.error('Error fetching holiday:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create holiday
exports.createHoliday = async (req, res) => {
  try {
    const { date, title, description, type, isOptional } = req.body;
    
    const holidayId = uuidv4();
    
    const query = `
      INSERT INTO holidays (
        id, date, title, description, type, is_optional
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await db.executeQuery(query, [
      holidayId, date, title, description, type || 'public', isOptional || false
    ]);
    
    // Fetch the created holiday
    const created = await db.executeQuery('SELECT * FROM holidays WHERE id = ?', [holidayId]);
    
    console.log('✅ Holiday created:', title);
    
    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: created[0]
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = ['date', 'title', 'description', 'type', 'is_optional'];
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        updateFields.push(`${snakeKey} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    updateValues.push(id);
    
    const query = `UPDATE holidays SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.executeQuery(query, updateValues);
    
    // Fetch updated holiday
    const updated = await db.executeQuery('SELECT * FROM holidays WHERE id = ?', [id]);
    
    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found'
      });
    }
    
    console.log('✅ Holiday updated:', updated[0].title);
    
    res.json({
      success: true,
      message: 'Holiday updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await db.executeQuery('SELECT * FROM holidays WHERE id = ?', [id]);
    
    if (holiday.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found'
      });
    }
    
    await db.executeQuery('DELETE FROM holidays WHERE id = ?', [id]);
    
    console.log('🗑️ Holiday deleted:', holiday[0].title);
    
    res.json({
      success: true,
      message: 'Holiday deleted successfully',
      data: holiday[0]
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Sync holidays from HROne
exports.syncHolidaysFromHROne = async (req, res) => {
  try {
    console.log('🔄 Holiday sync from HROne requested via API...');
    
    // Call the sync service
    const result = await syncHolidaysService();
    
    if (result.status === 'failed') {
      throw new Error(result.error_message || 'Sync failed.');
    }

    res.json({
      success: true,
      message: 'Holiday sync completed successfully.',
      data: result
    });
  } catch (error) {
    console.error('Error in sync holidays API call:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.result // Send partial log if available
    });
  }
};

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * Configuration Controller
 * Manages system configurations from MySQL database
 */

// Get all configurations (grouped by category)
exports.getAllConfigurations = async (req, res) => {
  try {
    console.log('⚙️ Fetching configurations from database...');
    
    const query = `
      SELECT 
        id,
        category,
        config_key as \`key\`,
        config_value as value,
        description,
        is_secret as isSecret,
        created_at as createdAt,
        updated_at as updatedAt
      FROM system_configurations
      ORDER BY category, config_key
    `;
    
    const configurations = await db.executeQuery(query);
    
    // Group by category
    const grouped = configurations.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      
      // Mask secret values
      if (config.isSecret) {
        config.value = '••••••••••••••••••••';
      }
      
      acc[config.category].push(config);
      return acc;
    }, {});
    
    res.json({
      success: true,
      source: 'MySQL Database',
      categories: Object.keys(grouped),
      data: grouped
    });
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get configuration by ID
exports.getConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id,
        category,
        config_key as \`key\`,
        config_value as value,
        description,
        is_secret as isSecret,
        created_at as createdAt,
        updated_at as updatedAt
      FROM system_configurations
      WHERE id = ?
      LIMIT 1
    `;
    
    const configs = await db.executeQuery(query, [id]);
    
    if (configs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    const config = configs[0];
    
    // Mask secret values
    if (config.isSecret) {
      config.value = '••••••••••••••••••••';
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update configuration
exports.updateConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, description } = req.body;
    
    const updates = [];
    const values = [];
    
    if (value !== undefined) {
      updates.push('config_value = ?');
      values.push(value);
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    values.push(id);
    
    const query = `UPDATE system_configurations SET ${updates.join(', ')} WHERE id = ?`;
    await db.executeQuery(query, values);
    
    // Fetch updated configuration
    const updated = await db.executeQuery('SELECT * FROM system_configurations WHERE id = ?', [id]);
    
    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    console.log('✅ Configuration updated:', updated[0].config_key);
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create configuration
exports.createConfiguration = async (req, res) => {
  try {
    const { category, key, value, description, isSecret } = req.body;
    
    const configId = uuidv4();
    
    const query = `
      INSERT INTO system_configurations (
        id, category, config_key, config_value, description, is_secret
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await db.executeQuery(query, [
      configId, category, key, value, description, isSecret || false
    ]);
    
    // Fetch the created configuration
    const created = await db.executeQuery('SELECT * FROM system_configurations WHERE id = ?', [configId]);
    
    console.log('✅ Configuration created:', key);
    
    res.status(201).json({
      success: true,
      message: 'Configuration created successfully',
      data: created[0]
    });
  } catch (error) {
    console.error('Error creating configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete configuration
exports.deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if configuration exists
    const config = await db.executeQuery('SELECT * FROM system_configurations WHERE id = ?', [id]);
    
    if (config.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    await db.executeQuery('DELETE FROM system_configurations WHERE id = ?', [id]);
    
    console.log('🗑️ Configuration deleted:', config[0].config_key);
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully',
      data: config[0]
    });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get timesheet configuration (public endpoint for authenticated users)
exports.getTimesheetConfiguration = async (req, res) => {
  try {
    console.log('📅 Fetching timesheet configuration for employee...');
    
    const query = `
      SELECT 
        config_key as \`key\`,
        config_value as value
      FROM system_configurations
      WHERE category = 'Timesheet Configuration'
        AND config_key IN ('submit_start_date', 'submit_end_date')
      ORDER BY config_key
    `;
    
    const configurations = await db.executeQuery(query);
    
    console.log('📅 Found configurations:', configurations);
    
    // Convert to object for easy access
    const configObj = {};
    configurations.forEach(config => {
      configObj[config.key] = config.value;
    });
    
    console.log('📅 Returning configuration object:', configObj);
    
    res.json({
      success: true,
      data: configObj
    });
  } catch (error) {
    console.error('Error fetching timesheet configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

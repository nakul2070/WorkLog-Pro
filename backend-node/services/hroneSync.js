const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * HROne Integration Service
 * Syncs holidays and leaves from HROne API
 */

// Helper function to fetch HROne config from database
async function getHROneConfig() {
  const configs = await db.executeQuery(
    'SELECT config_key, config_value FROM system_configurations WHERE category = "HROne Integration"'
  );
  return configs.reduce((acc, c) => ({ ...acc, [c.config_key]: c.config_value }), {});
}

/**
 * Sync Holidays from HROne
 */
async function syncHolidaysFromHROne() {
  console.log('🔄 Starting HROne holiday sync...');
  const config = await getHROneConfig();

  if (config.hrone_sync_enabled !== 'true') {
    console.log('Sync skipped: hrone_sync_enabled is not true in config.');
    return { success: false, message: 'Sync is disabled in configuration.' };
  }

  const syncLog = {
    id: uuidv4(),
    source: 'hrone',
    sync_type: 'holidays',
    started_at: new Date(),
    records_fetched: 0,
    records_created: 0,
    records_updated: 0,
    status: 'pending'
  };

  try {
    // TODO: Update these based on HROne's actual API documentation
    const apiUrl = config.hrone_api_url;
    const apiKey = config.hrone_api_key;

    // Make API call to HROne
    // EXAMPLE - Adjust based on actual HROne API docs:
    const response = await axios.get(`${apiUrl}/holidays`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // OR use: 'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      params: {
        year: new Date().getFullYear(),
        // Add other required params based on HROne docs
      }
    });

    const hroneHolidays = response.data.data || response.data; // Adjust based on response structure
    syncLog.records_fetched = hroneHolidays.length;

    // Upsert each holiday
    for (const hroneHoliday of hroneHolidays) {
      // Map HROne fields to your database fields
      // EXAMPLE - Adjust field names based on HROne's response:
      const holidayData = {
        date: hroneHoliday.date, // or hroneHoliday.holiday_date
        title: hroneHoliday.name || hroneHoliday.title,
        description: hroneHoliday.description || '',
        type: hroneHoliday.type || 'public',
        is_optional: hroneHoliday.is_optional || false,
        hrone_id: hroneHoliday.id || hroneHoliday.holiday_id,
      };

      // Check if holiday exists
      const [existing] = await db.executeQuery(
        'SELECT id FROM holidays WHERE hrone_id = ? OR date = ?',
        [holidayData.hrone_id, holidayData.date]
      );

      if (existing) {
        // UPDATE existing holiday
        await db.executeQuery(
          `UPDATE holidays 
           SET title = ?, description = ?, type = ?, is_optional = ?, 
               hrone_id = ?, hrone_synced_at = NOW()
           WHERE id = ?`,
          [
            holidayData.title,
            holidayData.description,
            holidayData.type,
            holidayData.is_optional,
            holidayData.hrone_id,
            existing.id
          ]
        );
        syncLog.records_updated++;
      } else {
        // INSERT new holiday
        const holidayId = uuidv4();
        await db.executeQuery(
          `INSERT INTO holidays 
           (id, date, title, description, type, is_optional, hrone_id, hrone_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            holidayId,
            holidayData.date,
            holidayData.title,
            holidayData.description,
            holidayData.type,
            holidayData.is_optional,
            holidayData.hrone_id
          ]
        );
        syncLog.records_created++;
      }
    }

    syncLog.status = 'success';
    console.log(`✅ Holiday sync successful: ${syncLog.records_created} created, ${syncLog.records_updated} updated.`);

  } catch (error) {
    syncLog.status = 'failed';
    syncLog.error_message = error.message;
    console.error('❌ Holiday sync failed:', error);
    
    // If it's an API error, log more details
    if (error.response) {
      console.error('API Response Error:', {
        status: error.response.status,
        data: error.response.data
      });
      syncLog.error_message = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
  } finally {
    syncLog.completed_at = new Date();
    syncLog.duration_seconds = Math.floor((syncLog.completed_at - syncLog.started_at) / 1000);

    // Log to database
    try {
      await db.executeQuery(
        `INSERT INTO sync_logs (id, source, sync_type, status, records_fetched,
         records_created, records_updated, started_at, completed_at, duration_seconds, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          syncLog.id,
          syncLog.source,
          syncLog.sync_type,
          syncLog.status,
          syncLog.records_fetched,
          syncLog.records_created,
          syncLog.records_updated,
          syncLog.started_at,
          syncLog.completed_at,
          syncLog.duration_seconds,
          syncLog.error_message || null
        ]
      );
    } catch (dbError) {
      console.error('Failed to write to sync_logs table:', dbError);
    }
  }

  return syncLog;
}

/**
 * Sync Leaves from HROne
 */
async function syncLeavesFromHROne() {
  console.log('🔄 Starting HROne leave sync...');
  const config = await getHROneConfig();

  if (config.hrone_sync_enabled !== 'true') {
    console.log('Sync skipped: hrone_sync_enabled is not true in config.');
    return { success: false, message: 'Sync is disabled in configuration.' };
  }

  const syncLog = {
    id: uuidv4(),
    source: 'hrone',
    sync_type: 'leaves',
    started_at: new Date(),
    records_fetched: 0,
    records_created: 0,
    records_updated: 0,
    status: 'pending'
  };

  try {
    const apiUrl = config.hrone_api_url;
    const apiKey = config.hrone_api_key;

    // Make API call to HROne
    // EXAMPLE - Adjust based on actual HROne API docs:
    const response = await axios.get(`${apiUrl}/leaves`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // OR use: 'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      params: {
        status: 'approved', // Only fetch approved leaves
        start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1 this year
        end_date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0], // Dec 31 this year
        // Add other required params
      }
    });

    const hroneLeaves = response.data.data || response.data;
    syncLog.records_fetched = hroneLeaves.length;

    // Upsert each leave
    for (const hroneLeave of hroneLeaves) {
      // Map HROne leave fields to your database
      // EXAMPLE - Adjust based on HROne's response:
      
      // First, find the user by email from HROne
      const employeeEmail = hroneLeave.employee_email || hroneLeave.email;
      const [user] = await db.executeQuery(
        'SELECT id FROM users WHERE email = ? AND is_active = 1',
        [employeeEmail]
      );

      if (!user) {
        console.warn(`Skipping leave for ${employeeEmail}: User not found in database`);
        continue;
      }

      const leaveData = {
        user_id: user.id,
        leave_type: hroneLeave.leave_type || hroneLeave.type,
        start_date: hroneLeave.start_date || hroneLeave.from_date,
        end_date: hroneLeave.end_date || hroneLeave.to_date,
        total_days: hroneLeave.total_days || hroneLeave.days,
        reason: hroneLeave.reason || hroneLeave.description || '',
        status: 'approved', // Since we're fetching approved leaves
        applied_date: hroneLeave.applied_date || hroneLeave.request_date,
        approved_by: hroneLeave.approved_by || 'HROne',
        hrone_id: hroneLeave.id || hroneLeave.leave_id,
      };

      // Check if leave exists
      const [existing] = await db.executeQuery(
        'SELECT id FROM leaves WHERE hrone_id = ?',
        [leaveData.hrone_id]
      );

      if (existing) {
        // UPDATE existing leave
        await db.executeQuery(
          `UPDATE leaves 
           SET user_id = ?, leave_type = ?, start_date = ?, end_date = ?,
               total_days = ?, reason = ?, status = ?, applied_date = ?,
               approved_by = ?, hrone_synced_at = NOW()
           WHERE id = ?`,
          [
            leaveData.user_id,
            leaveData.leave_type,
            leaveData.start_date,
            leaveData.end_date,
            leaveData.total_days,
            leaveData.reason,
            leaveData.status,
            leaveData.applied_date,
            leaveData.approved_by,
            existing.id
          ]
        );
        syncLog.records_updated++;
      } else {
        // INSERT new leave
        const leaveId = uuidv4();
        await db.executeQuery(
          `INSERT INTO leaves 
           (id, user_id, leave_type, start_date, end_date, total_days, reason, 
            status, applied_date, approved_by, hrone_id, hrone_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            leaveId,
            leaveData.user_id,
            leaveData.leave_type,
            leaveData.start_date,
            leaveData.end_date,
            leaveData.total_days,
            leaveData.reason,
            leaveData.status,
            leaveData.applied_date,
            leaveData.approved_by,
            leaveData.hrone_id
          ]
        );
        syncLog.records_created++;
      }
    }

    syncLog.status = 'success';
    console.log(`✅ Leave sync successful: ${syncLog.records_created} created, ${syncLog.records_updated} updated.`);

  } catch (error) {
    syncLog.status = 'failed';
    syncLog.error_message = error.message;
    console.error('❌ Leave sync failed:', error);

    if (error.response) {
      console.error('API Response Error:', {
        status: error.response.status,
        data: error.response.data
      });
      syncLog.error_message = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
  } finally {
    syncLog.completed_at = new Date();
    syncLog.duration_seconds = Math.floor((syncLog.completed_at - syncLog.started_at) / 1000);

    // Log to database
    try {
      await db.executeQuery(
        `INSERT INTO sync_logs (id, source, sync_type, status, records_fetched,
         records_created, records_updated, started_at, completed_at, duration_seconds, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          syncLog.id,
          syncLog.source,
          syncLog.sync_type,
          syncLog.status,
          syncLog.records_fetched,
          syncLog.records_created,
          syncLog.records_updated,
          syncLog.started_at,
          syncLog.completed_at,
          syncLog.duration_seconds,
          syncLog.error_message || null
        ]
      );
    } catch (dbError) {
      console.error('Failed to write to sync_logs table:', dbError);
    }
  }

  return syncLog;
}

module.exports = {
  syncHolidaysFromHROne,
  syncLeavesFromHROne
};


const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const emailService = require('../services/emailService');

/**
 * Timesheet Controller
 * Manages timesheets and timesheet entries from MySQL database
 */

// Cache for column existence check
let isHalfdayColumnExists = null;

/**
 * Check if is_halfday column exists in timesheet_entries table
 * Caches the result to avoid repeated database queries
 */
async function checkIsHalfdayColumnExists() {
  if (isHalfdayColumnExists !== null) {
    return isHalfdayColumnExists;
  }
  
  try {
    const result = await db.executeQuery(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'timesheet_entries' 
       AND COLUMN_NAME = 'is_halfday'`
    );
    
    isHalfdayColumnExists = result && result[0] && result[0].count > 0;
    return isHalfdayColumnExists;
  } catch (error) {
    console.warn('⚠️ Could not check for is_halfday column:', error.message);
    isHalfdayColumnExists = false;
    return false;
  }
}

// Get all timesheets
exports.getAllTimesheets = async (req, res) => {
  try {
    const { userId, year, month, status } = req.query;
    console.log('📋 Fetching timesheets from database...');
    
    let query = `
      SELECT 
        t.id,
        t.timesheet_code as timesheetCode,
        t.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        t.year,
        t.month,
        t.total_hours as totalHours,
        t.total_working_days as totalWorkingDays,
        t.total_holidays as totalHolidays,
        t.total_leaves as totalLeaves,
        t.status,
        t.submitted_at as submittedAt,
        t.created_at as createdAt,
        t.updated_at as updatedAt
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      query += ' AND t.user_id = ?';
      params.push(userId);
    }
    
    if (year) {
      query += ' AND t.year = ?';
      params.push(year);
    }
    
    if (month) {
      query += ' AND t.month = ?';
      params.push(month);
    }
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY t.year DESC, t.month DESC';
    
    const timesheets = await db.executeQuery(query, params);
    
    res.json({
      success: true,
      source: 'MySQL Database',
      count: timesheets.length,
      data: timesheets
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get timesheet by ID
exports.getTimesheetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        t.*,
        u.name as userName,
        u.employee_id as employeeId,
        u.email
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
      LIMIT 1
    `;
    
    const [timesheet] = await db.executeQuery(query, [id]); // Use array destructuring
    
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    // Ensure status is always set (handle NULL/empty)
    if (!timesheet.status || timesheet.status.trim() === '') {
      console.log(`⚠️  Timesheet ${id} has NULL/empty status, updating to 'draft'`);
      await db.executeQuery(
        'UPDATE timesheets SET status = ? WHERE id = ?',
        ['draft', id]
      );
      timesheet.status = 'draft';
    }
    
    res.json({
      success: true,
      data: timesheet
    });
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get user's timesheets
exports.getUserTimesheets = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT 
        id,
        timesheet_code as timesheetCode,
        year,
        month,
        total_hours as totalHours,
        status,
        submitted_at as submittedAt,
        created_at as createdAt
      FROM timesheets
      WHERE user_id = ?
      ORDER BY year DESC, month DESC
    `;
    
    const timesheets = await db.executeQuery(query, [userId]);
    
    res.json({
      success: true,
      count: timesheets.length,
      data: timesheets
    });
  } catch (error) {
    console.error('Error fetching user timesheets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create timesheet
exports.createTimesheet = async (req, res) => {
  try {
    // Use authenticated user ID from middleware instead of request body
    // This ensures the user exists and is authenticated
    let userId = req.user?.id || req.userId;
    
    // Log for debugging
    console.log('📋 createTimesheet - Auth check:', {
      hasReqUser: !!req.user,
      reqUserId: req.user?.id,
      reqUserIdType: typeof req.user?.id,
      reqUserIdValue: req.userId,
      reqUserIdValueType: typeof req.userId,
      bodyUserId: req.body?.userId,
      finalUserId: userId,
      finalUserIdType: typeof userId
    });
    
    // Ensure userId is a valid string (database uses VARCHAR)
    if (!userId) {
      console.error('❌ createTimesheet - No userId found in req.user or req.userId');
      return res.status(401).json({
        success: false,
        error: 'User authentication required. Please log in again.'
      });
    }
    
    // Convert to string if needed (database uses VARCHAR(36) for UUIDs)
    userId = String(userId).trim();
    
    if (!userId || userId === 'undefined' || userId === 'null' || userId === '0') {
      console.error('❌ createTimesheet - Invalid userId:', userId);
      return res.status(401).json({
        success: false,
        error: 'Invalid user ID. Please log in again.'
      });
    }
    
    // Validate user exists in database (double-check)
    const [userExists] = await db.executeQuery(
      'SELECT id FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );
    
    if (!userExists || !userExists.id) {
      console.error('❌ createTimesheet - User not found in database:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found or inactive. Please contact administrator.'
      });
    }
    
    // Ensure we use the ID from database (in case of any mismatch)
    const validUserId = String(userExists.id);
    console.log('✅ createTimesheet - Valid user confirmed:', validUserId);
    
    const { year, month } = req.body;
    
    // Validate year and month
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: 'Year and month are required'
      });
    }
    
    const [existing] = await db.executeQuery(
      'SELECT id FROM timesheets WHERE user_id = ? AND year = ? AND month = ?',
      [validUserId, year, month]
    );
    
    if (existing) {
      console.log('✅ Timesheet already exists, returning existing timesheet:', existing.id);
      // Return the existing timesheet instead of an error
      const [existingTimesheet] = await db.executeQuery('SELECT * FROM timesheets WHERE id = ?', [existing.id]);
      return res.status(200).json({
        success: true,
        message: 'Timesheet already exists for this month',
        data: existingTimesheet
      });
    }
    
    const timesheetId = uuidv4();
    
    // --- FIX: Generate unique timesheet code to prevent duplicates ---
    // Use a combination of year-month and a unique counter that checks for existing codes
    let timesheetCode;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
      // Get count of timesheets for this year-month combination to generate a unique sequence
      const countResult = await db.executeQuery(
        'SELECT COUNT(*) as count FROM timesheets WHERE year = ? AND month = ?',
        [year, month]
      );
      const count = countResult[0]?.count || 0;
      const sequence = count + 1 + attempts; // Add attempts to handle race conditions
      timesheetCode = `TS${year}-${String(month).padStart(2, '0')}-${String(sequence).padStart(3, '0')}`;
      
      // Check if this code already exists
      const [existingCode] = await db.executeQuery(
        'SELECT id FROM timesheets WHERE timesheet_code = ?',
        [timesheetCode]
      );
      
      if (!existingCode) {
        // Code is unique, break the loop
        break;
      }
      
      attempts++;
      console.log(`⚠️  Timesheet code ${timesheetCode} already exists, trying next sequence...`);
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique timesheet code after multiple attempts');
      }
    } while (attempts < maxAttempts);
    
    console.log('📝 createTimesheet - Inserting timesheet:', {
      timesheetId,
      timesheetCode,
      userId: validUserId,
      year,
      month,
      attempts
    });
    
    const query = `
      INSERT INTO timesheets (
        id, timesheet_code, user_id, year, month, status
      ) VALUES (?, ?, ?, ?, ?, 'draft')
    `;
    
    try {
      await db.executeQuery(query, [timesheetId, timesheetCode, validUserId, year, month]);
    } catch (insertError) {
      // Handle duplicate key error - this should be rare since we check before inserting
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.message?.includes('Duplicate entry')) {
        console.error(`❌ Duplicate timesheet_code detected despite check: ${timesheetCode}`);
        // Try to find the existing timesheet
        const [existingTimesheet] = await db.executeQuery(
          'SELECT * FROM timesheets WHERE timesheet_code = ?',
          [timesheetCode]
        );
        
        if (existingTimesheet) {
          // Check if it's for the same user and month
          if (existingTimesheet.user_id === validUserId && 
              existingTimesheet.year === year && 
              existingTimesheet.month === month) {
            // Return the existing timesheet instead of creating a new one
            console.log('✅ Returning existing timesheet:', timesheetCode);
            return res.status(200).json({
              success: true,
              message: 'Timesheet already exists for this month',
              data: existingTimesheet
            });
          }
        }
        
        // If we still get a duplicate error, throw it
        throw new Error(`Failed to create timesheet: Code ${timesheetCode} already exists and is not for this user/month combination`);
      } else {
        throw insertError; // Re-throw if it's not a duplicate key error
      }
    }
    
    const [created] = await db.executeQuery('SELECT * FROM timesheets WHERE id = ?', [timesheetId]);
    
    console.log('✅ Timesheet created:', timesheetCode);
    
    res.status(201).json({
      success: true,
      message: 'Timesheet created successfully',
      data: created
    });
  } catch (error) {
    console.error('Error creating timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Save timesheet (draft - without submitting)
exports.saveTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { dailyEntries } = req.body;
    
    // Get authenticated user ID
    const currentUserId = req.user?.id || req.userId;
    
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const [timesheet] = await db.executeQuery('SELECT * FROM timesheets WHERE id = ?', [id]);
    
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    // Verify the timesheet belongs to the current user
    if (timesheet.user_id !== currentUserId) {
      console.error(`❌ Security: User ${currentUserId} attempted to save timesheet ${id} owned by ${timesheet.user_id}`);
      return res.status(403).json({
        success: false,
        error: 'You can only save your own timesheets'
      });
    }
    
    // Log for debugging
    console.log(`💾 Saving timesheet ${id} for user ${currentUserId} (timesheet owner: ${timesheet.user_id})`);
    
    // Only allow saving draft timesheets
    const rawStatus = timesheet.status;
    const currentStatus = (rawStatus && rawStatus.trim() !== '') ? rawStatus.trim().toLowerCase() : 'draft';
    
    if (currentStatus !== 'draft') {
      return res.status(400).json({
        success: false,
        error: `Timesheet cannot be saved. Current status: "${rawStatus || 'NULL/EMPTY'}". Only draft timesheets can be saved.`
      });
    }
    
    // Validate dailyEntries
    if (!dailyEntries || !Array.isArray(dailyEntries)) {
      return res.status(400).json({
        success: false,
        error: 'dailyEntries array is required in request body'
      });
    }
    
    // Accept totals from frontend
    const { totalHours, totalWorkingDays, totalHolidays, totalLeaves } = req.body;
    
    const DEFAULT_PROJECT_ID_FOR_LEAVE = "proj-001";
    
    // Get existing entries to update them instead of deleting
    const existingEntries = await db.executeQuery(
      'SELECT id, entry_date, project_id FROM timesheet_entries WHERE timesheet_id = ?',
      [id]
    );
    
    // Create a map of existing entries by date and project_id
    const existingEntriesMap = new Map();
    existingEntries.forEach(entry => {
      const key = `${entry.entry_date}_${entry.project_id}`;
      existingEntriesMap.set(key, entry.id);
    });
    
    // Track which entries we've processed
    const processedEntryKeys = new Set();
    
    // Process and save/update entries
    for (let index = 0; index < dailyEntries.length; index++) {
      const dayEntry = dailyEntries[index];
      const date = dayEntry?.date;
      const workingHours = dayEntry?.workingHours;
      const isHoliday = dayEntry?.isHoliday;
      const isLeave = dayEntry?.isLeave;
      const leaveType = dayEntry?.leaveType; // 'half-day', 'full-day', or null
      const projectEntries = dayEntry?.projectEntries;
      
      if (!date) {
        continue;
      }
      
      const isHolidayFlag = Boolean(isHoliday);
      const isLeaveFlag = Boolean(isLeave);
      // Detect half-day leave: check is_halfday flag OR leaveType === 'half-day' OR leaveType === 'halfday'
      const isHalfday = Boolean(dayEntry?.is_halfday || dayEntry?.isHalfday || 0); // Support both snake_case and camelCase
      const leaveTypeNormalized = leaveType ? leaveType.toLowerCase().replace('_', '-') : null; // Normalize 'half-day', 'halfday', 'half_day'
      const isHalfDayLeave = isHalfday || (isLeaveFlag && (leaveTypeNormalized === 'half-day' || leaveTypeNormalized === 'halfday'));
      const isFullDayLeave = isLeaveFlag && (leaveTypeNormalized === 'full-day' || leaveTypeNormalized === 'fullday') && !isHalfday;
      
      if (isHolidayFlag) {
        // Holiday entry
        const entryKey = `${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}_holiday`;
        const existingEntryId = existingEntriesMap.get(`${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}`);
        
        if (existingEntryId && !processedEntryKeys.has(entryKey)) {
          // Update existing entry
          await db.executeQuery(
            `UPDATE timesheet_entries 
             SET hours = ?, is_holiday = 1, is_leave = 0, updated_at = NOW()
             WHERE id = ?`,
            [8, existingEntryId]
          );
          processedEntryKeys.add(entryKey);
        } else if (!processedEntryKeys.has(entryKey)) {
          // Create new entry
          const entryId = uuidv4();
          await db.executeQuery(
            `INSERT INTO timesheet_entries (
              id, timesheet_id, project_id, entry_date, hours, task_description,
              is_holiday, is_leave, is_weekend, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [entryId, id, DEFAULT_PROJECT_ID_FOR_LEAVE, date, 8, 'Holiday', 1, 0, 0]
          );
          processedEntryKeys.add(entryKey);
        }
      } else if (isFullDayLeave) {
        // Full Day Leave entry - create leave entry with 8 hours
        const entryKey = `${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}_leave`;
        const existingEntryId = existingEntriesMap.get(`${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}`);
        
        if (existingEntryId && !processedEntryKeys.has(entryKey)) {
          // Update existing entry - ensure is_halfday = 0 for full-day leave
          await db.executeQuery(
            `UPDATE timesheet_entries 
             SET hours = ?, is_holiday = 0, is_leave = 1, leave_type = ?, is_halfday = 0, updated_at = NOW()
             WHERE id = ?`,
            [8, 'full-day', existingEntryId]
          );
          processedEntryKeys.add(entryKey);
        } else if (!processedEntryKeys.has(entryKey)) {
          // Create new entry - ensure is_halfday = 0 for full-day leave
          const entryId = uuidv4();
          await db.executeQuery(
            `INSERT INTO timesheet_entries (
              id, timesheet_id, project_id, entry_date, hours, task_description,
              is_holiday, is_leave, leave_type, is_halfday, is_weekend, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [entryId, id, DEFAULT_PROJECT_ID_FOR_LEAVE, date, 8, 'On Leave', 0, 1, 'full-day', 0, 0]
          );
          processedEntryKeys.add(entryKey);
        }
      } else if (isHalfDayLeave && projectEntries && Array.isArray(projectEntries) && projectEntries.length > 0) {
        // Half Day Leave with work entries (is_halfday = 1)
        // Strategy: Create separate 4-hour leave entry + save work entries (up to 6h)
        
        // VALIDATION: Calculate total work hours for this day
        const totalWorkHours = projectEntries.reduce((sum, entry) => {
          return sum + (Number(entry.hours) || 0);
        }, 0);
        
        // Validate: Work hours cannot exceed 6 hours for half-day leave
        if (totalWorkHours > 6) {
          console.error(`❌ Validation failed: Half-day leave work hours (${totalWorkHours}h) exceed maximum allowed (6h) for date ${date}`);
          throw new Error(`Half-day leave work hours cannot exceed 6 hours. Current total: ${totalWorkHours} hours.`);
        }
        
        // Step 1: Create/update 4-hour leave entry for half-day (automatically calculated)
        const leaveEntryKey = `${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}_halfday_leave`;
        const existingLeaveEntryId = existingEntriesMap.get(`${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}`);
        const leaveHours = 4; // Half-day leave = 4 hours (automatically calculated based on 8-hour workday)
        
        if (existingLeaveEntryId && !processedEntryKeys.has(leaveEntryKey)) {
          // Update existing leave entry to 4 hours
          await db.executeQuery(
            `UPDATE timesheet_entries 
             SET hours = ?, is_holiday = 0, is_leave = 1, leave_type = 'halfday', is_halfday = 1, updated_at = NOW()
             WHERE id = ?`,
            [leaveHours, existingLeaveEntryId]
          );
          processedEntryKeys.add(leaveEntryKey);
          console.log(`  ✅ Updated half-day leave entry for ${date} (${leaveHours} hours leave - automatically calculated)`);
        } else if (!processedEntryKeys.has(leaveEntryKey)) {
          // Create new 4-hour leave entry
          const leaveEntryId = uuidv4();
          await db.executeQuery(
            `INSERT INTO timesheet_entries (
              id, timesheet_id, project_id, entry_date, hours, task_description,
              is_holiday, is_leave, leave_type, is_halfday, is_weekend, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [leaveEntryId, id, DEFAULT_PROJECT_ID_FOR_LEAVE, date, leaveHours, 'Half Day Leave', 0, 1, 'halfday', 1, 0]
          );
          processedEntryKeys.add(leaveEntryKey);
          console.log(`  ✅ Created half-day leave entry for ${date} (${leaveHours} hours leave - automatically calculated)`);
        }
        
        // Step 2: Save work entries (up to 6h total, validated above) - these are WORK entries, not leave entries
        console.log(`    📝 Processing ${projectEntries.length} project entry/entries for half-day leave on date ${date} (Total work hours: ${totalWorkHours}h)`);
        const currentDate = date;
        for (let pIndex = 0; pIndex < projectEntries.length; pIndex++) {
          const projectEntry = projectEntries[pIndex];
          const projectId = projectEntry?.projectId;
          const hours = projectEntry?.hours;
          const taskDescription = projectEntry?.taskDescription;
          
          if (!projectId) {
            console.warn(`⚠️  Skipping project entry at index ${pIndex} with missing projectId for date ${currentDate}`);
            continue;
          }
          
          const entryKey = `${currentDate}_${projectId}`;
          const existingEntryId = existingEntriesMap.get(entryKey);
          const entryHours = Number(hours) || 0;
          
          if (existingEntryId && !processedEntryKeys.has(entryKey)) {
            // Update existing entry - WORK entry with is_halfday=1, is_leave=0
            await db.executeQuery(
              `UPDATE timesheet_entries 
               SET hours = ?, task_description = ?, is_holiday = 0, is_leave = 0, is_halfday = 1, updated_at = NOW()
               WHERE id = ?`,
              [entryHours, taskDescription || '', existingEntryId]
            );
            processedEntryKeys.add(entryKey);
            console.log(`      ✅ Updated work entry ${pIndex} for date ${currentDate}, project ${projectId} (is_halfday=1, is_leave=0)`);
          } else if (!processedEntryKeys.has(entryKey)) {
            // Create new entry - WORK entry with is_halfday=1, is_leave=0
            const entryId = uuidv4();
            await db.executeQuery(
              `INSERT INTO timesheet_entries (
                id, timesheet_id, project_id, entry_date, hours, task_description,
                is_holiday, is_leave, is_halfday, is_weekend, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [entryId, id, projectId, currentDate, entryHours, taskDescription || '', 0, 0, 1, 0]
            );
            processedEntryKeys.add(entryKey);
            console.log(`      ✅ Created work entry ${pIndex} for date ${currentDate}, project ${projectId} (is_halfday=1, is_leave=0)`);
          }
        }
      } else if (projectEntries && Array.isArray(projectEntries) && projectEntries.length > 0) {
        // Working day entries
        for (const projectEntry of projectEntries) {
          const projectId = projectEntry?.projectId;
          const hours = projectEntry?.hours;
          const taskDescription = projectEntry?.taskDescription;
          
          if (!projectId) continue;
          
          const entryKey = `${date}_${projectId}`;
          const existingEntryId = existingEntriesMap.get(entryKey);
          
          if (existingEntryId && !processedEntryKeys.has(entryKey)) {
            // Update existing entry
            await db.executeQuery(
              `UPDATE timesheet_entries 
               SET hours = ?, task_description = ?, is_holiday = 0, is_leave = 0, updated_at = NOW()
               WHERE id = ?`,
              [Number(hours) || 0, taskDescription || '', existingEntryId]
            );
            processedEntryKeys.add(entryKey);
          } else if (!processedEntryKeys.has(entryKey)) {
            // Create new entry
            const entryId = uuidv4();
            await db.executeQuery(
              `INSERT INTO timesheet_entries (
                id, timesheet_id, project_id, entry_date, hours, task_description,
                is_holiday, is_leave, is_weekend, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [entryId, id, projectId, date, Number(hours) || 0, taskDescription || '', 0, 0, 0]
            );
            processedEntryKeys.add(entryKey);
          }
        }
      }
    }
    
    // Delete entries that are no longer in the new data
    const entriesToKeep = Array.from(processedEntryKeys).map(key => {
      const [date, projectId] = key.split('_');
      return { date, projectId };
    });
    
    // Build delete query for entries not in the new data
    if (existingEntries.length > 0) {
      const entriesToDelete = existingEntries.filter(existing => {
        const key = `${existing.entry_date}_${existing.project_id}`;
        return !processedEntryKeys.has(key);
      });
      
      if (entriesToDelete.length > 0) {
        const deleteIds = entriesToDelete.map(e => e.id);
        await db.executeQuery(
          `DELETE FROM timesheet_entries WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
          deleteIds
        );
      }
    }
    
    // Update timesheet totals (but keep status as draft)
    const finalTotalHours = Number(totalHours) || 0;
    const finalTotalWorkingDays = Number(totalWorkingDays) || 0;
    const finalTotalHolidays = Number(totalHolidays) || 0;
    const finalTotalLeaves = Number(totalLeaves) || 0;
    
    await db.executeQuery(
      `UPDATE timesheets 
       SET total_hours = ?,
           total_working_days = ?,
           total_holidays = ?,
           total_leaves = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [finalTotalHours, finalTotalWorkingDays, finalTotalHolidays, finalTotalLeaves, id]
    );
    
    console.log(`✅ Timesheet ${id} saved as draft`);
    
    res.json({
      success: true,
      message: 'Timesheet saved successfully',
      data: { id, status: 'draft' }
    });
  } catch (error) {
    console.error('Error saving timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Submit timesheet for approval
exports.submitTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    // Accept dailyEntries array from frontend: [{ date, isHoliday, isLeave, projectEntries: [{projectId, hours, taskDescription}] }]
    const { dailyEntries } = req.body;
    
    const [timesheet] = await db.executeQuery('SELECT * FROM timesheets WHERE id = ?', [id]);
    
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    // Handle NULL, empty string, or undefined status as 'draft' (for backwards compatibility)
    const rawStatus = timesheet.status;
    const currentStatus = (rawStatus && rawStatus.trim() !== '') ? rawStatus.trim().toLowerCase() : 'draft';
    
    console.log(`📋 Timesheet ${id} status check:`);
    console.log(`   Raw status from DB: "${rawStatus}" (type: ${typeof rawStatus})`);
    console.log(`   Normalized status: "${currentStatus}"`);
    console.log(`   Timesheet code: ${timesheet.timesheet_code}`);
    console.log(`   User ID: ${timesheet.user_id}`);
    console.log(`   Year/Month: ${timesheet.year}/${timesheet.month}`);
    
    // Allow submission from 'draft' or 'submitted' status
    // 'submitted' allows resubmission with corrected data
    // 'rejected' should use the resubmit endpoint to reset to draft first
    // 'approved' should not be resubmitted without proper workflow
    if (currentStatus !== 'draft' && currentStatus !== 'submitted') {
      const errorMsg = `Timesheet cannot be submitted. Current status: "${rawStatus || 'NULL/EMPTY'}". Only draft or submitted timesheets can be submitted. For rejected timesheets, use the resubmit endpoint first.`;
      console.error(`❌ ${errorMsg}`);
      return res.status(400).json({
        success: false,
        error: errorMsg
      });
    }
    
    // Log if this is a resubmission
    if (currentStatus === 'submitted') {
      console.log(`🔄 Resubmitting timesheet ${id} - will update existing submitted timesheet`);
    }
    
    // Validate dailyEntries
    if (!dailyEntries || !Array.isArray(dailyEntries)) {
      return res.status(400).json({
        success: false,
        error: 'dailyEntries array is required in request body'
      });
    }
    
    // Accept totals from frontend - save exactly as received without calculation
    const { totalHours, totalWorkingDays, totalHolidays, totalLeaves } = req.body;
    
    // Validate totals are provided (frontend should calculate and send these)
    if (totalHours === undefined || totalHours === null) {
      return res.status(400).json({
        success: false,
        error: 'totalHours is required in request body (frontend should calculate and send this value)'
      });
    }
    
    const DEFAULT_PROJECT_ID_FOR_LEAVE = "proj-001"; // Default project for holiday/leave entries
    
    // STEP 1: Get existing entries to update them instead of deleting/recreating
    const existingEntries = await db.executeQuery(
      'SELECT id, entry_date, project_id FROM timesheet_entries WHERE timesheet_id = ?',
      [id]
    );
    
    // Create a map of existing entries by date and project_id
    const existingEntriesMap = new Map();
    existingEntries.forEach(entry => {
      const key = `${entry.entry_date}_${entry.project_id}`;
      existingEntriesMap.set(key, entry.id);
    });
    
    // Track which entries we've processed
    const processedEntryKeys = new Set();
    
    // STEP 2: Save/update entries exactly as received from frontend - no calculations, no modifications
    console.log(`📋 Processing ${dailyEntries.length} daily entries from frontend...`);
    console.log(`📋 Full dailyEntries array structure:`, JSON.stringify(dailyEntries.map((e, i) => ({ 
      index: i, 
      date: e?.date, 
      projectEntriesCount: e?.projectEntries?.length || 0,
      firstProjectId: e?.projectEntries?.[0]?.projectId || 'none'
    })), null, 2));
    
    // Process entries in order, ensuring each entry uses its own date
    for (let index = 0; index < dailyEntries.length; index++) {
      const dayEntry = dailyEntries[index];
      
      // Extract all fields at once to prevent any reference issues
      const date = dayEntry?.date;
      const workingHours = dayEntry?.workingHours;
      const isHoliday = dayEntry?.isHoliday;
      const isLeave = dayEntry?.isLeave;
      const leaveType = dayEntry?.leaveType; // 'half-day', 'full-day', or null
      const projectEntries = dayEntry?.projectEntries;
    
      console.log(`  📅 Processing entry ${index}/${dailyEntries.length} (0-indexed): date=${date}, isHoliday=${isHoliday}, isLeave=${isLeave}, leaveType=${leaveType}, projectEntries=${projectEntries?.length || 0}`);
      console.log(`  📅 Full entry data:`, JSON.stringify({ date, workingHours, isHoliday, isLeave, leaveType, projectEntriesCount: projectEntries?.length || 0 }, null, 2));
    
      if (!date) {
        console.warn(`⚠️  Skipping entry at index ${index} with missing date:`, JSON.stringify(dayEntry, null, 2));
        continue;
      }
      
      // Normalize flags exactly as received
      const isHolidayFlag = Boolean(isHoliday);
      const isLeaveFlag = Boolean(isLeave);
      // Detect half-day leave: check is_halfday flag OR leaveType === 'half-day' OR leaveType === 'halfday'
      const isHalfday = Boolean(dayEntry?.is_halfday || dayEntry?.isHalfday || 0); // Support both snake_case and camelCase
      const leaveTypeNormalized = leaveType ? leaveType.toLowerCase().replace('_', '-') : null; // Normalize 'half-day', 'halfday', 'half_day'
      const isHalfDayLeave = isHalfday || (isLeaveFlag && (leaveTypeNormalized === 'half-day' || leaveTypeNormalized === 'halfday'));
      const isFullDayLeave = isLeaveFlag && (leaveTypeNormalized === 'full-day' || leaveTypeNormalized === 'fullday') && !isHalfday;
      
      if (isHolidayFlag) {
        // Holiday day: update existing or create new
        const entryKey = `${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}_holiday`;
        const existingEntryId = existingEntriesMap.get(`${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}`);
        const holidayHours = 8; // Standard holiday hours
        
        if (existingEntryId && !processedEntryKeys.has(entryKey)) {
          // Update existing entry
          await db.executeQuery(
            `UPDATE timesheet_entries 
             SET hours = ?, is_holiday = 1, is_leave = 0, updated_at = NOW()
             WHERE id = ?`,
            [holidayHours, existingEntryId]
          );
          processedEntryKeys.add(entryKey);
          console.log(`  ✅ Updated holiday entry for ${date} (${holidayHours} hours)`);
        } else if (!processedEntryKeys.has(entryKey)) {
          // Create new entry
          const entryId = uuidv4();
          await db.executeQuery(
            `INSERT INTO timesheet_entries (
              id, timesheet_id, project_id, entry_date, hours, task_description,
              is_holiday, is_leave, is_weekend, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [entryId, id, DEFAULT_PROJECT_ID_FOR_LEAVE, date, holidayHours, 'Holiday', 1, 0, 0]
          );
          processedEntryKeys.add(entryKey);
          console.log(`  ✅ Created holiday entry for ${date} (${holidayHours} hours)`);
        }
      } else if (isFullDayLeave) {
        // Full Day Leave: update existing or create new leave entry with 8 hours
        const entryKey = `${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}_leave`;
        const existingEntryId = existingEntriesMap.get(`${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}`);
        const leaveHours = 8; // Standard leave hours
        
        if (existingEntryId && !processedEntryKeys.has(entryKey)) {
          // Update existing entry - ensure is_halfday = 0 for full-day leave
          await db.executeQuery(
            `UPDATE timesheet_entries 
             SET hours = ?, is_holiday = 0, is_leave = 1, leave_type = ?, is_halfday = 0, updated_at = NOW()
             WHERE id = ?`,
            [leaveHours, 'full-day', existingEntryId]
          );
          processedEntryKeys.add(entryKey);
          console.log(`  ✅ Updated full-day leave entry for ${date} (${leaveHours} hours, is_halfday=0)`);
        } else if (!processedEntryKeys.has(entryKey)) {
          // Create new entry - ensure is_halfday = 0 for full-day leave
          const entryId = uuidv4();
          await db.executeQuery(
            `INSERT INTO timesheet_entries (
              id, timesheet_id, project_id, entry_date, hours, task_description,
              is_holiday, is_leave, leave_type, is_halfday, is_weekend, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [entryId, id, DEFAULT_PROJECT_ID_FOR_LEAVE, date, leaveHours, 'On Leave', 0, 1, 'full-day', 0, 0]
          );
          processedEntryKeys.add(entryKey);
          console.log(`  ✅ Created full-day leave entry for ${date} (${leaveHours} hours, is_halfday=0)`);
        }
      } else if (isHalfDayLeave && projectEntries && Array.isArray(projectEntries) && projectEntries.length > 0) {
        // Half Day Leave with work entries (is_halfday = 1)
        // Strategy: Create separate 4-hour leave entry + save work entries (up to 6h)
        
        // VALIDATION: Calculate total work hours for this day
        const totalWorkHours = projectEntries.reduce((sum, entry) => {
          return sum + (Number(entry.hours) || 0);
        }, 0);
        
        // Validate: Work hours cannot exceed 6 hours for half-day leave
        if (totalWorkHours > 6) {
          console.error(`❌ Validation failed: Half-day leave work hours (${totalWorkHours}h) exceed maximum allowed (6h) for date ${date}`);
          throw new Error(`Half-day leave work hours cannot exceed 6 hours. Current total: ${totalWorkHours} hours.`);
        }
        
        // Step 1: Create/update 4-hour leave entry for half-day (automatically calculated)
        const leaveEntryKey = `${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}_halfday_leave`;
        const existingLeaveEntryId = existingEntriesMap.get(`${date}_${DEFAULT_PROJECT_ID_FOR_LEAVE}`);
        const leaveHours = 4; // Half-day leave = 4 hours (automatically calculated based on 8-hour workday)
        
        if (existingLeaveEntryId && !processedEntryKeys.has(leaveEntryKey)) {
          // Update existing leave entry to 4 hours
          await db.executeQuery(
            `UPDATE timesheet_entries 
             SET hours = ?, is_holiday = 0, is_leave = 1, leave_type = 'halfday', is_halfday = 1, updated_at = NOW()
             WHERE id = ?`,
            [leaveHours, existingLeaveEntryId]
          );
          processedEntryKeys.add(leaveEntryKey);
          console.log(`  ✅ Updated half-day leave entry for ${date} (${leaveHours} hours leave - automatically calculated)`);
        } else if (!processedEntryKeys.has(leaveEntryKey)) {
          // Create new 4-hour leave entry
          const leaveEntryId = uuidv4();
          await db.executeQuery(
            `INSERT INTO timesheet_entries (
              id, timesheet_id, project_id, entry_date, hours, task_description,
              is_holiday, is_leave, leave_type, is_halfday, is_weekend, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [leaveEntryId, id, DEFAULT_PROJECT_ID_FOR_LEAVE, date, leaveHours, 'Half Day Leave', 0, 1, 'halfday', 1, 0]
          );
          processedEntryKeys.add(leaveEntryKey);
          console.log(`  ✅ Created half-day leave entry for ${date} (${leaveHours} hours leave - automatically calculated)`);
        }
        
        // Step 2: Save work entries (up to 6h total, validated above)
        console.log(`    📝 Processing ${projectEntries.length} project entry/entries for half-day leave on date ${date} (Total work hours: ${totalWorkHours}h)`);
        const currentDate = date;
        for (let pIndex = 0; pIndex < projectEntries.length; pIndex++) {
          const projectEntry = projectEntries[pIndex];
          const projectId = projectEntry?.projectId;
          const hours = projectEntry?.hours;
          const taskDescription = projectEntry?.taskDescription;
          
          console.log(`      📌 Project entry ${pIndex}/${projectEntries.length} (0-indexed) for date ${currentDate}: projectId=${projectId}, hours=${hours}`);
          
          if (!projectId) {
            console.warn(`⚠️  Skipping project entry at index ${pIndex} with missing projectId for date ${currentDate}`);
            continue;
          }
          
          const entryKey = `${currentDate}_${projectId}`;
          const existingEntryId = existingEntriesMap.get(entryKey);
          const entryHours = Number(hours) || 0;
          
          if (existingEntryId && !processedEntryKeys.has(entryKey)) {
            // Update existing entry - mark as half-day but keep work data
            await db.executeQuery(
              `UPDATE timesheet_entries 
               SET hours = ?, task_description = ?, is_holiday = 0, is_leave = 0, is_halfday = 1, updated_at = NOW()
               WHERE id = ?`,
              [entryHours, taskDescription || '', existingEntryId]
            );
            processedEntryKeys.add(entryKey);
            console.log(`      ✅ Updated work entry ${pIndex} for date ${currentDate}, project ${projectId} (is_halfday=1)`);
          } else if (!processedEntryKeys.has(entryKey)) {
            // Create new entry - mark as half-day but keep work data
            const entryId = uuidv4();
            await db.executeQuery(
              `INSERT INTO timesheet_entries (
                id, timesheet_id, project_id, entry_date, hours, task_description,
                is_holiday, is_leave, is_halfday, is_weekend, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [entryId, id, projectId, currentDate, entryHours, taskDescription || '', 0, 0, 1, 0]
            );
            processedEntryKeys.add(entryKey);
            console.log(`      ✅ Created work entry ${pIndex} for date ${currentDate}, project ${projectId} (is_halfday=1)`);
          }
        }
      } else {
        // Working day: save project entries exactly as received from frontend
        // IMPORTANT: Use the date from the current dayEntry, not from any previous iteration
        const currentDate = date; // Store date in local variable to ensure it's not overwritten
        if (projectEntries && Array.isArray(projectEntries) && projectEntries.length > 0) {
          console.log(`    📝 Processing ${projectEntries.length} project entry/entries for date ${currentDate}`);
          for (let pIndex = 0; pIndex < projectEntries.length; pIndex++) {
            const projectEntry = projectEntries[pIndex];
            // Extract fields explicitly to prevent any reference issues
            const projectId = projectEntry?.projectId;
            const hours = projectEntry?.hours;
            const taskDescription = projectEntry?.taskDescription;
            
            console.log(`      📌 Project entry ${pIndex}/${projectEntries.length} (0-indexed) for date ${currentDate}: projectId=${projectId}, hours=${hours}`);
            
            if (!projectId) {
              console.warn(`⚠️  Skipping project entry at index ${pIndex} with missing projectId for date ${currentDate}`);
              continue;
            }
            
            // Update existing or create new entry
            // CRITICAL: Use currentDate (from current dayEntry) not date (which might be from previous iteration)
            const entryKey = `${currentDate}_${projectId}`;
            const existingEntryId = existingEntriesMap.get(entryKey);
            const entryHours = Number(hours) || 0;
            
            if (existingEntryId && !processedEntryKeys.has(entryKey)) {
              // Update existing entry
              await db.executeQuery(
                `UPDATE timesheet_entries 
                 SET hours = ?, task_description = ?, is_holiday = 0, is_leave = 0, updated_at = NOW()
                 WHERE id = ?`,
                [entryHours, taskDescription || '', existingEntryId]
              );
              processedEntryKeys.add(entryKey);
              console.log(`      ✅ Updated working entry: date=${currentDate}, projectId=${projectId}, hours=${entryHours}`);
            } else if (!processedEntryKeys.has(entryKey)) {
              // Create new entry
              const entryId = uuidv4();
              await db.executeQuery(
                `INSERT INTO timesheet_entries (
                  id, timesheet_id, project_id, entry_date, hours, task_description,
                  is_holiday, is_leave, is_weekend, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [entryId, id, projectId, currentDate, entryHours, taskDescription || '', 0, 0, 0]
              );
              processedEntryKeys.add(entryKey);
              console.log(`      ✅ Created working entry: date=${currentDate}, projectId=${projectId}, hours=${entryHours}, entryId=${entryId}`);
            }
          }
        } else {
          console.log(`    ⚠️  No project entries for working day ${currentDate} (projectEntries is ${projectEntries ? 'empty array' : 'missing'})`);
        }
      }
    }
    
    // Delete entries that are no longer in the new data
    const entriesToDelete = existingEntries.filter(existing => {
      const key = `${existing.entry_date}_${existing.project_id}`;
      return !processedEntryKeys.has(key);
    });
    
    if (entriesToDelete.length > 0) {
      const deleteIds = entriesToDelete.map(e => e.id);
      await db.executeQuery(
        `DELETE FROM timesheet_entries WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
        deleteIds
      );
      console.log(`🗑️  Deleted ${entriesToDelete.length} obsolete entry/entries`);
    }
    
    console.log(`✅ Finished processing all ${dailyEntries.length} daily entries`);
    
    // Verification: Query what was actually saved to verify correctness
    const savedEntries = await db.executeQuery(
      `SELECT entry_date, project_id, hours, task_description, is_holiday, is_leave 
       FROM timesheet_entries 
       WHERE timesheet_id = ? 
       ORDER BY entry_date, project_id`,
      [id]
    );
    console.log(`🔍 Verification: Saved ${savedEntries.length} entries to database:`);
    savedEntries.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. Date: ${entry.entry_date}, Project: ${entry.project_id}, Hours: ${entry.hours}, Holiday: ${entry.is_holiday}, Leave: ${entry.is_leave}`);
    });
    
    // STEP 3: Update timesheet with values exactly as received from frontend - no calculations
    const finalTotalHours = Number(totalHours) || 0;
    const finalTotalWorkingDays = Number(totalWorkingDays) || 0;
    const finalTotalHolidays = Number(totalHolidays) || 0;
    const finalTotalLeaves = Number(totalLeaves) || 0;
    
    console.log(`📊 Saving totals exactly as received from frontend (no calculations):`);
    console.log(`   - Total Hours: ${finalTotalHours}`);
    console.log(`   - Total Working Days: ${finalTotalWorkingDays}`);
    console.log(`   - Total Holidays: ${finalTotalHolidays}`);
    console.log(`   - Total Leaves: ${finalTotalLeaves}`);
    
    await db.executeQuery(
      `UPDATE timesheets 
       SET status = ?, 
           submitted_at = NOW(), 
           total_hours = ?,
           total_working_days = ?,
           total_holidays = ?,
           total_leaves = ?
       WHERE id = ?`,
      ['submitted', finalTotalHours, finalTotalWorkingDays, finalTotalHolidays, finalTotalLeaves, id]
    );
    
    console.log(`✅ Timesheet submitted with values saved exactly as received from frontend`);
    
    // Get project summary from entries (only working entries, exclude holidays/leaves)
    // Include half-day work entries (is_halfday = 1 but is_leave = 0)
    // Check if is_halfday column exists first
    let entriesQuery = `
      SELECT 
        te.project_id,
        p.project_manager_id,
        SUM(te.hours) as total_hours
      FROM timesheet_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE te.timesheet_id = ?
        AND te.is_holiday = 0
        AND te.is_leave = 0
        AND te.hours > 0
      GROUP BY te.project_id, p.project_manager_id
    `;
    
    // Try to use is_halfday column if it exists
    try {
      const columnCheck = await db.executeQuery(
        `SELECT COUNT(*) as count 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'timesheet_entries' 
         AND COLUMN_NAME = 'is_halfday'`
      );
      
      if (columnCheck && columnCheck[0] && columnCheck[0].count > 0) {
        entriesQuery = `
          SELECT 
            te.project_id,
            p.project_manager_id,
            SUM(te.hours) as total_hours
          FROM timesheet_entries te
          JOIN projects p ON te.project_id = p.id
          WHERE te.timesheet_id = ?
            AND te.is_holiday = 0
            AND (te.is_leave = 0 OR (te.is_halfday = 1 AND te.is_leave = 0))
            AND te.hours > 0
          GROUP BY te.project_id, p.project_manager_id
        `;
      }
    } catch (checkError) {
      console.warn('⚠️ Could not check for is_halfday column, using fallback query:', checkError.message);
    }
    
    const projectSummary = await db.executeQuery(entriesQuery, [id]);
    console.log(`📊 Project summary: ${projectSummary.length} project(s) with working hours`);
    projectSummary.forEach(summary => {
      console.log(`   - Project ${summary.project_id}: ${summary.total_hours} hours`);
    });
    
    // --- FIX: Delete existing pending approvals for this timesheet before creating new ones ---
    // This prevents duplicate approvals if timesheet is submitted multiple times
    const deleteExistingApprovals = await db.executeQuery(
      'DELETE FROM approvals WHERE timesheet_id = ? AND status = ?',
      [id, 'pending']
    );
    if (deleteExistingApprovals.affectedRows > 0) {
      console.log(`🗑️  Deleted ${deleteExistingApprovals.affectedRows} existing pending approval(s) before creating new ones`);
    }
    
    let approvalsCreated = 0;
    
    for (const summary of projectSummary) {
      // Don't create approvals for 0-hour entries (like leave placeholders)
      if (Number(summary.total_hours) > 0) {
          // Check if project has a project manager assigned
          if (!summary.project_manager_id) {
            console.warn(`  ⚠️  Skipping approval for project ${summary.project_id} - No project manager assigned`);
            continue;
          }
          
          // Check if approval already exists (non-pending status like approved/rejected should remain)
          const [existingApproval] = await db.executeQuery(
            'SELECT id FROM approvals WHERE timesheet_id = ? AND project_id = ? AND project_manager_id = ?',
            [id, summary.project_id, summary.project_manager_id]
          );
          
          if (existingApproval && existingApproval.id) {
            // Update existing approval to pending (resets approved/rejected approvals for resubmission)
            // This ensures managers review the updated timesheet data
            console.log(`  🔄 Updating existing approval ${existingApproval.id} to pending status (resubmission)`);
            await db.executeQuery(
              `UPDATE approvals 
               SET status = 'pending', total_hours = ?, updated_at = NOW()
               WHERE id = ?`,
              [summary.total_hours, existingApproval.id]
            );
            approvalsCreated++;
          } else {
            // Create new approval
            const approvalId = uuidv4();
            console.log(`  ✅ Creating approval for project ${summary.project_id}, PM: ${summary.project_manager_id}, Hours: ${summary.total_hours}`);
            
            await db.executeQuery(
              `INSERT INTO approvals (id, timesheet_id, project_id, project_manager_id, total_hours, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
              [approvalId, id, summary.project_id, summary.project_manager_id, summary.total_hours]
            );
            approvalsCreated++;
          }
      } else {
          console.log(`  ⏭️  Skipping approval for project ${summary.project_id} (0 hours)`);
      }
    }
    
    console.log(`✅ Timesheet submitted: ${timesheet.timesheet_code}, Created ${approvalsCreated} approval(s)`);
    
    // Return response immediately for better UX
    res.json({
      success: true,
      message: 'Timesheet submitted for approval',
      approvalsCreated: projectSummary.filter(s => Number(s.total_hours) > 0).length // Only count real approvals
    });
    
    // Send email notifications in background (non-blocking)
    // This doesn't delay the response to the user
    setImmediate(async () => {
    try {
        // Get employee details including direct manager
      const [employee] = await db.executeQuery(
          `SELECT u.id, u.name, u.email, u.manager_id,
                  manager.name as managerName, manager.email as managerEmail
           FROM users u
           LEFT JOIN users manager ON u.manager_id = manager.id
           WHERE u.id = ?`,
        [timesheet.user_id]
      );
        
        if (!employee) {
          console.warn('⚠️  Employee not found, skipping email notifications');
          return;
        }
      
      // Get month name for better email readability
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[timesheet.month - 1];
      const weekPeriod = `${monthName} ${timesheet.year}`;
        
        // Track sent emails to avoid duplicates
        const sentEmails = new Set();
      
      // Send email to each project manager
      for (const summary of projectSummary) {
        if (Number(summary.total_hours) > 0) {
          // Get project and manager details
          const [projectDetails] = await db.executeQuery(
            `SELECT p.name as projectName, u.name as managerName, u.email as managerEmail
             FROM projects p
             JOIN users u ON p.project_manager_id = u.id
             WHERE p.id = ?`,
            [summary.project_id]
          );
          
            if (projectDetails && projectDetails.managerEmail) {
              // Avoid sending duplicate emails to the same manager
              if (!sentEmails.has(projectDetails.managerEmail)) {
                console.log(`📧 Sending submission email to project manager: ${projectDetails.managerEmail} (${projectDetails.managerName})`);
                try {
            await emailService.sendTimesheetSubmittedEmail({
              employeeName: employee.name,
              employeeEmail: employee.email,
              projectName: projectDetails.projectName,
              weekStart: weekPeriod,
              weekEnd: weekPeriod,
              managerEmail: projectDetails.managerEmail,
              managerName: projectDetails.managerName,
            });
                  sentEmails.add(projectDetails.managerEmail);
                  console.log(`✅ Email sent to project manager: ${projectDetails.managerEmail}`);
                } catch (emailErr) {
                  console.error(`❌ Failed to send email to project manager ${projectDetails.managerEmail}:`, emailErr.message);
                }
              } else {
                console.log(`⏭️  Skipping duplicate email to project manager: ${projectDetails.managerEmail}`);
              }
            } else {
              console.warn(`⚠️  Project ${summary.project_id} has no manager assigned or manager email missing`);
            }
          }
        }
        
        // Send email to employee's direct manager (if different from project managers)
        if (employee.manager_id && employee.managerEmail && !sentEmails.has(employee.managerEmail)) {
          console.log(`📧 Sending submission email to direct manager: ${employee.managerEmail} (${employee.managerName})`);
          try {
            await emailService.sendTimesheetSubmittedEmail({
              employeeName: employee.name,
              employeeEmail: employee.email,
              projectName: 'All Projects', // General notification for direct manager
              weekStart: weekPeriod,
              weekEnd: weekPeriod,
              managerEmail: employee.managerEmail,
              managerName: employee.managerName,
            });
            sentEmails.add(employee.managerEmail);
            console.log(`✅ Email sent to direct manager: ${employee.managerEmail}`);
          } catch (emailErr) {
            console.error(`❌ Failed to send email to direct manager ${employee.managerEmail}:`, emailErr.message);
          }
        } else if (employee.manager_id && !employee.managerEmail) {
          console.warn(`⚠️  Employee has a direct manager (ID: ${employee.manager_id}) but manager email is missing`);
        }
        
        if (sentEmails.size === 0) {
          console.warn('⚠️  No email notifications sent - no managers found or emails missing');
        } else {
          console.log(`✅ Sent ${sentEmails.size} email notification(s) to manager(s)`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails
        console.error('⚠️  Email notification error:', emailError);
        console.warn('⚠️  Email notification failed, but timesheet submission succeeded');
    }
    });
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Resubmit rejected timesheet (reset to draft)
exports.resubmitTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get authenticated user ID from middleware
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in again.'
      });
    }
    
    // Fetch timesheet and verify it exists
    const [timesheet] = await db.executeQuery('SELECT * FROM timesheets WHERE id = ?', [id]);
    
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    // Verify the timesheet belongs to the logged-in user
    if (timesheet.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only resubmit your own timesheets'
      });
    }
    
    // Verify the status is 'rejected'
    const rawStatus = timesheet.status;
    const currentStatus = (rawStatus && rawStatus.trim() !== '') ? rawStatus.trim().toLowerCase() : 'draft';
    
    if (currentStatus !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: `Timesheet cannot be resubmitted. Current status: "${rawStatus || 'NULL/EMPTY'}". Only rejected timesheets can be resubmitted.`
      });
    }
    
    console.log(`🔄 Resubmitting timesheet ${id} (${timesheet.timesheet_code}) - Resetting to draft`);
    
    // Reset timesheet status to draft and clear submitted_at
    await db.executeQuery(
      'UPDATE timesheets SET status = ?, submitted_at = NULL WHERE id = ?',
      ['draft', id]
    );
    
    // Delete all approval records for this timesheet
    await db.executeQuery(
      'DELETE FROM approvals WHERE timesheet_id = ?',
      [id]
    );
    
    // Fetch updated timesheet
    const [updated] = await db.executeQuery('SELECT * FROM timesheets WHERE id = ?', [id]);
    
    console.log(`✅ Timesheet ${id} reset to draft status. Ready for resubmission.`);
    
    res.json({
      success: true,
      message: 'Timesheet reset to draft. You can now edit and submit again.',
      data: updated
    });
  } catch (error) {
    console.error('Error resubmitting timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get timesheet entries
exports.getTimesheetEntries = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    
    // Get timesheet to filter entries by month/year
    const [timesheet] = await db.executeQuery('SELECT year, month FROM timesheets WHERE id = ?', [timesheetId]);
    
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    // Backend returns ALL entries exactly as stored - no duplicate filtering, no selection logic
    // Frontend is responsible for managing entries and handling duplicates
    // Normalize leaveType to 'half-day' format for consistency
    const hasIsHalfdayColumn = await checkIsHalfdayColumnExists();
    
    let query;
    if (hasIsHalfdayColumn) {
      query = `
        SELECT 
          te.id,
          te.timesheet_id as timesheetId,
          te.project_id as projectId,
          p.name as projectName,
          p.project_code as projectCode,
          p.client_id as clientId, 
          DATE_FORMAT(te.entry_date, '%Y-%m-%d') as entryDate, 
          te.hours,
          te.task_description as taskDescription,
          te.is_holiday as isHoliday,
          te.is_leave as isLeave,
          te.is_leave as isOnLeave,
          CASE 
            WHEN te.is_halfday = 1 THEN 'half-day'
            WHEN te.leave_type = 'halfday' THEN 'half-day'
            WHEN te.leave_type = 'half-day' THEN 'half-day'
            WHEN te.leave_type = 'full-day' THEN 'full-day'
            WHEN te.leave_type = 'fullday' THEN 'full-day'
            ELSE te.leave_type
          END as leaveType,
          te.is_halfday as is_halfday,
          te.is_halfday as isHalfday,
          te.is_weekend as isWeekend,
          te.created_at as createdAt,
          COALESCE(te.updated_at, te.created_at) as lastModified
        FROM timesheet_entries te
        JOIN projects p ON te.project_id = p.id
        WHERE te.timesheet_id = ?
          AND YEAR(DATE(te.entry_date)) = ?
          AND MONTH(DATE(te.entry_date)) = ?
        ORDER BY te.entry_date, COALESCE(te.updated_at, te.created_at) DESC, te.id DESC
      `;
    } else {
      query = `
        SELECT 
          te.id,
          te.timesheet_id as timesheetId,
          te.project_id as projectId,
          p.name as projectName,
          p.project_code as projectCode,
          p.client_id as clientId, 
          DATE_FORMAT(te.entry_date, '%Y-%m-%d') as entryDate, 
          te.hours,
          te.task_description as taskDescription,
          te.is_holiday as isHoliday,
          te.is_leave as isLeave,
          te.is_leave as isOnLeave,
          CASE 
            WHEN te.leave_type = 'halfday' THEN 'half-day'
            WHEN te.leave_type = 'half-day' THEN 'half-day'
            WHEN te.leave_type = 'full-day' THEN 'full-day'
            WHEN te.leave_type = 'fullday' THEN 'full-day'
            ELSE te.leave_type
          END as leaveType,
          0 as is_halfday,
          0 as isHalfday,
          te.is_weekend as isWeekend,
          te.created_at as createdAt,
          COALESCE(te.updated_at, te.created_at) as lastModified
        FROM timesheet_entries te
        JOIN projects p ON te.project_id = p.id
        WHERE te.timesheet_id = ?
          AND YEAR(DATE(te.entry_date)) = ?
          AND MONTH(DATE(te.entry_date)) = ?
        ORDER BY te.entry_date, COALESCE(te.updated_at, te.created_at) DESC, te.id DESC
      `;
    }
    
    console.log(`🔍 Fetching entries for timesheet ${timesheetId} (${timesheet.year}-${timesheet.month})`);
    
    let entries;
    try {
      entries = await db.executeQuery(query, [
        timesheetId, 
        timesheet.year, 
        timesheet.month
      ]);
    } catch (queryError) {
      console.error('❌ Database query error:', queryError);
      console.error('❌ Query:', query);
      console.error('❌ Parameters:', [timesheetId, timesheet.year, timesheet.month, timesheet.year, timesheet.month]);
      console.error('❌ Error stack:', queryError.stack);
      return res.status(500).json({
        success: false,
        error: `Database query failed: ${queryError.message}`,
        details: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
      });
    }
    
    // Ensure entries is an array
    if (!Array.isArray(entries)) {
      console.error(`❌ ERROR: entries is not an array:`, typeof entries, entries);
      return res.status(500).json({
        success: false,
        error: 'Invalid response from database'
      });
    }
    
    console.log(`✅ Retrieved ${entries.length} entries from database`);
    
    // Log warning if there are entries outside the timesheet's month
    try {
      const [outOfMonthCheck] = await db.executeQuery(
        `SELECT COUNT(*) as count, SUM(hours) as hours
        FROM timesheet_entries 
        WHERE timesheet_id = ?
          AND (YEAR(DATE(entry_date)) != ? OR MONTH(DATE(entry_date)) != ?)`,
        [timesheetId, timesheet.year, timesheet.month]
      );
      
      if (outOfMonthCheck && outOfMonthCheck.count > 0) {
        console.warn(`⚠️  Found ${outOfMonthCheck.count} entries (${outOfMonthCheck.hours}h) outside timesheet month ${timesheet.year}-${timesheet.month} for timesheet ${timesheetId} - these are excluded from results`);
      }
    } catch (checkError) {
      // Non-critical error, just log it
      console.warn('⚠️  Could not check for out-of-month entries:', checkError.message);
    }
    
    // Additional validation: Filter out any entries that somehow passed the query but are still out of month
    // Also verify timesheet_id matches (defense in depth)
    const validEntries = entries.filter(entry => {
      try {
        // First check: Verify timesheet_id matches
        if (entry.timesheetId !== timesheetId) {
          console.warn(`⚠️  Filtering out entry ${entry.id} - timesheet_id mismatch: ${entry.timesheetId} != ${timesheetId}`);
          return false;
        }
        
        if (!entry.entryDate) {
          console.warn(`⚠️  Entry ${entry.id} has no entryDate`);
          return false;
        }
        
        // Parse the date - DATE() function returns YYYY-MM-DD format
        // CRITICAL: Use local date methods, not ISO string (which converts to UTC and can change the date)
        let dateStr = entry.entryDate;
        if (dateStr instanceof Date) {
          // Use local date methods to preserve the actual date (not UTC conversion)
          const year = dateStr.getFullYear();
          const month = String(dateStr.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
          const day = String(dateStr.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else if (typeof dateStr === 'string') {
          // Extract just the date part (YYYY-MM-DD)
          // Handle both ISO format (2025-12-01T00:00:00.000Z) and plain string (2025-12-01)
          dateStr = dateStr.split('T')[0].split(' ')[0];
        }
        
        // Parse YYYY-MM-DD format
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) {
          console.warn(`⚠️  Invalid date format for entry ${entry.id}: ${entry.entryDate} (parsed as: ${dateStr})`);
          return false;
        }
        
        const entryYear = parseInt(dateParts[0], 10);
        const entryMonth = parseInt(dateParts[1], 10);
        
        if (isNaN(entryYear) || isNaN(entryMonth)) {
          console.warn(`⚠️  Invalid date values for entry ${entry.id}: ${entry.entryDate}`);
          return false;
        }
        
        if (entryYear !== timesheet.year || entryMonth !== timesheet.month) {
          console.warn(`⚠️  Filtering out entry ${entry.id} with date ${entry.entryDate} (${entryYear}-${entryMonth}) - not in timesheet month ${timesheet.year}-${timesheet.month}`);
          return false;
        }
        
        // Normalize entryDate to YYYY-MM-DD format for frontend compatibility
        entry.entryDate = dateStr;
        
        return true;
      } catch (err) {
        console.error(`❌ Error processing entry ${entry.id}:`, err.message);
        return false;
      }
    });
    
    if (validEntries.length !== entries.length) {
      console.warn(`⚠️  Filtered ${entries.length - validEntries.length} invalid entries from results`);
    }
    
    // Deduplicate entries: Keep only the latest entry per date+project combination
    // Since entries are ordered by date, then by lastModified DESC, the first entry we see for each date+project is the most recent
    const uniqueEntriesMap = new Map(); // Key: `${entryDate}_${projectId}`, Value: entry object
    
      validEntries.forEach(entry => {
      const key = `${entry.entryDate}_${entry.projectId}`;
      
      if (!uniqueEntriesMap.has(key)) {
        // First entry for this date+project (and it's the most recent due to ORDER BY), add it
        uniqueEntriesMap.set(key, entry);
        } else {
        // Duplicate found - since entries are ordered by lastModified DESC, the first one we saw is the most recent
        // Skip this duplicate entry
        const existing = uniqueEntriesMap.get(key);
        console.log(`🔄 Deduplicated: Skipping duplicate entry ${entry.id} for ${entry.entryDate}, project ${entry.projectId}. Keeping ${existing.id}`);
      }
    });
    
    const uniqueEntries = Array.from(uniqueEntriesMap.values());
    
    if (uniqueEntries.length !== validEntries.length) {
      console.log(`✅ Deduplicated ${validEntries.length} entries down to ${uniqueEntries.length} unique entries`);
    }
    
    console.log(`✅ Returning ${uniqueEntries.length} unique entries`);
    
    res.json({
      success: true,
      count: uniqueEntries.length,
      data: uniqueEntries
    });
  } catch (error) {
    console.error('❌ Error fetching timesheet entries:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Timesheet ID:', req.params?.timesheetId);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch timesheet entries',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Add timesheet entry
exports.addTimesheetEntry = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    // Accept both isLeave and isOnLeave for compatibility
    // Accept totalHours from frontend - backend will save it as-is without calculation
    const { projectId, entryDate, hours, taskDescription, isHoliday, isLeave, isOnLeave, isWeekend, totalHours, leaveType } = req.body;
    
    // Check if is_halfday column exists once at the start of the function
    const hasIsHalfdayColumn = await checkIsHalfdayColumnExists();
    
    console.log(`📝 addTimesheetEntry called:`, {
      timesheetId,
      projectId,
      entryDate,
      hours,
      taskDescription,
      isHoliday,
      isLeave,
      isOnLeave,
      isWeekend
    });
    
    // Get timesheet to validate entry date is within the timesheet's month
    const [timesheet] = await db.executeQuery('SELECT year, month FROM timesheets WHERE id = ?', [timesheetId]);
    
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    // Use isOnLeave if provided, otherwise fall back to isLeave
    const isLeaveValue = isOnLeave !== undefined ? isOnLeave : (isLeave || false);
    
    // Normalize entryDate to ensure consistent format (YYYY-MM-DD)
    // Handle both date strings and Date objects
    // CRITICAL: Use local date methods, not ISO string (which converts to UTC and can change the date)
    let normalizedDate = entryDate;
    if (entryDate instanceof Date) {
      // Use local date methods to preserve the actual date (not UTC conversion)
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
      const day = String(entryDate.getDate()).padStart(2, '0');
      normalizedDate = `${year}-${month}-${day}`;
    } else if (typeof entryDate === 'string') {
      // Extract just the date part if it includes time (e.g., "2025-12-01T00:00:00.000Z" -> "2025-12-01")
      normalizedDate = entryDate.split('T')[0].split(' ')[0];
    }
    
    // Validate that entry date is within the timesheet's month/year
    // Parse the date string directly to avoid timezone issues
    const dateParts = normalizedDate.split('-');
    if (dateParts.length !== 3) {
      return res.status(400).json({
        success: false,
        error: `Invalid date format: ${normalizedDate}. Expected YYYY-MM-DD.`
      });
    }
    
    const entryYear = parseInt(dateParts[0], 10);
    const entryMonth = parseInt(dateParts[1], 10);
    
    if (entryYear !== timesheet.year || entryMonth !== timesheet.month) {
      return res.status(400).json({
        success: false,
        error: `Entry date ${normalizedDate} is outside the timesheet's month (${timesheet.year}-${String(timesheet.month).padStart(2, '0')}). Entries can only be added for the timesheet's month.`
      });
    }
    
    // Extract is_halfday from request body (numeric flag: 0 or 1)
    const isHalfday = req.body.is_halfday !== undefined ? Number(req.body.is_halfday) : (req.body.isHalfday !== undefined ? Number(req.body.isHalfday) : 0);
    
    // VALIDATION: If is_halfday = 1, work hours cannot exceed 6 hours
    if (isHalfday === 1) {
      const workHours = Number(hours) || 0;
      if (workHours > 6) {
        return res.status(400).json({
          success: false,
          error: `Half-day leave work hours cannot exceed 6 hours. Current value: ${workHours} hours.`
        });
      }
    }
    
    // Always create a new entry - allow multiple entries for the same project on the same date
    // The frontend uses updateTimesheetEntry endpoint when updating existing entries
    const entryId = uuidv4();
    
    if (hasIsHalfdayColumn) {
      await db.executeQuery(
        `INSERT INTO timesheet_entries (
          id, timesheet_id, project_id, entry_date, hours, task_description,
          is_holiday, is_leave, leave_type, is_halfday, is_weekend
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entryId, timesheetId, projectId, normalizedDate, hours, taskDescription,
         isHoliday || false, isLeaveValue, leaveType || null, isHalfday, isWeekend || false]
      );
    } else {
      await db.executeQuery(
        `INSERT INTO timesheet_entries (
          id, timesheet_id, project_id, entry_date, hours, task_description,
          is_holiday, is_leave, leave_type, is_weekend
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entryId, timesheetId, projectId, normalizedDate, hours, taskDescription,
         isHoliday || false, isLeaveValue, leaveType || null, isWeekend || false]
      );
    }
    console.log(`✅ Created new entry: ${entryId} for timesheet ${timesheetId}, date ${normalizedDate}, project ${projectId}`);
    
    // Update timesheet totalHours - accept value directly from frontend without calculation
    // Frontend calculates and sends totalHours, backend saves it as-is
    if (totalHours !== undefined && totalHours !== null) {
      // Validate that totalHours is a valid number
      const totalHoursValue = Number(totalHours);
      if (isNaN(totalHoursValue) || totalHoursValue < 0) {
        console.error(`❌ Invalid totalHours received from frontend: ${totalHours}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid totalHours value'
        });
      }
      
      // Save totalHours directly from frontend without any calculation
    await db.executeQuery(
      `UPDATE timesheets 
         SET total_hours = ? 
       WHERE id = ?`,
        [totalHoursValue, timesheetId]
    );
      
      console.log(`✅ Updated timesheet totalHours to ${totalHoursValue} (received from frontend)`);
    }
    
    // Fetch saved entry with proper field mapping for API response
    let savedEntryQuery;
    if (hasIsHalfdayColumn) {
      savedEntryQuery = `
        SELECT 
          te.id,
          te.timesheet_id as timesheetId,
          te.project_id as projectId,
          DATE_FORMAT(te.entry_date, '%Y-%m-%d') as entryDate,
          te.hours,
          te.task_description as taskDescription,
          te.is_holiday as isHoliday,
          te.is_leave as isLeave,
          te.is_leave as isOnLeave,
          CASE 
            WHEN te.is_halfday = 1 THEN 'half-day'
            WHEN te.leave_type = 'halfday' THEN 'half-day'
            WHEN te.leave_type = 'half-day' THEN 'half-day'
            WHEN te.leave_type = 'full-day' THEN 'full-day'
            WHEN te.leave_type = 'fullday' THEN 'full-day'
            ELSE te.leave_type
          END as leaveType,
          te.is_halfday as is_halfday,
          te.is_halfday as isHalfday,
          te.is_weekend as isWeekend,
          te.created_at as createdAt,
          te.updated_at as updatedAt
        FROM timesheet_entries te
        WHERE te.id = ?
      `;
    } else {
      savedEntryQuery = `
        SELECT 
          te.id,
          te.timesheet_id as timesheetId,
          te.project_id as projectId,
          DATE_FORMAT(te.entry_date, '%Y-%m-%d') as entryDate,
          te.hours,
          te.task_description as taskDescription,
          te.is_holiday as isHoliday,
          te.is_leave as isLeave,
          te.is_leave as isOnLeave,
          CASE 
            WHEN te.leave_type = 'halfday' THEN 'half-day'
            WHEN te.leave_type = 'half-day' THEN 'half-day'
            WHEN te.leave_type = 'full-day' THEN 'full-day'
            WHEN te.leave_type = 'fullday' THEN 'full-day'
            ELSE te.leave_type
          END as leaveType,
          0 as is_halfday,
          0 as isHalfday,
          te.is_weekend as isWeekend,
          te.created_at as createdAt,
          te.updated_at as updatedAt
        FROM timesheet_entries te
        WHERE te.id = ?
      `;
    }
    
    const [savedEntry] = await db.executeQuery(savedEntryQuery, [entryId]);
    
    if (!savedEntry || !savedEntry.id) {
      console.error(`❌ ERROR: Failed to retrieve saved entry with id ${entryId}`);
      return res.status(500).json({
        success: false,
        error: 'Entry was saved but could not be retrieved'
      });
    }
    
    console.log(`✅ Entry saved successfully:`, {
      id: savedEntry.id,
      timesheetId: savedEntry.timesheetId,
      projectId: savedEntry.projectId,
      entryDate: savedEntry.entryDate,
      hours: savedEntry.hours,
      is_halfday: savedEntry.is_halfday,
      isHalfday: savedEntry.isHalfday,
      leaveType: savedEntry.leaveType
    });
    
    res.status(200).json({
      success: true,
      message: 'Timesheet entry added successfully',
      data: savedEntry
    });
  } catch (error) {
    console.error('❌ Error saving timesheet entry:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to save timesheet entry'
    });
  }
};

// Update timesheet entry
exports.updateTimesheetEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const updates = req.body;
    
    // --- FIX: Convert camelCase keys from payload to snake_case for DB ---
    // Accept totalHours from frontend - backend will save it as-is without calculation
    const allowedFields = ['project_id', 'entry_date', 'hours', 'task_description', 'is_holiday', 'is_leave', 'leave_type', 'is_halfday', 'is_weekend'];
    const dbUpdates = {};
    
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.entryDate !== undefined) dbUpdates.entry_date = updates.entryDate;
    if (updates.hours !== undefined) dbUpdates.hours = updates.hours;
    if (updates.taskDescription !== undefined) dbUpdates.task_description = updates.taskDescription;
    if (updates.isHoliday !== undefined) dbUpdates.is_holiday = updates.isHoliday;
    // Accept both isLeave and isOnLeave for compatibility
    if (updates.isOnLeave !== undefined) dbUpdates.is_leave = updates.isOnLeave;
    else if (updates.isLeave !== undefined) dbUpdates.is_leave = updates.isLeave;
    if (updates.leaveType !== undefined) dbUpdates.leave_type = updates.leaveType;
    // Handle is_halfday (accept both snake_case and camelCase) - only if column exists
    if (hasIsHalfdayColumn) {
      if (updates.is_halfday !== undefined) dbUpdates.is_halfday = Number(updates.is_halfday);
      else if (updates.isHalfday !== undefined) dbUpdates.is_halfday = Number(updates.isHalfday);
    }
    if (updates.isWeekend !== undefined) dbUpdates.is_weekend = updates.isWeekend;
    
    // VALIDATION: If is_halfday = 1, work hours cannot exceed 6 hours
    if (hasIsHalfdayColumn && dbUpdates.is_halfday === 1 && dbUpdates.hours !== undefined) {
      const workHours = Number(dbUpdates.hours);
      if (workHours > 6) {
        return res.status(400).json({
          success: false,
          error: `Half-day leave work hours cannot exceed 6 hours. Current value: ${workHours} hours.`
        });
      }
    }
    
    // Extract totalHours from request body (frontend sends it)
    const totalHours = updates.totalHours;
    
    const updateFields = Object.keys(dbUpdates);
    const updateValues = Object.values(dbUpdates);
    // --- End Fix ---
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    updateValues.push(entryId);
    
    // Get the entry first to get timesheet_id for totalHours update
    const [currentEntry] = await db.executeQuery('SELECT timesheet_id FROM timesheet_entries WHERE id = ?', [entryId]);
    
    if (!currentEntry) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet entry not found'
      });
    }
    
    // Backend simply updates the entry as sent from frontend - no duplicate checking, no deletion, no modification
    // Frontend is responsible for managing entries and sending the correct data
    const query = `UPDATE timesheet_entries SET ${updateFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
    await db.executeQuery(query, updateValues);
    
    if (currentEntry) {
      // Update timesheet totalHours - accept value directly from frontend without calculation
      // Frontend calculates and sends totalHours, backend saves it as-is
      if (totalHours !== undefined && totalHours !== null) {
        // Validate that totalHours is a valid number
        const totalHoursValue = Number(totalHours);
        if (isNaN(totalHoursValue) || totalHoursValue < 0) {
          console.error(`❌ Invalid totalHours received from frontend: ${totalHours}`);
          return res.status(400).json({
            success: false,
            error: 'Invalid totalHours value'
          });
        }
        
        // Save totalHours directly from frontend without any calculation
      await db.executeQuery(
        `UPDATE timesheets 
           SET total_hours = ? 
         WHERE id = ?`,
          [totalHoursValue, currentEntry.timesheet_id]
      );
        
        console.log(`✅ Updated timesheet totalHours to ${totalHoursValue} (received from frontend)`);
      }
    }
    
    // Fetch updated entry with proper field mapping for API response
    let updatedEntryQuery;
    if (hasIsHalfdayColumn) {
      updatedEntryQuery = `
        SELECT 
          te.id,
          te.timesheet_id as timesheetId,
          te.project_id as projectId,
          DATE_FORMAT(te.entry_date, '%Y-%m-%d') as entryDate,
          te.hours,
          te.task_description as taskDescription,
          te.is_holiday as isHoliday,
          te.is_leave as isLeave,
          te.is_leave as isOnLeave,
          CASE 
            WHEN te.is_halfday = 1 THEN 'half-day'
            WHEN te.leave_type = 'halfday' THEN 'half-day'
            WHEN te.leave_type = 'half-day' THEN 'half-day'
            WHEN te.leave_type = 'full-day' THEN 'full-day'
            WHEN te.leave_type = 'fullday' THEN 'full-day'
            ELSE te.leave_type
          END as leaveType,
          te.is_halfday as is_halfday,
          te.is_halfday as isHalfday,
          te.is_weekend as isWeekend,
          te.created_at as createdAt,
          te.updated_at as updatedAt
        FROM timesheet_entries te
        WHERE te.id = ?
      `;
    } else {
      updatedEntryQuery = `
        SELECT 
          te.id,
          te.timesheet_id as timesheetId,
          te.project_id as projectId,
          DATE_FORMAT(te.entry_date, '%Y-%m-%d') as entryDate,
          te.hours,
          te.task_description as taskDescription,
          te.is_holiday as isHoliday,
          te.is_leave as isLeave,
          te.is_leave as isOnLeave,
          CASE 
            WHEN te.leave_type = 'halfday' THEN 'half-day'
            WHEN te.leave_type = 'half-day' THEN 'half-day'
            WHEN te.leave_type = 'full-day' THEN 'full-day'
            WHEN te.leave_type = 'fullday' THEN 'full-day'
            ELSE te.leave_type
          END as leaveType,
          0 as is_halfday,
          0 as isHalfday,
          te.is_weekend as isWeekend,
          te.created_at as createdAt,
          te.updated_at as updatedAt
        FROM timesheet_entries te
        WHERE te.id = ?
      `;
    }
    
    const [updated] = await db.executeQuery(updatedEntryQuery, [entryId]);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet entry not found'
      });
    }
    
    console.log('✅ Timesheet entry updated:', {
      id: updated.id,
      is_halfday: updated.is_halfday,
      isHalfday: updated.isHalfday,
      leaveType: updated.leaveType
    });
    
    res.json({
      success: true,
      message: 'Timesheet entry updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating timesheet entry:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete timesheet entry
exports.deleteTimesheetEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    
    const [entry] = await db.executeQuery('SELECT * FROM timesheet_entries WHERE id = ?', [entryId]);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet entry not found'
      });
    }
    
    const timesheetId = entry.timesheet_id;
    
    // Get timesheet info for month/year filtering
    const [timesheetInfo] = await db.executeQuery('SELECT year, month FROM timesheets WHERE id = ?', [timesheetId]);
    if (!timesheetInfo) {
      return res.status(404).json({ success: false, error: 'Timesheet not found' });
    }
    
    await db.executeQuery('DELETE FROM timesheet_entries WHERE id = ?', [entryId]);
    
    // Note: totalHours update is handled by frontend - backend does not recalculate
    // Frontend will send updated totalHours when needed
    
    console.log('🗑️ Timesheet entry deleted');
    
    res.json({
      success: true,
      message: 'Timesheet entry deleted successfully',
      data: entry
    });
  } catch (error) {
    console.error('Error deleting timesheet entry:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
    }
};

// Cleanup duplicate timesheet entries
// Removes all duplicate entries, keeping only the latest one for each timesheet_id + date + project_id combination
exports.cleanupDuplicateEntries = async (req, res) => {
  try {
    console.log('🧹 Starting cleanup of duplicate timesheet entries...');
    
    // Find all duplicate entries grouped by timesheet_id, date, and project_id
    const duplicatesQuery = `
      SELECT 
        timesheet_id,
        DATE(entry_date) as entry_date,
        project_id,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(id ORDER BY COALESCE(updated_at, created_at) DESC, id DESC) as entry_ids
      FROM timesheet_entries
      GROUP BY timesheet_id, DATE(entry_date), project_id
      HAVING COUNT(*) > 1
    `;
    
    const duplicateGroups = await db.executeQuery(duplicatesQuery);
    
    if (!duplicateGroups || duplicateGroups.length === 0) {
      console.log('✅ No duplicate entries found.');
      return res.status(200).json({
        success: true,
        message: 'No duplicate entries found',
        data: {
          duplicatesRemoved: 0,
          groupsProcessed: 0
        }
      });
    }
    
    let totalRemoved = 0;
    let groupsProcessed = 0;
    
    for (const group of duplicateGroups) {
      const entryIds = group.entry_ids.split(',');
      
      // Keep the first entry (latest by updated_at/id), delete the rest
      const entryToKeep = entryIds[0];
      const entriesToDelete = entryIds.slice(1);
      
      if (entriesToDelete.length > 0) {
        const deleteQuery = `DELETE FROM timesheet_entries WHERE id IN (${entriesToDelete.map(() => '?').join(',')})`;
        const deleteResult = await db.executeQuery(deleteQuery, entriesToDelete);
        totalRemoved += deleteResult.affectedRows || 0;
        groupsProcessed++;
        
        console.log(`🗑️  Removed ${deleteResult.affectedRows} duplicate(s) for timesheet ${group.timesheet_id}, date ${group.entry_date}, project ${group.project_id}. Kept entry: ${entryToKeep}`);
      }
    }
    
    console.log(`✅ Cleanup complete: Removed ${totalRemoved} duplicate entries from ${groupsProcessed} groups.`);
    
    res.status(200).json({
      success: true,
      message: `Cleanup complete: Removed ${totalRemoved} duplicate entries`,
      data: {
        duplicatesRemoved: totalRemoved,
        groupsProcessed: groupsProcessed
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up duplicate entries:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cleanup duplicate entries'
    });
  }
};

// Recalculate timesheet totals (for fixing existing timesheets)
exports.recalculateTimesheetTotals = async (req, res) => {
  try {
    const { id } = req.params;
    // Accept totalHours from frontend - backend will save it as-is without calculation
    const { totalHours } = req.body;
    
    // Get timesheet
    const [timesheet] = await db.executeQuery('SELECT id, year, month FROM timesheets WHERE id = ?', [id]);
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    console.log(`🔄 Updating totals for timesheet ${id} (${timesheet.year}-${timesheet.month})...`);
    
    // Validate totalHours is provided
    if (totalHours === undefined || totalHours === null) {
      return res.status(400).json({
        success: false,
        error: 'totalHours is required in request body'
      });
    }
    
    // Validate that totalHours is a valid number
    const totalHoursValue = Number(totalHours);
    if (isNaN(totalHoursValue) || totalHoursValue < 0) {
      console.error(`❌ Invalid totalHours received from frontend: ${totalHours}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid totalHours value'
      });
    }
    
    // Save totalHours directly from frontend without any calculation
    await db.executeQuery(
      `UPDATE timesheets 
       SET total_hours = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [totalHoursValue, id]
    );
    
    console.log(`✅ Updated timesheet totalHours to ${totalHoursValue} (received from frontend)`);
    
    res.json({
      success: true,
      message: 'Timesheet totalHours updated successfully',
      data: {
        timesheetId: id,
        totalHours: totalHoursValue
      }
    });
  } catch (error) {
    console.error('❌ Error recalculating timesheet totals:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recalculate timesheet totals'
    });
  }
};

/**
 * Get Employee Project-wise Time Analysis Report
 * Returns timesheet data grouped by employee and project for Manager/Admin users
 */
exports.getEmployeeTimeAnalysis = async (req, res) => {
  try {
    const { employeeIds, fromDate, toDate } = req.query;

    // Validate required parameters
    if (!employeeIds || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: employeeIds, fromDate, and toDate are required'
      });
    }

    // Parse employeeIds (can be comma-separated string or array)
    let employeeIdArray = [];
    if (Array.isArray(employeeIds)) {
      employeeIdArray = employeeIds;
    } else if (typeof employeeIds === 'string') {
      employeeIdArray = employeeIds.split(',').map(id => id.trim()).filter(id => id);
    }

    if (employeeIdArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one employee ID must be provided'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format'
      });
    }

    // Validate date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date values'
      });
    }

    if (from > to) {
      return res.status(400).json({
        success: false,
        error: 'fromDate must be less than or equal to toDate'
      });
    }

    console.log(`📊 Generating time analysis report for ${employeeIdArray.length} employee(s) from ${fromDate} to ${toDate}`);

    // Build the query to fetch timesheet entries with employee and project information
    // We'll group by employee and project, calculating totals
    const placeholders = employeeIdArray.map(() => '?').join(',');
    
    const query = `
      SELECT 
        u.id as employeeId,
        u.name as employeeName,
        u.employee_id as employeeCode,
        u.email as employeeEmail,
        p.id as projectId,
        p.name as projectName,
        p.project_code as projectCode,
        SUM(te.hours) as totalHours,
        COUNT(DISTINCT te.entry_date) as daysWorked,
        MIN(te.entry_date) as firstEntryDate,
        MAX(te.entry_date) as lastEntryDate
      FROM timesheet_entries te
      INNER JOIN timesheets t ON te.timesheet_id = t.id
      INNER JOIN users u ON t.user_id = u.id
      INNER JOIN projects p ON te.project_id = p.id
      WHERE u.id IN (${placeholders})
        AND te.entry_date >= ?
        AND te.entry_date <= ?
        AND te.is_holiday = FALSE
        AND te.is_leave = FALSE
      GROUP BY u.id, u.name, u.employee_id, u.email, p.id, p.name, p.project_code
      ORDER BY u.name, p.name
    `;

    const params = [...employeeIdArray, fromDate, toDate];
    const results = await db.executeQuery(query, params);

    // Also get total hours per employee (for validation)
    const totalHoursQuery = `
      SELECT 
        u.id as employeeId,
        u.name as employeeName,
        SUM(te.hours) as totalHours
      FROM timesheet_entries te
      INNER JOIN timesheets t ON te.timesheet_id = t.id
      INNER JOIN users u ON t.user_id = u.id
      WHERE u.id IN (${placeholders})
        AND te.entry_date >= ?
        AND te.entry_date <= ?
        AND te.is_holiday = FALSE
        AND te.is_leave = FALSE
      GROUP BY u.id, u.name
    `;

    const totalHoursResults = await db.executeQuery(totalHoursQuery, params);

    // Structure the data by employee
    const employeeMap = new Map();

    // Initialize employee entries with totals
    totalHoursResults.forEach(emp => {
      employeeMap.set(emp.employeeId, {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        employeeCode: null, // Will be filled from results
        employeeEmail: null, // Will be filled from results
        totalHours: parseFloat(emp.totalHours) || 0,
        projects: [],
        projectTotal: 0 // Sum of all project hours (for validation)
      });
    });

    // Add project-wise data
    results.forEach(row => {
      const employee = employeeMap.get(row.employeeId);
      if (employee) {
        // Set employee details if not already set
        if (!employee.employeeCode) {
          employee.employeeCode = row.employeeCode;
          employee.employeeEmail = row.employeeEmail;
        }

        const projectHours = parseFloat(row.totalHours) || 0;
        employee.projects.push({
          projectId: row.projectId,
          projectName: row.projectName,
          projectCode: row.projectCode,
          totalHours: projectHours,
          daysWorked: row.daysWorked,
          firstEntryDate: row.firstEntryDate,
          lastEntryDate: row.lastEntryDate
        });

        employee.projectTotal += projectHours;
      }
    });

    // Convert map to array and ensure all selected employees are included (even with no entries)
    const employeeIdSet = new Set(employeeIdArray);
    const reportData = [];

    // First, add employees with data
    employeeMap.forEach((employee, employeeId) => {
      // Round hours to 2 decimal places
      employee.totalHours = Math.round(employee.totalHours * 100) / 100;
      employee.projectTotal = Math.round(employee.projectTotal * 100) / 100;
      
      // Round project hours
      employee.projects.forEach(project => {
        project.totalHours = Math.round(project.totalHours * 100) / 100;
      });

      reportData.push(employee);
      employeeIdSet.delete(employeeId);
    });

    // Add employees with no entries in the date range
    if (employeeIdSet.size > 0) {
      const missingEmployeeIds = Array.from(employeeIdSet);
      const missingPlaceholders = missingEmployeeIds.map(() => '?').join(',');
      
      const missingEmployeesQuery = `
        SELECT 
          id as employeeId,
          name as employeeName,
          employee_id as employeeCode,
          email as employeeEmail
        FROM users
        WHERE id IN (${missingPlaceholders})
          AND is_active = TRUE
      `;

      const missingEmployees = await db.executeQuery(missingEmployeesQuery, missingEmployeeIds);
      
      missingEmployees.forEach(emp => {
        reportData.push({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          employeeCode: emp.employeeCode,
          employeeEmail: emp.employeeEmail,
          totalHours: 0,
          projects: [],
          projectTotal: 0
        });
      });
    }

    // Sort by employee name
    reportData.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    console.log(`✅ Generated report for ${reportData.length} employee(s) with ${results.length} project entries`);

    res.json({
      success: true,
      data: reportData,
      meta: {
        fromDate,
        toDate,
        employeeCount: reportData.length,
        totalEntries: results.length
      }
    });

  } catch (error) {
    console.error('❌ Error generating employee time analysis report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate employee time analysis report'
    });
  }
};

/**
 * Get Project Hours Analysis Report
 * Returns timesheet data grouped by project and employee for Manager/Admin users
 */
exports.getProjectHoursAnalysis = async (req, res) => {
  console.log('🔍 getProjectHoursAnalysis called with:', { projectIds: req.query.projectIds, fromDate: req.query.fromDate, toDate: req.query.toDate });
  try {
    const { projectIds, fromDate, toDate } = req.query;

    // Validate required parameters
    if (!projectIds || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: projectIds, fromDate, and toDate are required'
      });
    }

    // Parse projectIds (can be comma-separated string or array)
    let projectIdArray = [];
    if (Array.isArray(projectIds)) {
      projectIdArray = projectIds;
    } else if (typeof projectIds === 'string') {
      projectIdArray = projectIds.split(',').map(id => id.trim()).filter(id => id);
    }

    if (projectIdArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one project ID must be provided'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format'
      });
    }

    // Validate date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date values'
      });
    }

    if (from > to) {
      return res.status(400).json({
        success: false,
        error: 'fromDate must be less than or equal to toDate'
      });
    }

    console.log(`📊 Generating project hours analysis report for ${projectIdArray.length} project(s) from ${fromDate} to ${toDate}`);

    // Build the query to fetch timesheet entries with project and employee information
    const placeholders = projectIdArray.map(() => '?').join(',');
    
    const query = `
      SELECT 
        p.id as projectId,
        p.name as projectName,
        p.project_code as projectCode,
        p.project_manager_id as projectManagerId,
        pm.name as projectManagerName,
        pm.employee_id as projectManagerEmployeeId,
        u.id as employeeId,
        u.name as employeeName,
        u.employee_id as employeeCode,
        u.email as employeeEmail,
        SUM(te.hours) as totalHours,
        COUNT(DISTINCT te.entry_date) as daysWorked,
        MIN(te.entry_date) as firstEntryDate,
        MAX(te.entry_date) as lastEntryDate
      FROM timesheet_entries te
      INNER JOIN timesheets t ON te.timesheet_id = t.id
      INNER JOIN users u ON t.user_id = u.id
      INNER JOIN projects p ON te.project_id = p.id
      LEFT JOIN users pm ON p.project_manager_id = pm.id
      WHERE p.id IN (${placeholders})
        AND te.entry_date >= ?
        AND te.entry_date <= ?
        AND te.is_holiday = FALSE
        AND te.is_leave = FALSE
      GROUP BY p.id, p.name, p.project_code, p.project_manager_id, pm.name, pm.employee_id, u.id, u.name, u.employee_id, u.email
      ORDER BY p.name, u.name
    `;

    const params = [...projectIdArray, fromDate, toDate];
    const results = await db.executeQuery(query, params);

    // Also get total hours per project (for validation)
    const totalHoursQuery = `
      SELECT 
        p.id as projectId,
        p.name as projectName,
        SUM(te.hours) as totalHours
      FROM timesheet_entries te
      INNER JOIN timesheets t ON te.timesheet_id = t.id
      INNER JOIN projects p ON te.project_id = p.id
      WHERE p.id IN (${placeholders})
        AND te.entry_date >= ?
        AND te.entry_date <= ?
        AND te.is_holiday = FALSE
        AND te.is_leave = FALSE
      GROUP BY p.id, p.name
    `;

    const totalHoursResults = await db.executeQuery(totalHoursQuery, params);

    // Structure the data by project
    const projectMap = new Map();

    // Initialize project entries with totals
    totalHoursResults.forEach(proj => {
      projectMap.set(proj.projectId, {
        projectId: proj.projectId,
        projectName: proj.projectName,
        projectCode: null, // Will be filled from results
        projectManagerId: null,
        projectManagerName: null,
        projectManagerEmployeeId: null,
        totalHours: parseFloat(proj.totalHours) || 0,
        employees: [],
        employeeTotal: 0 // Sum of all employee hours (for validation)
      });
    });

    // Add employee-wise data
    results.forEach(row => {
      const project = projectMap.get(row.projectId);
      if (project) {
        // Set project details if not already set
        if (!project.projectCode) {
          project.projectCode = row.projectCode;
          project.projectManagerId = row.projectManagerId;
          project.projectManagerName = row.projectManagerName;
          project.projectManagerEmployeeId = row.projectManagerEmployeeId;
        }

        const employeeHours = parseFloat(row.totalHours) || 0;
        project.employees.push({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          employeeCode: row.employeeCode,
          employeeEmail: row.employeeEmail,
          totalHours: employeeHours,
          daysWorked: row.daysWorked,
          firstEntryDate: row.firstEntryDate,
          lastEntryDate: row.lastEntryDate
        });

        project.employeeTotal += employeeHours;
      }
    });

    // Convert map to array and ensure all selected projects are included (even with no entries)
    const projectIdSet = new Set(projectIdArray);
    const reportData = [];

    // First, add projects with data
    projectMap.forEach((project, projectId) => {
      // Round hours to 2 decimal places
      project.totalHours = Math.round(project.totalHours * 100) / 100;
      project.employeeTotal = Math.round(project.employeeTotal * 100) / 100;
      
      // Round employee hours
      project.employees.forEach(employee => {
        employee.totalHours = Math.round(employee.totalHours * 100) / 100;
      });

      reportData.push(project);
      projectIdSet.delete(projectId);
    });

    // Add projects with no entries in the date range
    if (projectIdSet.size > 0) {
      const missingProjectIds = Array.from(projectIdSet);
      const missingPlaceholders = missingProjectIds.map(() => '?').join(',');
      
      const missingProjectsQuery = `
        SELECT 
          p.id as projectId,
          p.name as projectName,
          p.project_code as projectCode,
          p.project_manager_id as projectManagerId,
          pm.name as projectManagerName,
          pm.employee_id as projectManagerEmployeeId
        FROM projects p
        LEFT JOIN users pm ON p.project_manager_id = pm.id
        WHERE p.id IN (${missingPlaceholders})
      `;

      const missingProjects = await db.executeQuery(missingProjectsQuery, missingProjectIds);
      
      missingProjects.forEach(proj => {
        reportData.push({
          projectId: proj.projectId,
          projectName: proj.projectName,
          projectCode: proj.projectCode,
          projectManagerId: proj.projectManagerId,
          projectManagerName: proj.projectManagerName,
          projectManagerEmployeeId: proj.projectManagerEmployeeId,
          totalHours: 0,
          employees: [],
          employeeTotal: 0
        });
      });
    }

    // Sort by project name
    reportData.sort((a, b) => a.projectName.localeCompare(b.projectName));

    console.log(`✅ Generated report for ${reportData.length} project(s) with ${results.length} employee entries`);

    res.json({
      success: true,
      data: reportData,
      meta: {
        fromDate,
        toDate,
        projectCount: reportData.length,
        totalEntries: results.length
      }
    });

  } catch (error) {
    console.error('❌ Error generating project hours analysis report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate project hours analysis report'
    });
  }
};



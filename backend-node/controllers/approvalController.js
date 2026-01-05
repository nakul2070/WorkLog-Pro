const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const emailService = require('../services/emailService');

/**
 * Approval Controller
 * Manages timesheet approval workflow from MySQL database
 */

/**
 * Calculate total hours for a timesheet including working hours, leaves, and holidays
 * @param {string} timesheetId - The timesheet ID
 * @param {number} year - The timesheet year
 * @param {number} month - The timesheet month (1-12)
 * @param {string} userId - The user ID for the timesheet
 * @returns {Promise<number>} Total hours including leaves and holidays
 */
async function calculateTimesheetTotalHours(timesheetId, year, month, userId) {
  try {
    // Get timesheet with total_hours - this is already calculated using the formula
    // Formula: Total Hours = Sum of working-hours-per-day + (8 × holidayCount) + (8 × leaveCount)
    // The total_hours is calculated in timesheetController when entries are added/updated/submitted
    const [timesheet] = await db.executeQuery(
      'SELECT total_hours, year, month FROM timesheets WHERE id = ?', 
      [timesheetId]
    );
    
    if (!timesheet) {
      console.error(`Timesheet ${timesheetId} not found`);
      return 0;
    }
    
    // Use the total_hours from the timesheet table (already calculated correctly)
    const totalHours = Number(timesheet.total_hours || 0);

    console.log(`📊 Timesheet ${timesheetId} total hours: ${totalHours}h (from timesheets table for ${timesheet.year}-${timesheet.month})`);

    return totalHours;
  } catch (error) {
    console.error(`Error calculating timesheet total hours for ${timesheetId}:`, error);
    return 0;
  }
}

// Get all approvals
exports.getAllApprovals = async (req, res) => {
  try {
    const { projectManagerId, status } = req.query;
    console.log('✅ Fetching approvals from database...');
    
    let query = `
      SELECT 
        a.id,
        a.timesheet_id as timesheetId,
        t.timesheet_code as timesheetCode,
        t.year,
        t.month,
        a.project_id as projectId,
        p.name as projectName,
        p.project_code as projectCode,
        a.project_manager_id as projectManagerId,
        pm.name as projectManagerName,
        a.status,
        a.total_hours as totalHours,
        a.comments,
        a.approved_at as approvedAt,
        a.rejected_at as rejectedAt,
        t.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        a.created_at as createdAt
      FROM approvals a
      JOIN timesheets t ON a.timesheet_id = t.id
      JOIN projects p ON a.project_id = p.id
      JOIN users pm ON a.project_manager_id = pm.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (projectManagerId) {
      query += ' AND a.project_manager_id = ?';
      params.push(projectManagerId);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const approvals = await db.executeQuery(query, params);
    
    res.json({
      success: true,
      source: 'MySQL Database',
      count: approvals.length,
      data: approvals
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get pending approvals for current project manager
exports.getPendingApprovals = async (req, res) => {
  try {
    // Get projectManagerId from authenticated user
    const projectManagerId = req.user?.id || req.userId;
    
    if (!projectManagerId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. User ID not found.'
      });
    }
    
    // First, get pending approvals (submitted timesheets with pending approvals)
    const pendingQuery = `
      SELECT 
        a.id,
        a.timesheet_id as timesheetId,
        t.timesheet_code as timesheetCode,
        t.year,
        t.month,
        a.project_id as projectId,
        p.name as projectName,
        p.project_code as projectCode,
        a.total_hours as totalHours,
        t.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        a.created_at as createdAt,
        'pending' as timesheetStatus
      FROM approvals a
      JOIN timesheets t ON a.timesheet_id = t.id
      JOIN projects p ON a.project_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE a.project_manager_id = ? 
        AND a.status = 'pending'
        AND t.status = 'submitted'
      ORDER BY a.created_at DESC
    `;
    
    const approvals = await db.executeQuery(pendingQuery, [projectManagerId]);
    
    // Second, get draft timesheets for this PM's projects
    // Find timesheets with status='draft' that have entries for projects managed by this PM
    // Show timesheet if ANY entry is for a project managed by this PM (not all entries need to match)
    // Include all entries (working hours, holidays, leaves) - any entry means the timesheet is being worked on
    // Query to find draft timesheets where ANY entry is for a project managed by this PM
    // This uses a subquery to check if the timesheet has at least one entry for this PM's projects
    console.log(`🔍 Querying draft timesheets for PM: ${projectManagerId}`);
    
    // Debug: First, let's see what draft timesheets exist and their project associations
    try {
      const allDrafts = await db.executeQuery(
        `SELECT t.id, t.timesheet_code, t.user_id, t.status,
                GROUP_CONCAT(DISTINCT te.project_id) as entry_project_ids,
                GROUP_CONCAT(DISTINCT p.project_manager_id) as project_manager_ids
         FROM timesheets t
         LEFT JOIN timesheet_entries te ON t.id = te.timesheet_id
         LEFT JOIN projects p ON te.project_id = p.id
         WHERE t.status = 'draft'
         GROUP BY t.id, t.timesheet_code, t.user_id, t.status`
      );
      
      console.log(`📊 Debug: Found ${allDrafts.length} draft timesheet(s) in database:`);
      for (const draft of allDrafts) {
        console.log(`  - Timesheet ${draft.timesheet_code} (${draft.id}):`);
        console.log(`    Entry Project IDs: ${draft.entry_project_ids || 'none'}`);
        console.log(`    Project Manager IDs: ${draft.project_manager_ids || 'none'}`);
        console.log(`    Looking for PM: ${projectManagerId}`);
        
        // Check each project's PM
        if (draft.entry_project_ids) {
          const projectIds = draft.entry_project_ids.split(',');
          for (const projId of projectIds) {
            const [proj] = await db.executeQuery(
              'SELECT id, name, project_manager_id FROM projects WHERE id = ?',
              [projId.trim()]
            );
            if (proj) {
              console.log(`      Project ${proj.name} (${proj.id}): PM = ${proj.project_manager_id}, Match = ${proj.project_manager_id === projectManagerId ? '✅ YES' : '❌ NO'}`);
            }
          }
        }
      }
    } catch (debugError) {
      console.error('Error in debug query:', debugError);
    }
    
    // Query to find draft timesheets where ANY entry is for a project managed by this PM
    const draftQuery = `
      SELECT DISTINCT
        t.id as timesheetId,
        t.timesheet_code as timesheetCode,
        t.year,
        t.month,
        t.total_hours as totalHours,
        t.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        t.updated_at as createdAt,
        'draft' as timesheetStatus
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE t.status = 'draft'
        AND EXISTS (
          SELECT 1 
          FROM timesheet_entries te
          JOIN projects p ON te.project_id = p.id
          WHERE te.timesheet_id = t.id
            AND (te.hours > 0 OR te.is_holiday = 1 OR te.is_leave = 1)
            AND p.project_manager_id = ?
        )
      ORDER BY t.updated_at DESC
    `;
    
    const draftTimesheets = await db.executeQuery(draftQuery, [projectManagerId]);
    
    // Now get project details for each matching timesheet (only projects managed by this PM)
    for (const draft of draftTimesheets) {
      const projectDetails = await db.executeQuery(
        `SELECT DISTINCT p.id, p.name, p.project_code,
                SUM(CASE WHEN te.is_holiday = 0 AND te.is_leave = 0 THEN te.hours ELSE 0 END) as projectHours
         FROM timesheet_entries te
         JOIN projects p ON te.project_id = p.id
         WHERE te.timesheet_id = ?
           AND p.project_manager_id = ?
           AND (te.hours > 0 OR te.is_holiday = 1 OR te.is_leave = 1)
         GROUP BY p.id, p.name, p.project_code`,
        [draft.timesheetId, projectManagerId]
      );
      
      draft.projects = projectDetails.map(p => ({
        projectId: p.id,
        projectName: p.name,
        projectCode: p.project_code,
        approvalId: null,
        projectHours: Number(p.projectHours || 0)
      }));
      
      draft.projectIds = projectDetails.map(p => p.id).join(',');
      draft.projectNames = projectDetails.map(p => p.name).join(',');
    }
    
    // Debug: Log draft timesheets to verify user association
    console.log(`📋 Fetched ${draftTimesheets.length} draft timesheet(s) for PM: ${projectManagerId}`);
    if (draftTimesheets.length === 0) {
      // Debug: Check if there are any draft timesheets at all
      const [allDraftCount] = await db.executeQuery(
        'SELECT COUNT(*) as count FROM timesheets WHERE status = ?',
        ['draft']
      );
      console.log(`  ℹ️  Total draft timesheets in database: ${allDraftCount?.count || 0}`);
      
      // Debug: Check if PM has any projects
      const [pmProjectsCount] = await db.executeQuery(
        'SELECT COUNT(*) as count FROM projects WHERE project_manager_id = ?',
        [projectManagerId]
      );
      console.log(`  ℹ️  Projects managed by PM ${projectManagerId}: ${pmProjectsCount?.count || 0}`);
      
      // Debug: Get all draft timesheets and check their project associations in detail
      const allDraftTimesheets = await db.executeQuery(
        'SELECT id, timesheet_code, user_id FROM timesheets WHERE status = ?',
        ['draft']
      );
      
      for (const draft of allDraftTimesheets) {
        console.log(`  🔍 Analyzing draft timesheet ${draft.timesheet_code} (${draft.id}):`);
        
        // Get all entries for this timesheet with project details
        const entries = await db.executeQuery(
          `SELECT te.project_id, te.hours, te.is_holiday, te.is_leave,
                  p.name as project_name, p.project_manager_id as pm_id
           FROM timesheet_entries te
           LEFT JOIN projects p ON te.project_id = p.id
           WHERE te.timesheet_id = ?`,
          [draft.id]
        );
        
        if (entries.length === 0) {
          console.log(`    ⚠️  No entries found for this timesheet`);
        } else {
          console.log(`    Found ${entries.length} entry/entries:`);
          entries.forEach(entry => {
            const matchStatus = entry.pm_id === projectManagerId ? '✅ MATCH' : '❌ NO MATCH';
            console.log(`      - Project: ${entry.project_name || 'Unknown'} (${entry.project_id || 'NULL'})`);
            console.log(`        PM ID: ${entry.pm_id || 'NULL'}, Looking for: ${projectManagerId}, ${matchStatus}`);
            console.log(`        Hours: ${entry.hours}, Holiday: ${entry.is_holiday}, Leave: ${entry.is_leave}`);
          });
        }
      }
    } else {
      draftTimesheets.forEach(draft => {
        console.log(`  - Timesheet ${draft.timesheetId} (${draft.timesheetCode}): User ${draft.userId} (${draft.userName}), Projects: ${draft.projectIds}`);
      });
    }
    
    // Group pending approvals by timesheet_id to return one row per timesheet
    const timesheetMap = new Map();
    const timesheetTotals = new Map(); // Cache to avoid recalculating for same timesheet
    
    for (const approval of approvals) {
      const timesheetId = approval.timesheetId;
      
      // Calculate total hours only once per timesheet
      if (!timesheetTotals.has(timesheetId)) {
        const totalHours = await calculateTimesheetTotalHours(
          timesheetId,
          approval.year,
          approval.month,
          approval.userId
        );
        timesheetTotals.set(timesheetId, totalHours);
      }
      
      // Group by timesheet_id
      if (!timesheetMap.has(timesheetId)) {
        timesheetMap.set(timesheetId, {
          // Use the first approval's data for timesheet-level info
          id: approval.id, // Use first approval ID as the primary ID
          timesheetId: approval.timesheetId,
          timesheetCode: approval.timesheetCode,
          year: approval.year,
          month: approval.month,
          userId: approval.userId,
          userName: approval.userName,
          employeeId: approval.employeeId,
          createdAt: approval.createdAt,
          timesheetStatus: 'pending',
          timesheetTotalHours: timesheetTotals.get(timesheetId),
          // Store all approval IDs and project info for this timesheet
          approvalIds: [],
          projects: []
        });
      }
      
      // Add this approval's info to the timesheet group
      const timesheetGroup = timesheetMap.get(timesheetId);
      timesheetGroup.approvalIds.push(approval.id);
      timesheetGroup.projects.push({
        projectId: approval.projectId,
        projectName: approval.projectName,
        projectCode: approval.projectCode,
        approvalId: approval.id,
        projectHours: approval.totalHours
      });
    }
    
    // Process draft timesheets and add them to the map
    for (const draft of draftTimesheets) {
      const timesheetId = draft.timesheetId;
      
      // Skip if already in map (shouldn't happen, but safety check)
      if (timesheetMap.has(timesheetId)) {
        continue;
      }
      
      // Verify user association - log warning if there's a mismatch
      console.log(`📋 Processing draft timesheet ${draft.timesheetCode}: User ${draft.userId} (${draft.userName})`);
      
      // Get project details for this draft timesheet
      const projectIds = draft.projectIds ? draft.projectIds.split(',') : [];
      const projectNames = draft.projectNames ? draft.projectNames.split(',') : [];
      
      console.log(`  📦 Processing ${projectIds.length} project(s) for timesheet ${draft.timesheetCode}`);
      
      // Get project details from database
      const projectDetails = [];
      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i]?.trim();
        if (!projectId) continue;
        
        const [project] = await db.executeQuery(
          'SELECT id, name, project_code FROM projects WHERE id = ?',
          [projectId]
        );
        if (project) {
          // Calculate hours for this project in this timesheet (including holidays/leaves)
          const [projectHoursResult] = await db.executeQuery(
            `SELECT SUM(hours) as total FROM timesheet_entries 
             WHERE timesheet_id = ? AND project_id = ?`,
            [timesheetId, project.id]
          );
          const projectHours = Number(projectHoursResult?.total || 0);
          
          projectDetails.push({
            projectId: project.id,
            projectName: project.name,
            projectCode: project.project_code,
            approvalId: null, // No approval record for drafts
            projectHours: projectHours
          });
          
          console.log(`    ✓ Project ${project.name}: ${projectHours} hours`);
        } else {
          console.warn(`    ⚠️  Project ${projectId} not found in database`);
        }
      }
      
      if (projectDetails.length === 0) {
        console.warn(`  ⚠️  No valid projects found for timesheet ${draft.timesheetCode}, skipping`);
        continue; // Skip this timesheet if no valid projects
      }
      
      // Calculate total hours for draft timesheet
      const totalHours = Number(draft.totalHours || 0);
      
      timesheetMap.set(timesheetId, {
        id: null, // No approval ID for drafts
        timesheetId: draft.timesheetId,
        timesheetCode: draft.timesheetCode,
        year: draft.year,
        month: draft.month,
        userId: draft.userId,
        userName: draft.userName,
        employeeId: draft.employeeId,
        createdAt: draft.createdAt,
        timesheetStatus: 'draft',
        timesheetTotalHours: totalHours,
        approvalIds: [], // No approvals for drafts
        projects: projectDetails
      });
    }
    
    // Convert map to array (one row per timesheet)
    const groupedApprovals = Array.from(timesheetMap.values());
    
    // Sort: pending first, then drafts, both by creation date descending
    groupedApprovals.sort((a, b) => {
      if (a.timesheetStatus === 'pending' && b.timesheetStatus === 'draft') return -1;
      if (a.timesheetStatus === 'draft' && b.timesheetStatus === 'pending') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    console.log(`✅ Fetched ${approvals.length} pending approval records and ${draftTimesheets.length} draft timesheet(s), grouped into ${groupedApprovals.length} unique timesheet(s) for PM: ${projectManagerId}`);
    
    res.json({
      success: true,
      source: 'MySQL Database',
      projectManagerId,
      count: groupedApprovals.length,
      data: groupedApprovals
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get approvals for a timesheet
exports.getTimesheetApprovals = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    
    const query = `
      SELECT 
        a.id,
        a.project_id as projectId,
        p.name as projectName,
        a.project_manager_id as projectManagerId,
        pm.name as projectManagerName,
        a.status,
        a.total_hours as totalHours,
        a.comments,
        a.approved_at as approvedAt,
        a.rejected_at as rejectedAt
      FROM approvals a
      JOIN projects p ON a.project_id = p.id
      JOIN users pm ON a.project_manager_id = pm.id
      WHERE a.timesheet_id = ?
    `;
    
    const approvals = await db.executeQuery(query, [timesheetId]);
    
    res.json({
      success: true,
      count: approvals.length,
      data: approvals
    });
  } catch (error) {
    console.error('Error fetching timesheet approvals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Approve timesheet
exports.approveTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    // Update approval status
    const query = `
      UPDATE approvals 
      SET status = 'approved', comments = ?, approved_at = NOW()
      WHERE id = ?
    `;
    
    await db.executeQuery(query, [comments || null, id]);
    
    // Get approval details
    const approval = await db.executeQuery('SELECT * FROM approvals WHERE id = ?', [id]);
    
    if (approval.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Approval not found'
      });
    }
    
    // Check if all approvals for this timesheet are approved
    const timesheetId = approval[0].timesheet_id;
    const allApprovals = await db.executeQuery(
      'SELECT status FROM approvals WHERE timesheet_id = ?',
      [timesheetId]
    );
    
    const allApproved = allApprovals.every(a => a.status === 'approved');
    
    if (allApproved) {
      // Update timesheet status to approved
      await db.executeQuery(
        'UPDATE timesheets SET status = ? WHERE id = ?',
        ['approved', timesheetId]
      );
    }
    
    console.log('✅ Timesheet approved');
    
    // Return response immediately for better UX
    res.json({
      success: true,
      message: 'Timesheet approved successfully',
      allApprovalsComplete: allApproved,
      data: approval[0]
    });
    
    // Send email notification in background (non-blocking)
    setImmediate(async () => {
    try {
      // Get employee, project, and approver details
      const [details] = await db.executeQuery(
        `SELECT 
          u.name as employeeName,
          u.email as employeeEmail,
          p.name as projectName,
          t.year,
          t.month,
          pm.name as approverName
         FROM approvals a
         JOIN timesheets t ON a.timesheet_id = t.id
         JOIN users u ON t.user_id = u.id
         JOIN projects p ON a.project_id = p.id
         JOIN users pm ON a.project_manager_id = pm.id
         WHERE a.id = ?`,
        [id]
      );
      
      if (details) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[details.month - 1];
        const weekPeriod = `${monthName} ${details.year}`;
        
        // Send email (will log to console if SMTP not configured)
        await emailService.sendTimesheetApprovedEmail({
          employeeName: details.employeeName,
          employeeEmail: details.employeeEmail,
          projectName: details.projectName,
          weekStart: weekPeriod,
          weekEnd: weekPeriod,
          approverName: details.approverName,
          comments: comments || '',
        });
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.warn('⚠️  Email notification failed:', emailError.message);
    }
    });
  } catch (error) {
    console.error('Error approving timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Reject timesheet
exports.rejectTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    if (!comments) {
      return res.status(400).json({
        success: false,
        error: 'Comments are required for rejection'
      });
    }
    
    // Update approval status
    const query = `
      UPDATE approvals 
      SET status = 'rejected', comments = ?, rejected_at = NOW()
      WHERE id = ?
    `;
    
    await db.executeQuery(query, [comments, id]);
    
    // Get approval details
    const approval = await db.executeQuery('SELECT * FROM approvals WHERE id = ?', [id]);
    
    if (approval.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Approval not found'
      });
    }
    
    // Update timesheet status to rejected
    const timesheetId = approval[0].timesheet_id;
    await db.executeQuery(
      'UPDATE timesheets SET status = ? WHERE id = ?',
      ['rejected', timesheetId]
    );
    
    console.log('❌ Timesheet rejected');
    
    // Return response immediately for better UX
    res.json({
      success: true,
      message: 'Timesheet rejected',
      data: approval[0]
    });
    
    // Send email notification in background (non-blocking)
    setImmediate(async () => {
    try {
      // Get employee, project, and reviewer details
      const [details] = await db.executeQuery(
        `SELECT 
          u.name as employeeName,
          u.email as employeeEmail,
          p.name as projectName,
          t.year,
          t.month,
          pm.name as approverName
         FROM approvals a
         JOIN timesheets t ON a.timesheet_id = t.id
         JOIN users u ON t.user_id = u.id
         JOIN projects p ON a.project_id = p.id
         JOIN users pm ON a.project_manager_id = pm.id
         WHERE a.id = ?`,
        [id]
      );
      
      if (details) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[details.month - 1];
        const weekPeriod = `${monthName} ${details.year}`;
        
        // Send email (will log to console if SMTP not configured)
        await emailService.sendTimesheetRejectedEmail({
          employeeName: details.employeeName,
          employeeEmail: details.employeeEmail,
          projectName: details.projectName,
          weekStart: weekPeriod,
          weekEnd: weekPeriod,
          approverName: details.approverName,
          comments: comments,
        });
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.warn('⚠️  Email notification failed:', emailError.message);
    }
    });
  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { sendProjectAccessRequestEmail } = require('../services/emailService');

/**
 * Project Access Request Controller
 * Manages project access requests submitted by employees and project managers
 */

// Create a new project access request
exports.createProjectAccessRequest = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in again.'
      });
    }

    const { requestMessage } = req.body;
    const requesterId = req.user.id; // From auth middleware

    if (!requestMessage || !requestMessage.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Request message is required'
      });
    }

    // Get requester details
    const [requester] = await db.executeQuery(`
      SELECT id, name, email, employee_id, is_admin, is_project_manager
      FROM users WHERE id = ?
    `, [requesterId]);

    if (!requester) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admins from submitting project access requests
    if (requester.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Administrators cannot submit project access requests'
      });
    }

    const requesterName = requester.name || 'Unknown User';
    const requesterRole = requester.is_project_manager ? 'Project Manager' : 'Employee';
    const requestId = uuidv4(); // Unique ID for this request

    // Save request to project_access_requests table
    try {
      await db.executeQuery(`
        INSERT INTO project_access_requests (
          id, user_id, request_message, status, admin_response, responded_by, responded_at
        ) VALUES (?, ?, ?, 'pending', NULL, NULL, NULL)
      `, [requestId, requesterId, requestMessage.trim()]);
      
      console.log(`✅ Saved project access request ${requestId} to project_access_requests table`);
    } catch (insertError) {
      console.error(`❌ Error saving to project_access_requests table:`, insertError);
      throw insertError;
    }

    // Return the request data in the expected format
    const responseData = {
      id: requestId,
      userId: requesterId,
      userName: requesterName,
      userEmail: requester.email,
      userEmployeeId: requester.employee_id,
      userIsAdmin: requester.is_admin,
      userIsProjectManager: requester.is_project_manager,
      requestMessage: requestMessage.trim(),
      status: 'pending',
      adminResponse: null,
      respondedBy: null,
      respondedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Send email notification to all admins (non-blocking)
    // This runs asynchronously and won't affect the API response
    (async () => {
      try {
        console.log('📧 Starting email notification process for project access request...');
        
        // Get all admin users - try both is_admin and isAdmin column names
        let admins = await db.executeQuery(`
          SELECT id, name, email, is_admin, isAdmin, is_active, isActive
          FROM users 
          WHERE (is_admin = 1 OR isAdmin = 1) 
            AND (is_active = 1 OR isActive = 1) 
            AND email IS NOT NULL 
            AND email != ''
        `);

        console.log(`📧 Found ${admins ? admins.length : 0} admin user(s) in database`);
        
        if (admins && admins.length > 0) {
          // Log admin details for debugging
          admins.forEach(admin => {
            console.log(`  - Admin: ${admin.name} (${admin.email})`);
          });

          const submittedDateTime = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });

          // Get system name from environment or use default
          const systemName = process.env.SMTP_FROM_NAME || 'Timesheet Management System';

          console.log(`📧 Preparing to send emails to ${admins.length} admin(s)...`);
          console.log(`📧 Request details: ${requesterName} (${requesterRole}) - ${requestMessage.substring(0, 50)}...`);

          // Send email to each admin
          const emailPromises = admins.map(async (admin) => {
            try {
              console.log(`📧 Attempting to send email to ${admin.email}...`);
              const result = await sendProjectAccessRequestEmail({
                requesterName: requesterName,
                requesterRole: requesterRole,
                requestDescription: requestMessage.trim(),
                submittedDateTime: submittedDateTime,
                adminEmail: admin.email,
                systemName: systemName
              });
              
              if (result) {
                console.log(`✅ Successfully sent email to ${admin.email}`);
              } else {
                console.log(`⚠️  Email service returned false for ${admin.email} (check SMTP configuration)`);
              }
              return result;
            } catch (emailError) {
              // Log error but don't throw - we don't want email failures to break the request
              console.error(`❌ Failed to send project access request email to admin ${admin.email}:`, emailError.message);
              console.error(`   Error details:`, emailError);
              return false;
            }
          });

          // Wait for all emails to be sent (or fail gracefully)
          const emailResults = await Promise.allSettled(emailPromises);
          const successCount = emailResults.filter(r => r.status === 'fulfilled' && r.value === true).length;
          const failureCount = emailResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false)).length;
          
          console.log(`📧 Email notification summary: ${successCount} succeeded, ${failureCount} failed out of ${admins.length} total`);
          
          if (successCount === 0 && admins.length > 0) {
            console.log('⚠️  WARNING: No emails were sent successfully. Please check:');
            console.log('   1. SMTP configuration in .env file (SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD)');
            console.log('   2. Email service logs above for specific error messages');
            console.log('   3. Network/firewall settings if SMTP server is external');
          }
        } else {
          console.log('⚠️  No admin users found to send project access request email notification');
          console.log('   Checking if any users exist with admin privileges...');
          
          // Debug query to see what users exist
          const allUsers = await db.executeQuery(`
            SELECT id, name, email, is_admin, isAdmin, is_active, isActive
            FROM users 
            LIMIT 10
          `);
          console.log(`   Found ${allUsers.length} total users in database (showing first 10)`);
          allUsers.forEach(user => {
            console.log(`   - User: ${user.name} (${user.email}) - is_admin: ${user.is_admin || user.isAdmin}, is_active: ${user.is_active || user.isActive}`);
          });
        }
      } catch (emailError) {
        // Log error but don't throw - email failures should not break the request submission
        console.error('❌ Error in email notification process:', emailError.message);
        console.error('   Full error:', emailError);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Project access request submitted successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating project access request:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create project access request'
    });
  }
};

// Get all project access requests (admin only)
exports.getAllProjectAccessRequests = async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in again.'
      });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { status } = req.query;

    // Build query to fetch all project access requests
    let query = `
      SELECT 
        par.id,
        par.user_id as userId,
        par.request_message as requestMessage,
        par.status,
        par.admin_response as adminResponse,
        par.responded_by as respondedBy,
        par.responded_at as respondedAt,
        par.created_at as createdAt,
        par.updated_at as updatedAt,
        u.name as userName,
        u.email as userEmail,
        u.employee_id as userEmployeeId,
        u.is_admin as userIsAdmin,
        u.is_project_manager as userIsProjectManager,
        u.department as userDepartment,
        u.job_title as userJobTitle,
        responder.name as responderName
      FROM project_access_requests par
      INNER JOIN users u ON par.user_id = u.id
      LEFT JOIN users responder ON par.responded_by = responder.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by status if provided
    if (status && status !== 'all') {
      query += ' AND par.status = ?';
      params.push(status);
    }

    query += ' ORDER BY par.created_at DESC';

    const requests = await db.executeQuery(query, params);

    // Transform the data to match the expected format
    const transformedRequests = requests.map(request => ({
      id: request.id,
      userId: request.userId,
      userName: request.userName || 'Unknown User',
      userEmail: request.userEmail || '',
      userEmployeeId: request.userEmployeeId || null,
      userIsAdmin: request.userIsAdmin || false,
      userIsProjectManager: request.userIsProjectManager || false,
      userDepartment: request.userDepartment || null,
      userJobTitle: request.userJobTitle || null,
      requestMessage: request.requestMessage || 'No message provided',
      status: request.status || 'pending',
      adminResponse: request.adminResponse || null,
      respondedBy: request.respondedBy || null,
      responderName: request.responderName || null,
      respondedAt: request.respondedAt || null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    console.log(`✅ Fetched ${transformedRequests.length} project access request(s) from database`);

    res.json({
      success: true,
      count: transformedRequests.length,
      data: transformedRequests
    });
  } catch (error) {
    console.error('Error fetching project access requests:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project access requests'
    });
  }
};

// Update project access request (admin only)
exports.updateProjectAccessRequest = async (req, res) => {
  try {
    const { id } = req.params; // request ID from project_access_requests table
    const { status, adminResponse } = req.body;
    const adminId = req.user.id; // From auth middleware

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (pending, approved, rejected, completed)'
      });
    }

    // Get the request from project_access_requests table
    const [request] = await db.executeQuery(
      'SELECT * FROM project_access_requests WHERE id = ?',
      [id]
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Project access request not found'
      });
    }

    // Update the request in project_access_requests table
    const respondedAt = status !== 'pending' ? new Date() : null;
    await db.executeQuery(`
      UPDATE project_access_requests 
      SET status = ?, 
          admin_response = ?, 
          responded_by = ?, 
          responded_at = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [status, adminResponse || null, adminId, respondedAt, id]);

    // Get updated request with user details
    const [updatedRequest] = await db.executeQuery(`
      SELECT 
        par.id,
        par.user_id as userId,
        par.request_message as requestMessage,
        par.status,
        par.admin_response as adminResponse,
        par.responded_by as respondedBy,
        par.responded_at as respondedAt,
        par.created_at as createdAt,
        par.updated_at as updatedAt,
        u.name as userName,
        u.email as userEmail,
        u.employee_id as userEmployeeId,
        u.is_admin as userIsAdmin,
        u.is_project_manager as userIsProjectManager,
        u.department as userDepartment,
        u.job_title as userJobTitle,
        responder.name as responderName
      FROM project_access_requests par
      INNER JOIN users u ON par.user_id = u.id
      LEFT JOIN users responder ON par.responded_by = responder.id
      WHERE par.id = ?
    `, [id]);

    const responseData = {
      id: updatedRequest.id,
      userId: updatedRequest.userId,
      userName: updatedRequest.userName || 'Unknown User',
      userEmail: updatedRequest.userEmail || '',
      userEmployeeId: updatedRequest.userEmployeeId || null,
      userIsAdmin: updatedRequest.userIsAdmin || false,
      userIsProjectManager: updatedRequest.userIsProjectManager || false,
      userDepartment: updatedRequest.userDepartment || null,
      userJobTitle: updatedRequest.userJobTitle || null,
      requestMessage: updatedRequest.requestMessage,
      status: updatedRequest.status,
      adminResponse: updatedRequest.adminResponse,
      respondedBy: updatedRequest.respondedBy,
      responderName: updatedRequest.responderName || null,
      respondedAt: updatedRequest.respondedAt,
      createdAt: updatedRequest.createdAt,
      updatedAt: updatedRequest.updatedAt
    };

    console.log('✅ Project access request updated:', id);

    res.json({
      success: true,
      message: 'Project access request updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating project access request:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update project access request'
    });
  }
};


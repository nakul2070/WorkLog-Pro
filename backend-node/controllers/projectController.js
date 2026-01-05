const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { getOffice365Users, getOffice365UsersAndGroups } = require('../services/office365Sync');

/**
 * Project Controller
 * Manages projects, clients, and project team members from MySQL database
 */

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const { status, clientId, projectManagerId } = req.query;
    console.log('📂 Fetching projects from database...');
    
    let query = `
      SELECT 
        p.id,
        p.project_code as projectCode,
        p.name,
        p.description,
        p.client_id as clientId,
        c.name as clientName,
        p.project_manager_id as projectManagerId,
        u.name as projectManagerName,
        u.employee_id as projectManagerEmployeeId,
        u.office365_id as projectManagerOffice365Id,
        p.start_date as startDate,
        p.end_date as endDate,
        p.estimated_hours as estimatedHours,
        p.status,
        p.priority,
        p.is_billable as isBillable,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    if (clientId) {
      query += ' AND p.client_id = ?';
      params.push(clientId);
    }
    
    if (projectManagerId) {
      query += ' AND p.project_manager_id = ?';
      params.push(projectManagerId);
    }
    
    query += ' ORDER BY p.name';
    
    const projects = await db.executeQuery(query, params);
    
    res.json({
      success: true,
      source: 'MySQL Database',
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📂 Fetching project: ${id}`);
    
    const query = `
      SELECT 
        p.*,
        c.name as clientName,
        u.name as projectManagerName
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE p.id = ? OR p.project_code = ?
      LIMIT 1
    `;
    
    const projects = await db.executeQuery(query, [id, id]);
    
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: projects[0]
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all clients
exports.getAllClients = async (req, res) => {
  try {
    console.log('🏢 Fetching clients from database...');
    
    const query = `
      SELECT 
        id,
        client_code as clientCode,
        name,
        type,
        industry,
        contact_person as contactPerson,
        contact_email as contactEmail,
        contact_phone as contactPhone,
        address,
        is_active as isActive,
        created_at as createdAt
      FROM clients
      WHERE is_active = TRUE
      ORDER BY name
    `;
    
    const clients = await db.executeQuery(query);
    
    res.json({
      success: true,
      source: 'MySQL Database',
      count: clients.length,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to generate a unique employee ID
async function generateUniqueEmployeeId() {
  try {
    // Find the maximum employee_id number by extracting numeric part
    const [result] = await db.executeQuery(
      `SELECT employee_id FROM users 
       WHERE employee_id REGEXP '^EMP[0-9]+$' 
       ORDER BY CAST(SUBSTRING(employee_id, 4) AS UNSIGNED) DESC 
       LIMIT 1`
    );
    
    if (result && result.employee_id) {
      // Extract the number part and increment
      const numStr = result.employee_id.substring(3); // Remove "EMP" prefix
      const nextNum = parseInt(numStr, 10) + 1;
      return `EMP${String(nextNum).padStart(3, '0')}`;
    }
    
    // No existing employee IDs found, start from EMP001
    return 'EMP001';
  } catch (error) {
    console.warn('⚠️  Error generating employee ID, using fallback:', error.message);
    // Fallback: use count + 1 (not ideal but better than failing)
    const [countResult] = await db.executeQuery("SELECT COUNT(*) as count FROM users");
    return `EMP${String(countResult.count + 1).padStart(3, '0')}`;
  }
}

// Helper function to map Office 365 user ID to database user ID
async function mapOffice365IdToUserId(office365Id) {
  if (!office365Id) return null;
  
  // First, try to find user by office365_id
  const [user] = await db.executeQuery(
    'SELECT id FROM users WHERE office365_id = ? LIMIT 1',
    [office365Id]
  );
  
  if (user) {
    console.log(`✅ Mapped Office 365 ID ${office365Id} to user ID ${user.id}`);
    return user.id;
  }
  
  // If not found by office365_id, check if the ID itself is a database user ID
  // (for backward compatibility with existing projects)
  const [existingUser] = await db.executeQuery(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [office365Id]
  );
  
  if (existingUser) {
    console.log(`✅ Office 365 ID ${office365Id} is already a database user ID`);
    return existingUser.id;
  }
  
  // If still not found, try to fetch user directly from Office 365 by ID
  // This is more reliable than searching through the full list
  try {
    const { getAzureConfig } = require('../services/office365Sync');
    const { Client } = require('@microsoft/microsoft-graph-client');
    const { ClientSecretCredential } = require('@azure/identity');
    
    const config = await getAzureConfig();
    
    if (config.azure_tenant_id && config.azure_client_id && config.azure_client_secret) {
      const credential = new ClientSecretCredential(
        config.azure_tenant_id,
        config.azure_client_id,
        config.azure_client_secret
      );
      
      const client = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await credential.getToken('https://graph.microsoft.com/.default');
            return token.token;
          }
        }
      });
      
      // Fetch user directly from Office 365 by ID
      try {
        const o365User = await client.api(`/users/${office365Id}`)
          .select('id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled')
          .get();
        
        // Verify user is active
        if (!o365User.accountEnabled) {
          throw new Error(`User ${o365User.displayName} is not active in Office 365`);
        }
        
        // Get email (prefer mail over userPrincipalName)
        const email = o365User.mail || o365User.userPrincipalName;
        if (!email) {
          throw new Error(`User ${o365User.displayName} has no email address`);
        }
        
        // Try to find user by email in database
        const [userByEmail] = await db.executeQuery(
          'SELECT id FROM users WHERE email = ? LIMIT 1',
          [email]
        );
        
        if (userByEmail) {
          // Update the user record to set office365_id for future lookups
          await db.executeQuery(
            'UPDATE users SET office365_id = ? WHERE id = ?',
            [office365Id, userByEmail.id]
          );
          console.log(`✅ Mapped Office 365 ID ${office365Id} to user ID ${userByEmail.id} via email ${email}`);
          return userByEmail.id;
        }
        
        // User not found in database but exists in Office 365 - auto-sync them
        console.log(`🔄 Auto-syncing Office 365 user ${o365User.displayName} (${email}) to database...`);
        
        // Generate unique employee ID
        const empId = await generateUniqueEmployeeId();
        
        // Create user in database
        const userId = uuidv4();
        await db.executeQuery(
          `INSERT INTO users (
            id, employee_id, office365_id, email, name, 
            department, job_title, office365_synced_at, created_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
          [
            userId, 
            empId, 
            office365Id, 
            email, 
            o365User.displayName || 'Unknown',
            o365User.department || null, 
            o365User.jobTitle || null
          ]
        );
        
        console.log(`✅ Auto-synced user ${o365User.displayName} (ID: ${userId}) from Office 365`);
        return userId;
      } catch (graphError) {
        // If direct lookup fails, try the full list as fallback
        console.warn(`⚠️  Direct Office 365 lookup failed: ${graphError.message}, trying full list...`);
        const { getOffice365Users } = require('../services/office365Sync');
        const o365Users = await getOffice365Users();
        const o365User = o365Users.find(u => u.id === office365Id);
        
        if (o365User && o365User.email) {
          // Generate unique employee ID
          const empId = await generateUniqueEmployeeId();
          
          // Create user in database
          const userId = uuidv4();
          await db.executeQuery(
            `INSERT INTO users (
              id, employee_id, office365_id, email, name, 
              department, job_title, office365_synced_at, created_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
            [
              userId, 
              empId, 
              office365Id, 
              o365User.email, 
              o365User.name,
              o365User.department || null, 
              o365User.jobTitle || null
            ]
          );
          
          console.log(`✅ Auto-synced user ${o365User.name} (ID: ${userId}) from Office 365 (via full list)`);
          return userId;
        }
        
        throw new Error(`User with Office 365 ID "${office365Id}" not found in Office 365`);
      }
    } else {
      throw new Error('Azure configuration is missing');
    }
  } catch (error) {
    console.error(`❌ Error fetching Office 365 user details for mapping: ${error.message}`);
    throw error;
  }
  
  // If all attempts fail, throw a clear error instead of returning the Office 365 ID
  // This prevents FK constraint errors and provides a helpful message
  throw new Error(
    `User with Office 365 ID "${office365Id}" not found in database or Office 365. ` +
    `Please ensure the employee exists in Office 365 and try again.`
  );
}

// Create project
exports.createProject = async (req, res) => {
  try {
    const { name, description, clientId, projectManagerId, startDate, endDate, estimatedHours, status, priority, isBillable } = req.body;
    
    const projectId = uuidv4();
    
    // Generate project code
    const countQuery = 'SELECT COUNT(*) as count FROM projects';
    const countResult = await db.executeQuery(countQuery);
    const projectCode = `PRJ${String(countResult[0].count + 1).padStart(3, '0')}`;
    
    // Map Office 365 user ID to database user ID if needed
    let dbProjectManagerId;
    try {
      dbProjectManagerId = await mapOffice365IdToUserId(projectManagerId);
    } catch (mappingError) {
      // Return a clear error message to the user
      return res.status(400).json({
        success: false,
        error: mappingError.message || 'Failed to map Office 365 user to database user'
      });
    }
    
    const query = `
      INSERT INTO projects (
        id, project_code, name, description, client_id, project_manager_id,
        start_date, end_date, estimated_hours, status, priority, is_billable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert undefined values to null for MySQL
    await db.executeQuery(query, [
      projectId, 
      projectCode, 
      name, 
      description || null, 
      clientId, 
      dbProjectManagerId,
      startDate || null, 
      endDate || null, 
      estimatedHours || null, 
      status || 'active', 
      priority || 'medium', 
      isBillable !== false
    ]);
    
    // Fetch the created project
    const createdProject = await db.executeQuery('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    console.log('✅ Project created:', name);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: createdProject[0]
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = ['name', 'description', 'client_id', 'project_manager_id', 'start_date', 'end_date', 'estimated_hours', 'status', 'priority', 'is_billable'];
    const updateFields = [];
    const updateValues = [];
    
    // Use for...of loop to handle async operations
    for (const key of Object.keys(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        updateFields.push(`${snakeKey} = ?`);
        // Convert undefined and empty strings to null for MySQL
        let value = updates[key];
        if (value === undefined || value === null || value === '') {
          value = null;
        }
        
        // If updating project_manager_id, map Office 365 ID to database user ID
        if (snakeKey === 'project_manager_id' && value !== null) {
          try {
            value = await mapOffice365IdToUserId(value);
            console.log(`✅ Mapped project manager Office 365 ID to database user ID: ${value}`);
          } catch (mappingError) {
            // Return a clear error message to the user
            console.error(`❌ Failed to map project manager: ${mappingError.message}`);
            return res.status(400).json({
              success: false,
              error: mappingError.message || 'Failed to map Office 365 user to database user'
            });
          }
        }
        
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    updateValues.push(id);
    
    const query = `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.executeQuery(query, updateValues);
    
    // Fetch updated project with joined user data (including Office 365 ID)
    const updatedProjectQuery = `
      SELECT 
        p.*,
        c.name as clientName,
        u.name as projectManagerName,
        u.employee_id as projectManagerEmployeeId,
        u.office365_id as projectManagerOffice365Id
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE p.id = ?
    `;
    const updatedProjects = await db.executeQuery(updatedProjectQuery, [id]);
    
    if (updatedProjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const updatedProject = updatedProjects[0];
    
    // Format response to match getAllProjects format
    const formattedProject = {
      id: updatedProject.id,
      projectCode: updatedProject.project_code,
      name: updatedProject.name,
      description: updatedProject.description,
      clientId: updatedProject.client_id,
      clientName: updatedProject.clientName,
      projectManagerId: updatedProject.project_manager_id,
      projectManagerName: updatedProject.projectManagerName,
      projectManagerEmployeeId: updatedProject.projectManagerEmployeeId,
      projectManagerOffice365Id: updatedProject.projectManagerOffice365Id,
      startDate: updatedProject.start_date,
      endDate: updatedProject.end_date,
      estimatedHours: updatedProject.estimated_hours,
      status: updatedProject.status,
      priority: updatedProject.priority,
      isBillable: updatedProject.is_billable,
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at
    };
    
    console.log('✅ Project updated:', updatedProject.name);
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: formattedProject
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const project = await db.executeQuery('SELECT * FROM projects WHERE id = ?', [id]);
    
    if (project.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Check if project has related records in timesheet_entries or approvals
    const [timesheetEntriesCount] = await db.executeQuery(
      'SELECT COUNT(*) as count FROM timesheet_entries WHERE project_id = ?',
      [id]
    );
    
    const [approvalsCount] = await db.executeQuery(
      'SELECT COUNT(*) as count FROM approvals WHERE project_id = ?',
      [id]
    );
    
    const hasRelatedRecords = (timesheetEntriesCount?.count || 0) > 0 || (approvalsCount?.count || 0) > 0;
    
    if (hasRelatedRecords) {
      return res.status(400).json({
        success: false,
        error: 'Project is already in use and cannot be deleted.'
      });
    }
    
    // Delete project
    await db.executeQuery('DELETE FROM projects WHERE id = ?', [id]);
    
    console.log('🗑️ Project deleted:', project[0].name);
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
      data: project[0]
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    
    // Check if error is a foreign key constraint violation
    // MySQL error code 1451: Cannot delete or update a parent row: a foreign key constraint fails
    const errorCode = error.code;
    const errorMessage = (error.message || '').toLowerCase();
    
    if (errorCode === 1451 || 
        errorCode === 'ER_ROW_IS_REFERENCED_2' ||
        errorMessage.includes('foreign key constraint') || 
        errorMessage.includes('cannot delete or update a parent row') ||
        errorMessage.includes('a foreign key constraint fails')) {
      return res.status(400).json({
        success: false,
        error: 'Project is already in use and cannot be deleted.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create client
exports.createClient = async (req, res) => {
  try {
    const { name, type, industry, contactPerson, contactEmail, contactPhone, address } = req.body;
    
    const clientId = uuidv4();
    
    // Generate client code
    const countQuery = 'SELECT COUNT(*) as count FROM clients';
    const countResult = await db.executeQuery(countQuery);
    const clientCode = `CLI${String(countResult[0].count + 1).padStart(3, '0')}`;
    
    const query = `
      INSERT INTO clients (
        id, client_code, name, type, industry, contact_person, contact_email, contact_phone, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert undefined values to null for MySQL
    await db.executeQuery(query, [
      clientId, 
      clientCode, 
      name, 
      type || 'client', 
      industry || null, 
      contactPerson || null, 
      contactEmail || null, 
      contactPhone || null,
      address || null
    ]);
    
    // Fetch the created client
    const createdClient = await db.executeQuery('SELECT * FROM clients WHERE id = ?', [clientId]);
    
    console.log('✅ Client created:', name);
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: createdClient[0]
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update client
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, industry, contactPerson, contactEmail, contactPhone, address } = req.body;
    
    // Check if client exists
    const [existingClient] = await db.executeQuery('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Check if name is being changed and if new name already exists
    if (name && name.trim() !== existingClient.name) {
      const [duplicateClient] = await db.executeQuery(
        'SELECT * FROM clients WHERE name = ? AND id != ? AND is_active = TRUE',
        [name.trim(), id]
      );
      
      if (duplicateClient) {
        return res.status(400).json({
          success: false,
          error: 'A client with this name already exists'
        });
      }
    }
    
    const query = `
      UPDATE clients SET
        name = ?,
        type = ?,
        industry = ?,
        contact_person = ?,
        contact_email = ?,
        contact_phone = ?,
        address = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.executeQuery(query, [
      name || existingClient.name,
      type || existingClient.type || 'client',
      industry || null,
      contactPerson || null,
      contactEmail || null,
      contactPhone || null,
      address || null,
      id
    ]);
    
    // Fetch the updated client
    const [updatedClient] = await db.executeQuery('SELECT * FROM clients WHERE id = ?', [id]);
    
    console.log('✅ Client updated:', updatedClient.name);
    
    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete client (soft delete by setting is_active to false)
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if client exists
    const [client] = await db.executeQuery('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
    
    // Check if client has related projects
    const [projectsCount] = await db.executeQuery(
      'SELECT COUNT(*) as count FROM projects WHERE client_id = ?',
      [id]
    );
    
    if ((projectsCount?.count || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Client is associated with projects and cannot be deleted. Please remove or reassign projects first.'
      });
    }
    
    // Soft delete by setting is_active to false
    await db.executeQuery(
      'UPDATE clients SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    console.log('🗑️ Client deleted (soft):', client.name);
    
    res.json({
      success: true,
      message: 'Client deleted successfully',
      data: client
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get project team members
exports.getProjectTeam = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const query = `
      SELECT 
        ptm.id,
        ptm.project_id as projectId,
        ptm.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        u.email,
        ptm.role,
        ptm.allocated_hours as allocatedHours,
        ptm.is_active as isActive,
        ptm.joined_at as joinedAt
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = ? AND ptm.is_active = TRUE
      ORDER BY u.name
    `;
    
    const teamMembers = await db.executeQuery(query, [projectId]);
    
    res.json({
      success: true,
      count: teamMembers.length,
      data: teamMembers
    });
  } catch (error) {
    console.error('Error fetching project team:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get Office 365 users for project manager selection
exports.getProjectManagers = async (req, res) => {
  try {
    console.log('📋 Fetching project managers (employees and groups) from Office 365...');
    
    const { employees, groups } = await getOffice365UsersAndGroups();
    
    res.json({
      success: true,
      source: 'Microsoft Graph API',
      employees: employees || [],
      groups: groups || [],
      count: {
        employees: employees?.length || 0,
        groups: groups?.length || 0,
        total: (employees?.length || 0) + (groups?.length || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching Office 365 users and groups:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users and groups from Office 365'
    });
  }
};

const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Helper function to fetch Azure config from the database
async function getAzureConfig() {
  const configs = await db.executeQuery(
    'SELECT config_key, config_value FROM system_configurations WHERE category = "Azure/Office 365"'
  );
  return configs.reduce((acc, c) => ({ ...acc, [c.config_key]: c.config_value }), {});
}

// Helper to generate a new unique employee_id
async function generateEmployeeId() {
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

// Helper function to create authenticated Graph client
async function createGraphClient() {
  const config = await getAzureConfig();
  
  if (!config.azure_tenant_id || !config.azure_client_id || !config.azure_client_secret) {
    throw new Error('Azure configuration is missing. Please configure Azure/Office 365 settings.');
  }

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
  
  return client;
}

async function syncEmployeesFromOffice365() {
  console.log('🔄 Starting Office 365 employee sync...');
  const config = await getAzureConfig();

  if (config.employee_sync_enabled !== 'true') {
    console.log('Sync skipped: employee_sync_enabled is not true in config.');
    return { success: false, message: 'Sync is disabled in configuration.' };
  }

  // Create authenticated client using helper function
  const client = await createGraphClient();
  
  // Fetch users from Office 365
  // Note: Adjust fields as needed, e.g., 'department', 'jobTitle'
  const o365Users = await client.api('/users')
    .select('id,displayName,mail,userPrincipalName,department,jobTitle')
    .get();

  const syncLog = {
    id: uuidv4(),
    source: 'office365',
    sync_type: 'employees',
    started_at: new Date(),
    records_fetched: o365Users.value.length,
    records_created: 0,
    records_updated: 0,
    status: 'pending'
  };

  try {
    // Upsert each user (Update or Insert)
    for (const o365User of o365Users.value) {
      // Use email or userPrincipalName as the unique identifier
      const email = o365User.mail || o365User.userPrincipalName;
      if (!email) {
          console.warn(`Skipping user ${o365User.displayName}: No email found.`);
          continue;
      }

      const [existing] = await db.executeQuery(
        'SELECT id FROM users WHERE email = ? OR office365_id = ?',
        [email, o365User.id]
      );
      
      if (existing) {
        // --- UPDATE ---
        await db.executeQuery(
          `UPDATE users SET 
             name = ?, 
             email = ?, 
             department = ?, 
             job_title = ?, 
             office365_synced_at = NOW(),
             is_active = 1 
           WHERE id = ?`,
          [o365User.displayName, email, o365User.department, 
           o365User.jobTitle, existing.id]
        );
        syncLog.records_updated++;
      } else {
        // --- INSERT ---
        const userId = uuidv4();
        const empId = await generateEmployeeId();
        await db.executeQuery(
          `INSERT INTO users (
             id, employee_id, office365_id, email, name, 
             department, job_title, office365_synced_at, created_at, is_active
           ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
          [userId, empId, o365User.id, email, o365User.displayName,
           o365User.department, o365User.jobTitle]
        );
        syncLog.records_created++;
      }
    }

    syncLog.status = 'success';
    console.log(`✅ Employee sync successful: ${syncLog.records_created} created, ${syncLog.records_updated} updated.`);

  } catch (error) {
      syncLog.status = 'failed';
      syncLog.error_message = error.message;
      console.error("❌ Employee sync failed:", error);
  } finally {
      syncLog.completed_at = new Date();
      syncLog.duration_seconds = Math.floor((syncLog.completed_at - syncLog.started_at) / 1000);
      
      // Log to database
      try {
          await db.executeQuery(
            `INSERT INTO sync_logs (id, source, sync_type, status, records_fetched,
             records_created, records_updated, started_at, completed_at, duration_seconds, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [syncLog.id, syncLog.source, syncLog.sync_type, syncLog.status,
             syncLog.records_fetched, syncLog.records_created, syncLog.records_updated,
             syncLog.started_at, syncLog.completed_at, syncLog.duration_seconds, syncLog.error_message || null]
          );
      } catch (dbError) {
          console.error("Failed to write to sync_logs table:", dbError);
      }
  }
  
  return syncLog;
}

// Helper function to check if an email belongs to an individual employee
// Individual employee emails typically follow pattern: firstname.lastname@kadellabs.com
function isIndividualEmployeeEmail(email) {
  if (!email || !email.trim()) {
    return false;
  }
  
  const emailLower = email.toLowerCase().trim();
  
  // Must end with @kadellabs.com
  if (!emailLower.endsWith('@kadellabs.com')) {
    return false;
  }
  
  // Extract the local part (before @)
  const localPart = emailLower.split('@')[0];
  
  // Exclude common group/shared mailbox patterns
  const groupPatterns = [
    'shared',
    'group',
    'team',
    'department',
    'division',
    'office',
    'info',
    'support',
    'help',
    'admin',
    'noreply',
    'no-reply',
    'mailbox',
    'distribution',
    'dl-', // Distribution list prefix
    'sg-', // Security group prefix
    'ug-', // Unified group prefix
  ];
  
  // Check if local part contains group indicators
  for (const pattern of groupPatterns) {
    if (localPart.includes(pattern)) {
      return false;
    }
  }
  
  // Individual employee emails typically have:
  // - At least one dot (firstname.lastname pattern)
  // - Or a single word that looks like a name (but this is less common)
  // - Should not be too short (exclude single letters or very short codes)
  // - Should not be all numbers
  
  // Check if it's all numbers or very short (likely a code/ID)
  if (localPart.length <= 2 || /^\d+$/.test(localPart)) {
    return false;
  }
  
  // Check if it contains a dot (common pattern: firstname.lastname)
  // This is the most reliable indicator of an individual email
  if (localPart.includes('.')) {
    const parts = localPart.split('.');
    // Should have at least 2 parts (firstname.lastname)
    // Each part should be at least 2 characters (reasonable name length)
    if (parts.length >= 2 && parts.every(part => part.length >= 2)) {
      return true;
    }
  }
  
  // If no dot, check if it looks like a single name (less common but possible)
  // Only accept if it's a reasonable length (3+ chars) and contains letters
  if (localPart.length >= 3 && /^[a-z]+$/.test(localPart)) {
    // Could be a single name, but be conservative - require dot for certainty
    // For now, we'll only accept emails with dots as individual employees
    return false;
  }
  
  // Default: if it doesn't match individual employee pattern, it's likely a group
  return false;
}

// Fetch groups from Office 365
async function getOffice365Groups() {
  try {
    console.log('📋 Fetching groups from Office 365...');
    const client = await createGraphClient();
    
    let allGroups = [];
    let nextLink = null;
    let pageCount = 0;
    
    do {
      pageCount++;
      let result;
      
      if (nextLink) {
        result = await client.api(nextLink).get();
      } else {
        // Fetch all groups (both mail-enabled and security groups)
        // Remove the filter to get all groups, then filter in JavaScript
        const query = client.api('/groups')
          .select('id,displayName,mail,mailEnabled,securityEnabled,groupTypes')
          .top(999);
        result = await query.get();
      }
      
      const pageGroups = result.value || [];
      allGroups = allGroups.concat(pageGroups);
      nextLink = result['@odata.nextLink'] || null;
      
      console.log(`  📄 Page ${pageCount}: Fetched ${pageGroups.length} groups, Total so far: ${allGroups.length}`);
    } while (nextLink);
    
    console.log(`📊 Total groups fetched: ${allGroups.length}`);
    
    // Filter valid groups (must have displayName and either mail or be a security group)
    const validGroups = allGroups.filter(group => {
      if (!group.displayName || !group.displayName.trim()) {
        return false;
      }
      
      // Include groups that have mail OR are security groups
      // Security groups might not have mail but are still valid
      const hasMail = group.mail && group.mail.trim();
      const isSecurityGroup = group.securityEnabled === true;
      
      if (!hasMail && !isSecurityGroup) {
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Filtered to ${validGroups.length} valid groups`);
    
    // Map to expected format: { id, name, email, type: 'group' }
    const groups = validGroups.map(group => ({
      id: group.id,
      name: group.displayName,
      email: group.mail || group.displayName.toLowerCase().replace(/\s+/g, '.') + '@kadellabs.com', // Fallback email for groups without mail
      type: 'group'
    }));
    
    // Sort by name
    groups.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ Returning ${groups.length} valid groups`);
    return groups;
  } catch (error) {
    console.error('❌ Error fetching Office 365 groups:', error);
    console.error('Error details:', error.message, error.stack);
    // Return empty array on error instead of throwing (groups are optional)
    return [];
  }
}

// Fetch users from Office 365 for project manager selection
async function getOffice365Users() {
  try {
    console.log('📋 Fetching active employees from Office 365...');
    const client = await createGraphClient();
    
    // Fetch all active users with pagination support
    // Filter: accountEnabled = true (only active users)
    // Exclude: Groups, Guests, and other non-user types
    let allUsers = [];
    let nextLink = null;
    let pageCount = 0;
    
    do {
      pageCount++;
      let result;
      
      if (nextLink) {
        // Handle pagination - Microsoft Graph uses @odata.nextLink
        result = await client.api(nextLink).get();
      } else {
        // First page - build query
        // Note: Cannot use orderby with filter in Microsoft Graph API
        // We'll sort the results in JavaScript after fetching
        const query = client.api('/users')
          .select('id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled,userType')
          .filter('accountEnabled eq true') // Only active users
          .top(999); // Maximum per page
        result = await query.get();
      }
      
      const pageUsers = result.value || [];
      allUsers = allUsers.concat(pageUsers);
      nextLink = result['@odata.nextLink'] || null;
      
      console.log(`  📄 Page ${pageCount}: Fetched ${pageUsers.length} users, Total so far: ${allUsers.length}`);
    } while (nextLink);
    
    console.log(`📊 Total users fetched: ${allUsers.length}`);
    
    // Separate groups and employees based on email format
    const groups = [];
    const employees = [];
    
    allUsers.forEach(user => {
      // Must have accountEnabled = true (already filtered, but double-check)
      if (user.accountEnabled !== true) {
        return;
      }
      
      // Must have a display name
      if (!user.displayName || !user.displayName.trim()) {
        return;
      }
      
      // Get email (prefer mail property, fallback to userPrincipalName)
      const email = (user.mail || user.userPrincipalName || '').trim();
      
      // If no email at all, skip
      if (!email) {
        console.log(`  ⚠️  Skipping user without email: ${user.displayName}`);
        return;
      }
      
      // Exclude if userType indicates it's a guest
      if (user.userType) {
        const userTypeLower = user.userType.toLowerCase();
        if (userTypeLower === 'guest') {
          console.log(`  ⚠️  Skipping ${user.userType}: ${user.displayName} (${email})`);
          return;
        }
      }
      
      // Exclude if email looks like a guest/external email
      const emailLower = email.toLowerCase();
      if (emailLower.includes('#ext#') || emailLower.includes('guest@')) {
        console.log(`  ⚠️  Skipping guest/external user: ${user.displayName} (${email})`);
        return;
      }
      
      // Classify based on email format
      if (isIndividualEmployeeEmail(email)) {
        // This is an individual employee
        employees.push({
          id: user.id,
          name: user.displayName,
          email: email,
          department: user.department || null,
          jobTitle: user.jobTitle || null,
          type: 'employee'
        });
      } else {
        // This is a group, shared mailbox, or functional mailbox
        groups.push({
          id: user.id,
          name: user.displayName,
          email: email,
          type: 'group'
        });
      }
    });
    
    // Sort by name for consistent ordering
    employees.sort((a, b) => a.name.localeCompare(b.name));
    groups.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ Classified: ${employees.length} employees, ${groups.length} groups`);
    console.log(`   - Employees: Individual email pattern (e.g., name.surname@kadellabs.com)`);
    console.log(`   - Groups: Shared mailboxes, functional mailboxes, or non-individual emails`);
    
    // Return both employees and groups found in users list
    return {
      employees: employees,
      groups: groups
    };
  } catch (error) {
    console.error('❌ Error fetching Office 365 users:', error);
    throw error;
  }
}

// Fetch both employees and groups from Office 365
async function getOffice365UsersAndGroups() {
  try {
    // Fetch groups from /groups endpoint (optional - for additional groups)
    const groupsFromEndpoint = await getOffice365Groups().catch(err => {
      console.error('❌ Error fetching groups from /groups endpoint, continuing with empty array:', err);
      return [];
    });
    
    // Fetch users and classify them based on email format
    const { employees: employeesFromUsers, groups: groupsFromUsers } = await getOffice365Users().catch(err => {
      console.error('❌ Error fetching users, returning empty arrays:', err);
      return { employees: [], groups: [] };
    });
    
    // Combine groups from both sources, removing duplicates by ID
    const allGroupsMap = new Map();
    
    // Add groups from /groups endpoint first
    groupsFromEndpoint.forEach(group => {
      allGroupsMap.set(group.id, group);
    });
    
    // Add groups found in users list (these take precedence if there's a duplicate)
    groupsFromUsers.forEach(group => {
      allGroupsMap.set(group.id, group);
    });
    
    const allGroups = Array.from(allGroupsMap.values());
    
    // Remove any employees that are also in groups (by ID) - shouldn't happen with email-based classification, but safety check
    const groupIds = new Set(allGroups.map(g => g.id));
    const uniqueEmployees = employeesFromUsers.filter(emp => !groupIds.has(emp.id));
    
    console.log(`📊 Final counts: ${uniqueEmployees.length} employees, ${allGroups.length} groups`);
    console.log(`   - Groups from /groups endpoint: ${groupsFromEndpoint.length}`);
    console.log(`   - Groups from users list (email-based classification): ${groupsFromUsers.length}`);
    
    return {
      employees: uniqueEmployees,
      groups: allGroups
    };
  } catch (error) {
    console.error('❌ Error fetching Office 365 users and groups:', error);
    throw error;
  }
}

module.exports = { 
  syncEmployeesFromOffice365,
  getOffice365Users,
  getOffice365Groups,
  getOffice365UsersAndGroups,
  getAzureConfig // Export for reuse
};
const nodemailer = require('nodemailer');
const db = require('../config/database');
require('dotenv').config();

/**
 * Email Service
 * Handles all email notifications for the timesheet management system
 * 
 * Features:
 * - Loads SMTP config from database (system_configurations table)
 * - Graceful fallback: logs to console if SMTP not configured
 * - Non-blocking: email failures won't crash the application
 * - Professional HTML email templates
 */

let transporter = null;
let isConfigured = false;
let smtpConfig = null;
let configLoadingPromise = null; // Prevent concurrent config loads
let configLoadFailed = false; // Track if config load has permanently failed

/**
 * Load SMTP configuration from database
 * @returns {Promise<boolean>} True if SMTP is configured, false otherwise
 */
async function loadConfig() {
  // If config load has already failed, don't retry
  if (configLoadFailed) {
    return false;
  }

  // If config is already loading, wait for it
  if (configLoadingPromise) {
    return await configLoadingPromise;
  }

  // If already configured, return immediately
  if (isConfigured && transporter) {
    return true;
  }

  // Start loading config
  configLoadingPromise = (async () => {
  try {
    let configMap = {};

    // First, try to load from environment variables (takes precedence)
    const envConfig = {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT,
      smtp_username: process.env.SMTP_USERNAME,
      smtp_password: process.env.SMTP_PASSWORD,
      smtp_from_email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME,
      smtp_from_name: process.env.SMTP_FROM_NAME || 'Timesheet Management System'
    };

    // Check if environment variables are set
    const envFieldsSet = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password'].filter(
      field => envConfig[field] && !envConfig[field].includes('your-') && !envConfig[field].includes('-here')
    );

    if (envFieldsSet.length === 4) {
      // Use environment variables (complete)
      console.log('📧 Loading SMTP configuration from environment variables (.env file)');
      configMap = envConfig;
    } else {
      // Try database first
      console.log('📧 Loading SMTP configuration from database...');
      try {
        const configs = await db.executeQuery(
          `SELECT config_key, config_value 
           FROM system_configurations 
           WHERE category = 'SMTP Settings'`
        );

        if (configs.length > 0) {
          // Convert array to object for easier access
          configs.forEach(c => {
            configMap[c.config_key] = c.config_value;
          });
          
          // Check if database config is complete
          const dbRequiredFields = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password'];
          const dbMissingFields = dbRequiredFields.filter(
            field => !configMap[field] || configMap[field].includes('your-') || configMap[field].includes('-here')
          );
          
          // If database config is incomplete but env vars exist, use env vars
          if (dbMissingFields.length > 0 && envFieldsSet.length > 0) {
            console.log('⚠️  Database SMTP config incomplete, falling back to environment variables');
            configMap = envConfig;
          } else if (dbMissingFields.length > 0) {
            console.log('⚠️  Database SMTP config incomplete and no environment variables found');
          }
        } else {
          // No database config - try env vars if available
          if (envFieldsSet.length > 0) {
            console.log('⚠️  No SMTP config in database, using environment variables instead');
            configMap = envConfig;
          } else {
            console.log('⚠️  No SMTP configuration found in database or environment variables');
          }
        }
      } catch (dbError) {
        // Database error - use env vars if available
        if (envFieldsSet.length > 0) {
          console.log('⚠️  Database connection failed, using environment variables instead');
          configMap = envConfig;
        } else {
          console.log('⚠️  Database connection failed and no environment variables available');
        }
      }
    }

    // Check if all required fields are present
    const requiredFields = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password'];
    const missingFields = requiredFields.filter(field => !configMap[field] || configMap[field].includes('your-') || configMap[field].includes('-here'));

    if (missingFields.length > 0) {
      console.log(`⚠️  SMTP configuration incomplete. Missing or placeholder values for: ${missingFields.join(', ')}`);
      console.log('⚠️  Emails will be logged to console only.');
      isConfigured = false;
      return false;
    }

    // Store config
    smtpConfig = {
      host: configMap.smtp_host,
      port: parseInt(configMap.smtp_port, 10),
      secure: configMap.smtp_port === '465', // SSL for port 465
      auth: {
        user: configMap.smtp_username,
        pass: configMap.smtp_password
      },
      from: configMap.smtp_from_email || configMap.smtp_username,
      fromName: configMap.smtp_from_name || 'Timesheet Management System'
    };

    // Create transporter
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Verify connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      isConfigured = true;
      configLoadFailed = false; // Reset failed flag on success
      return true;
    } catch (verifyError) {
      console.error('❌ SMTP connection verification failed:', verifyError.message);
      console.log('⚠️  Emails will be logged to console only.');
      isConfigured = false;
      transporter = null;
      return false;
    }
  } catch (error) {
    // Only log error once, then mark as failed to prevent repeated logs
    if (!configLoadFailed) {
      console.error('❌ Error loading SMTP configuration:', error.message);
      console.log('⚠️  Emails will be logged to console only.');
      console.log('💡 Note: This error will not be logged again. Fix database connection to enable email sending.');
      configLoadFailed = true;
    }
    isConfigured = false;
    return false;
  }
  })();

  try {
    const result = await configLoadingPromise;
    return result;
  } finally {
    configLoadingPromise = null;
  }
}

/**
 * Send email using nodemailer or log to console
 * @param {Object} mailOptions - Nodemailer mail options
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise
 */
async function sendEmail(mailOptions) {
  // Ensure config is loaded
  if (!isConfigured && transporter === null) {
    await loadConfig();
  }

  // If not configured, log to console
  if (!isConfigured || !transporter) {
    console.log('\n📧 EMAIL (Console Log - SMTP not configured):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (mailOptions.text) {
      console.log(mailOptions.text);
    }
    if (mailOptions.html) {
      console.log('(HTML content available but not displayed)');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return false;
  }

  // Send email
  try {
    const info = await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.from}>`,
      ...mailOptions
    });
    console.log(`✅ Email sent successfully to ${mailOptions.to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${mailOptions.to}:`, error.message);
    return false;
  }
}

/**
 * Generate HTML email template wrapper
 * @param {string} title - Email title
 * @param {string} content - HTML content
 * @returns {string} Complete HTML email
 */
function getEmailTemplate(title, content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated email from Timesheet Management System.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send timesheet submitted notification to manager
 * @param {Object} params - Email parameters
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeEmail - Employee email
 * @param {string} params.projectName - Project name
 * @param {string} params.weekStart - Week/period start
 * @param {string} params.weekEnd - Week/period end
 * @param {string} params.managerEmail - Manager email
 * @param {string} params.managerName - Manager name
 */
async function sendTimesheetSubmittedEmail({ employeeName, employeeEmail, projectName, weekStart, weekEnd, managerEmail, managerName }) {
  const subject = `Timesheet Submitted: ${employeeName} - ${projectName}`;
  
  const htmlContent = `
    <p>Hello ${managerName},</p>
    <p><strong>${employeeName}</strong> has submitted their timesheet for your review and approval.</p>
    
    <div class="info-box">
      <p><strong>Employee Name:</strong> ${employeeName}</p>
      <p><strong>Employee Email:</strong> ${employeeEmail}</p>
      <p><strong>Project:</strong> ${projectName}</p>
      <p><strong>Period:</strong> ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}</p>
    </div>
    
    <p><strong>Action Required:</strong> Please review and approve the timesheet at your earliest convenience.</p>
    
    <p>Thank you,<br>Timesheet Management System</p>
  `;

  const textContent = `
Hello ${managerName},

${employeeName} has submitted their timesheet for your review and approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIMESHEET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Employee Name: ${employeeName}
Employee Email: ${employeeEmail}
Project: ${projectName}
Period: ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}

Action Required: Please review and approve the timesheet at your earliest convenience.

Thank you,
Timesheet Management System
  `;

  return await sendEmail({
    to: managerEmail,
    subject: subject,
    html: getEmailTemplate('Timesheet Submitted', htmlContent),
    text: textContent
  });
}

/**
 * Send timesheet approved notification to employee
 * @param {Object} params - Email parameters
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeEmail - Employee email
 * @param {string} params.projectName - Project name
 * @param {string} params.weekStart - Week/period start
 * @param {string} params.weekEnd - Week/period end
 * @param {string} params.approverName - Approver name
 * @param {string} params.comments - Approval comments
 */
async function sendTimesheetApprovedEmail({ employeeName, employeeEmail, projectName, weekStart, weekEnd, approverName, comments }) {
  const subject = `Timesheet Approved: ${projectName} - ${weekStart}`;
  
  const htmlContent = `
    <p>Hello ${employeeName},</p>
    <p>Your timesheet has been <strong style="color: #10b981; font-size: 18px;">✓ APPROVED</strong> by <strong>${approverName}</strong>.</p>
    
    <div class="info-box">
      <p><strong>Project:</strong> ${projectName}</p>
      <p><strong>Period:</strong> ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}</p>
      <p><strong>Approved By:</strong> ${approverName}</p>
      ${comments && comments.trim() ? `<p><strong>Comments/Remarks:</strong><br>${comments}</p>` : ''}
    </div>
    
    <p>Thank you for your timely submission!</p>
    
    <p>Best regards,<br>Timesheet Management System</p>
  `;

  const textContent = `
Hello ${employeeName},

Your timesheet has been APPROVED by ${approverName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIMESHEET APPROVAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: ${projectName}
Period: ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}
Approved By: ${approverName}
${comments && comments.trim() ? `Comments/Remarks: ${comments}` : ''}

Thank you for your timely submission!

Best regards,
Timesheet Management System
  `;

  return await sendEmail({
    to: employeeEmail,
    subject: subject,
    html: getEmailTemplate('Timesheet Approved', htmlContent),
    text: textContent
  });
}

/**
 * Send timesheet rejected notification to employee
 * @param {Object} params - Email parameters
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeEmail - Employee email
 * @param {string} params.projectName - Project name
 * @param {string} params.weekStart - Week/period start
 * @param {string} params.weekEnd - Week/period end
 * @param {string} params.approverName - Approver name
 * @param {string} params.comments - Rejection comments
 */
async function sendTimesheetRejectedEmail({ employeeName, employeeEmail, projectName, weekStart, weekEnd, approverName, comments }) {
  const subject = `Timesheet Rejected: ${projectName} - ${weekStart}`;
  
  // Ensure comments are provided (required for rejection)
  const rejectionReason = comments && comments.trim() ? comments : 'No specific reason provided. Please contact your manager for details.';
  
  const htmlContent = `
    <p>Hello ${employeeName},</p>
    <p>Your timesheet has been <strong style="color: #ef4444; font-size: 18px;">✗ REJECTED</strong> by <strong>${approverName}</strong>.</p>
    
    <div class="info-box">
      <p><strong>Project:</strong> ${projectName}</p>
      <p><strong>Period:</strong> ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}</p>
      <p><strong>Rejected By:</strong> ${approverName}</p>
      <p><strong>Rejection Reason/Remarks:</strong></p>
      <p style="background-color: #fef2f2; padding: 10px; border-left: 3px solid #ef4444; margin: 10px 0;">${rejectionReason}</p>
    </div>
    
    <p><strong>Action Required:</strong> Please review the feedback above and resubmit your timesheet with the necessary corrections.</p>
    
    <p>If you have any questions or need clarification, please contact <strong>${approverName}</strong>.</p>
    
    <p>Best regards,<br>Timesheet Management System</p>
  `;

  const textContent = `
Hello ${employeeName},

Your timesheet has been REJECTED by ${approverName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIMESHEET REJECTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: ${projectName}
Period: ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}
Rejected By: ${approverName}

REJECTION REASON/REMARKS:
${rejectionReason}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED: Please review the feedback above and resubmit your timesheet with the necessary corrections.

If you have any questions or need clarification, please contact ${approverName}.

Best regards,
Timesheet Management System
  `;

  return await sendEmail({
    to: employeeEmail,
    subject: subject,
    html: getEmailTemplate('Timesheet Rejected', htmlContent),
    text: textContent
  });
}

/**
 * Send timesheet reminder notification to employee
 * @param {Object} params - Email parameters
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeEmail - Employee email
 * @param {string} params.weekStart - Week/period start
 * @param {string} params.weekEnd - Week/period end
 * @param {string} params.missingDays - Missing days (optional)
 */
async function sendTimesheetReminderEmail({ employeeName, employeeEmail, weekStart, weekEnd, missingDays }) {
  const subject = `Reminder: Complete Your Timesheet - ${weekStart}`;
  
  const htmlContent = `
    <p>Hello ${employeeName},</p>
    <p>This is a friendly reminder that your timesheet for <strong>${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''}</strong> is pending submission.</p>
    
    ${missingDays ? `
    <div class="info-box">
      <p><strong>Missing Days:</strong> ${missingDays}</p>
    </div>
    ` : ''}
    
    <p>Please complete and submit your timesheet at your earliest convenience.</p>
    
    <p>Thank you,<br>Timesheet Management System</p>
  `;

  const textContent = `
Hello ${employeeName},

This is a friendly reminder that your timesheet for ${weekStart}${weekEnd !== weekStart ? ` - ${weekEnd}` : ''} is pending submission.

${missingDays ? `Missing Days: ${missingDays}\n\n` : ''}
Please complete and submit your timesheet at your earliest convenience.

Thank you,
Timesheet Management System
  `;

  return await sendEmail({
    to: employeeEmail,
    subject: subject,
    html: getEmailTemplate('Timesheet Reminder', htmlContent),
    text: textContent
  });
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Send project access request notification to admin
 * @param {Object} params - Email parameters
 * @param {string} params.requesterName - Requester name
 * @param {string} params.requesterRole - Requester role (Employee/Project Manager)
 * @param {string} params.requestDescription - Request description/message
 * @param {string} params.submittedDateTime - Submission date and time
 * @param {string} params.adminEmail - Admin email address
 * @param {string} params.systemName - System/Application name (optional)
 * @returns {Promise<boolean>} True if sent successfully
 */
async function sendProjectAccessRequestEmail({ requesterName, requesterRole, requestDescription, submittedDateTime, adminEmail, systemName = 'Timesheet Management System' }) {
  console.log(`📧 sendProjectAccessRequestEmail called for ${adminEmail}`);
  
  const subject = 'New Project Access Request – Action Required';
  
  // Escape user input to prevent XSS
  const safeRequesterName = escapeHtml(requesterName);
  const safeRequesterRole = escapeHtml(requesterRole);
  const safeRequestDescription = escapeHtml(requestDescription);
  const safeSystemName = escapeHtml(systemName);
  
  // Try to extract project name and client name from description (basic parsing)
  // Look for patterns like "Project: X" or "Client: Y" or similar
  let projectName = 'See description below';
  let clientName = 'See description below';
  
  const projectMatch = requestDescription.match(/(?:project|project name)[\s:]+([^\n,]+)/i);
  const clientMatch = requestDescription.match(/(?:client|client name)[\s:]+([^\n,]+)/i);
  
  if (projectMatch && projectMatch[1]) {
    projectName = escapeHtml(projectMatch[1].trim());
  }
  if (clientMatch && clientMatch[1]) {
    clientName = escapeHtml(clientMatch[1].trim());
  }
  
  const htmlContent = `
    <p>Dear Admin,</p>
    <p>A new project access request has been submitted and requires your review.</p>
    
    <div class="info-box">
      <p><strong>Request Details:</strong></p>
      <p><strong>Requested By:</strong> ${safeRequesterName}</p>
      <p><strong>Role:</strong> ${safeRequesterRole}</p>
      <p><strong>Project Name:</strong> ${projectName}</p>
      <p><strong>Client Name:</strong> ${clientName}</p>
      <p><strong>Submitted On:</strong> ${submittedDateTime}</p>
    </div>
    
    <div class="info-box">
      <p><strong>Description / Additional Details:</strong></p>
      <p style="white-space: pre-wrap; margin-top: 10px;">${safeRequestDescription.replace(/\n/g, '<br>')}</p>
    </div>
    
    <p>Please log in to the admin panel and navigate to:</p>
    <p><strong>Action Dropdown → Notifications</strong></p>
    <p>to review this request.</p>
    
    <p>You may <strong>Approve</strong> or <strong>Reject</strong> the request based on the provided details.</p>
    <p>If you require further clarification, you may contact the requester directly.</p>
    
    <p>Thank you for your attention.</p>
    
    <p>Best regards,<br>${safeSystemName}</p>
    <p style="font-size: 11px; color: #6b7280; margin-top: 20px;">Automated Notification – Please do not reply</p>
  `;

  const textContent = `
Dear Admin,

A new project access request has been submitted and requires your review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUEST DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Requested By: ${requesterName}
Role: ${requesterRole}
Project Name: ${projectName.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")}
Client Name: ${clientName.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")}
Submitted On: ${submittedDateTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIPTION / ADDITIONAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${requestDescription}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please log in to the admin panel and navigate to:
Action Dropdown → Notifications
to review this request.

You may Approve or Reject the request based on the provided details.
If you require further clarification, you may contact the requester directly.

Thank you for your attention.

Best regards,
${systemName}

Automated Notification – Please do not reply
  `;

  console.log(`📧 Preparing email for ${adminEmail} with subject: ${subject}`);
  
  const emailResult = await sendEmail({
    to: adminEmail,
    subject: subject,
    html: getEmailTemplate('New Project Access Request', htmlContent),
    text: textContent
  });
  
  if (emailResult) {
    console.log(`✅ Email sent successfully to ${adminEmail}`);
  } else {
    console.log(`⚠️  Email sending returned false for ${adminEmail} - check SMTP configuration`);
  }
  
  return emailResult;
}

/**
 * Send test email
 * @param {string} toEmail - Recipient email address
 * @returns {Promise<boolean>} True if sent successfully
 */
async function sendTestEmail(toEmail) {
  const subject = 'Test Email - Timesheet Management System';
  
  const htmlContent = `
    <p>This is a test email from the Timesheet Management System.</p>
    <p>If you received this email, your SMTP configuration is working correctly!</p>
    <div class="info-box">
      <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
  `;

  const textContent = `
This is a test email from the Timesheet Management System.

If you received this email, your SMTP configuration is working correctly!

Test Time: ${new Date().toLocaleString()}
  `;

  return await sendEmail({
    to: toEmail,
    subject: subject,
    html: getEmailTemplate('Test Email', htmlContent),
    text: textContent
  });
}

// Export functions
module.exports = {
  loadConfig,
  sendEmail,
  sendTimesheetSubmittedEmail,
  sendTimesheetApprovedEmail,
  sendTimesheetRejectedEmail,
  sendTimesheetReminderEmail,
  sendProjectAccessRequestEmail,
  sendTestEmail
};


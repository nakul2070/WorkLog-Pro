-- ============================================
-- Timesheet Management System - Seed Data
-- Version: 1.0.0
-- Description: Sample data for development and testing
-- ============================================

USE timesheet_management;

-- ============================================
-- 1. SEED USERS (Employees)
-- ============================================

INSERT INTO users (id, employee_id, office365_id, email, name, department, job_title, manager_id, is_admin, is_project_manager, is_active, office365_synced_at) VALUES
-- Insert users without managers first
('user-001', 'EMP001', 'o365-001', 'john.smith@kadellabs.com', 'John Smith', 'Development', 'Senior Developer', NULL, TRUE, TRUE, TRUE, NOW()),
('user-002', 'EMP002', 'o365-002', 'sarah.johnson@kadellabs.com', 'Sarah Johnson', 'HR', 'HR Manager', NULL, TRUE, TRUE, TRUE, NOW()),
('user-006', 'EMP006', 'o365-006', 'robert.kim@kadellabs.com', 'Robert Kim', 'Operations', 'Operations Manager', NULL, FALSE, TRUE, TRUE, NOW()),
('user-007', 'EMP007', 'o365-007', 'emily.watson@kadellabs.com', 'Dr. Emily Watson', 'Research', 'Research Lead', NULL, FALSE, TRUE, TRUE, NOW()),
-- Now insert users with managers
('user-003', 'EMP003', 'o365-003', 'alice.johnson@kadellabs.com', 'Alice Johnson', 'Development', 'Developer', 'user-002', FALSE, FALSE, TRUE, NOW()),
('user-004', 'EMP004', 'o365-004', 'mike.chen@kadellabs.com', 'Mike Chen', 'Development', 'Developer', 'user-002', FALSE, FALSE, TRUE, NOW()),
('user-005', 'EMP005', 'o365-005', 'michael.chen@kadellabs.com', 'Michael Chen', 'Development', 'Team Lead', 'user-006', FALSE, TRUE, TRUE, NOW()),
('user-008', 'EMP008', 'o365-008', 'david.rodriguez@kadellabs.com', 'David Rodriguez', 'Development', 'Senior Developer', 'user-005', FALSE, FALSE, TRUE, NOW());

-- ============================================
-- 2. SEED CLIENTS
-- ============================================

INSERT INTO clients (id, client_code, name, type, industry, contact_person, contact_email, contact_phone, is_active) VALUES
('client-001', 'CLI001', 'Microsoft', 'client', 'Technology', 'Jane Doe', 'jane.doe@microsoft.com', '+1-555-0101', TRUE),
('client-002', 'CLI002', 'First National Bank', 'client', 'Banking', 'Robert Smith', 'robert.smith@fnb.com', '+1-555-0102', TRUE),
('client-003', 'CLI003', 'TechCorp Solutions', 'client', 'Technology', 'Lisa Anderson', 'lisa@techcorp.com', '+1-555-0103', TRUE),
('client-004', 'CLI004', 'StartupXYZ', 'client', 'Startup', 'Mark Johnson', 'mark@startupxyz.com', '+1-555-0104', TRUE),
('client-005', 'CLI005', 'Global Manufacturing Inc', 'client', 'Manufacturing', 'Patricia Williams', 'patricia@globalmanuf.com', '+1-555-0105', TRUE),
('client-006', 'CLI006', 'Kadel Labs', 'internal', 'Technology', 'Admin Team', 'admin@kadellabs.com', '+1-555-0100', TRUE);

-- ============================================
-- 3. SEED PROJECTS
-- ============================================

INSERT INTO projects (id, project_code, name, description, client_id, project_manager_id, start_date, end_date, estimated_hours, status, priority, is_billable) VALUES
('proj-001', 'PRJ001', 'Kadel Labs - Internal Development', 'Internal platform development and maintenance', 'client-006', 'user-002', '2024-01-15', '2024-12-31', 2000, 'active', 'high', FALSE),
('proj-002', 'PRJ002', 'Microsoft Azure Migration', 'Cloud migration project for enterprise client', 'client-001', 'user-005', '2024-03-01', '2024-09-30', 1500, 'active', 'critical', TRUE),
('proj-003', 'PRJ003', 'Banking Portal Development', 'Modern web portal for banking services', 'client-002', 'user-006', '2024-05-01', '2025-02-28', 3000, 'active', 'high', TRUE),
('proj-004', 'PRJ004', 'TechCorp Cloud Infrastructure', 'Infrastructure setup and optimization', 'client-003', 'user-005', '2024-06-01', '2024-11-30', 1200, 'active', 'medium', TRUE),
('proj-005', 'PRJ005', 'StartupXYZ E-commerce Platform', 'Full-stack e-commerce solution', 'client-004', 'user-007', '2024-07-01', '2025-01-31', 2500, 'active', 'high', TRUE);

-- ============================================
-- 4. SEED PROJECT TEAM MEMBERS
-- ============================================

INSERT INTO project_team_members (id, project_id, user_id, role, allocated_hours, is_active) VALUES
-- Project 1: Internal Development
('ptm-001', 'proj-001', 'user-001', 'Lead Developer', 500, TRUE),
('ptm-002', 'proj-001', 'user-003', 'Developer', 400, TRUE),
('ptm-003', 'proj-001', 'user-004', 'Developer', 400, TRUE),

-- Project 2: Azure Migration
('ptm-004', 'proj-002', 'user-001', 'Senior Developer', 300, TRUE),
('ptm-005', 'proj-002', 'user-004', 'Developer', 400, TRUE),
('ptm-006', 'proj-002', 'user-008', 'Developer', 350, TRUE),

-- Project 3: Banking Portal
('ptm-007', 'proj-003', 'user-003', 'Developer', 600, TRUE),
('ptm-008', 'proj-003', 'user-008', 'Senior Developer', 500, TRUE),

-- Project 4: Cloud Infrastructure
('ptm-009', 'proj-004', 'user-001', 'Senior Developer', 300, TRUE),
('ptm-010', 'proj-004', 'user-004', 'Developer', 400, TRUE),

-- Project 5: E-commerce Platform
('ptm-011', 'proj-005', 'user-003', 'Developer', 500, TRUE),
('ptm-012', 'proj-005', 'user-008', 'Senior Developer', 600, TRUE);

-- ============================================
-- 5. SEED HOLIDAYS (2025)
-- ============================================

INSERT INTO holidays (id, date, title, description, type, is_optional, hrone_synced_at) VALUES
('holiday-001', '2025-01-01', 'New Year''s Day', 'National Holiday', 'public', FALSE, NOW()),
('holiday-002', '2025-01-26', 'Republic Day', 'National Holiday', 'public', FALSE, NOW()),
('holiday-003', '2025-03-14', 'Holi', 'Festival of Colors', 'public', FALSE, NOW()),
('holiday-004', '2025-04-10', 'Mahavir Jayanti', 'Religious Holiday', 'optional', TRUE, NOW()),
('holiday-005', '2025-04-18', 'Good Friday', 'Christian Holiday', 'public', FALSE, NOW()),
('holiday-006', '2025-08-15', 'Independence Day', 'National Holiday', 'public', FALSE, NOW()),
('holiday-007', '2025-10-02', 'Gandhi Jayanti', 'National Holiday', 'public', FALSE, NOW()),
('holiday-008', '2025-10-24', 'Diwali', 'Festival of Lights', 'public', FALSE, NOW()),
('holiday-009', '2025-12-25', 'Christmas', 'Christmas Day', 'public', FALSE, NOW());

-- ============================================
-- 6. SEED LEAVES (October 2025)
-- ============================================

INSERT INTO leaves (id, user_id, leave_type, start_date, end_date, total_days, reason, status, applied_date, approved_by, hrone_synced_at) VALUES
('leave-001', 'user-001', 'Annual Leave', '2025-10-09', '2025-10-10', 2, 'Personal work', 'approved', '2025-10-01', 'Sarah Johnson', NOW()),
('leave-002', 'user-003', 'Sick Leave', '2025-10-15', '2025-10-16', 2, 'Medical appointment', 'approved', '2025-10-10', 'Sarah Johnson', NOW()),
('leave-003', 'user-004', 'Casual Leave', '2025-10-20', '2025-10-20', 1, 'Family function', 'approved', '2025-10-12', 'Sarah Johnson', NOW());

-- ============================================
-- 7. SEED TIMESHEETS (October 2025)
-- ============================================

INSERT INTO timesheets (id, timesheet_code, user_id, year, month, total_hours, total_working_days, total_holidays, total_leaves, status, submitted_at) VALUES
-- Alice Johnson - Submitted
('ts-001', 'TS2025-10-001', 'user-003', 2025, 10, 24, 3, 0, 2, 'submitted', '2025-10-07 10:30:00'),

-- Mike Chen - Submitted
('ts-002', 'TS2025-10-002', 'user-004', 2025, 10, 16, 2, 0, 1, 'submitted', '2025-10-07 11:00:00'),

-- John Smith - Draft
('ts-003', 'TS2025-10-003', 'user-001', 2025, 10, 40, 5, 0, 2, 'draft', NULL);

-- ============================================
-- 8. SEED TIMESHEET ENTRIES
-- ============================================

INSERT INTO timesheet_entries (id, timesheet_id, project_id, entry_date, hours, task_description, is_holiday, is_leave, is_weekend) VALUES
-- Alice Johnson (TS-001) entries
('entry-001', 'ts-001', 'proj-001', '2025-10-02', 5.0, 'Frontend component development', FALSE, FALSE, FALSE),
('entry-002', 'ts-001', 'proj-002', '2025-10-02', 3.0, 'Azure migration planning', FALSE, FALSE, FALSE),
('entry-003', 'ts-001', 'proj-001', '2025-10-03', 4.0, 'API integration', FALSE, FALSE, FALSE),
('entry-004', 'ts-001', 'proj-003', '2025-10-03', 2.0, 'Database schema design', FALSE, FALSE, FALSE),
('entry-005', 'ts-001', 'proj-002', '2025-10-03', 2.0, 'Code review', FALSE, FALSE, FALSE),
('entry-006', 'ts-001', 'proj-002', '2025-10-06', 8.0, 'Full day Azure migration', FALSE, FALSE, FALSE),

-- Mike Chen (TS-002) entries
('entry-007', 'ts-002', 'proj-002', '2025-10-07', 8.0, 'Backend API development', FALSE, FALSE, FALSE),
('entry-008', 'ts-002', 'proj-004', '2025-10-08', 8.0, 'Infrastructure setup', FALSE, FALSE, FALSE),

-- John Smith (TS-003) entries - Draft
('entry-009', 'ts-003', 'proj-001', '2025-10-01', 6.0, 'Architecture review', FALSE, FALSE, FALSE),
('entry-010', 'ts-003', 'proj-002', '2025-10-01', 2.0, 'Client meeting', FALSE, FALSE, FALSE),
('entry-011', 'ts-003', 'proj-001', '2025-10-02', 8.0, 'Code review and mentoring', FALSE, FALSE, FALSE),
('entry-012', 'ts-003', 'proj-002', '2025-10-03', 8.0, 'Azure architecture planning', FALSE, FALSE, FALSE),
('entry-013', 'ts-003', 'proj-001', '2025-10-06', 8.0, 'Feature development', FALSE, FALSE, FALSE),
('entry-014', 'ts-003', 'proj-002', '2025-10-07', 8.0, 'Migration implementation', FALSE, FALSE, FALSE);

-- ============================================
-- 9. SEED APPROVALS
-- ============================================

INSERT INTO approvals (id, timesheet_id, project_id, project_manager_id, status, total_hours, comments) VALUES
-- Alice Johnson's timesheet approvals
('approval-001', 'ts-001', 'proj-001', 'user-002', 'pending', 9.0, NULL),
('approval-002', 'ts-001', 'proj-002', 'user-005', 'pending', 13.0, NULL),
('approval-003', 'ts-001', 'proj-003', 'user-006', 'pending', 2.0, NULL),

-- Mike Chen's timesheet approvals
('approval-004', 'ts-002', 'proj-002', 'user-005', 'pending', 8.0, NULL),
('approval-005', 'ts-002', 'proj-004', 'user-005', 'pending', 8.0, NULL);

-- ============================================
-- 10. SEED SYSTEM CONFIGURATIONS
-- ============================================

INSERT INTO system_configurations (id, category, config_key, config_value, description, is_secret) VALUES
-- SMTP Settings
('config-001', 'SMTP Settings', 'smtp_host', 'smtp.gmail.com', 'SMTP server hostname', FALSE),
('config-002', 'SMTP Settings', 'smtp_port', '587', 'SMTP server port', FALSE),
('config-003', 'SMTP Settings', 'smtp_username', 'notifications@kadellabs.com', 'SMTP authentication username', FALSE),
('config-004', 'SMTP Settings', 'smtp_password', 'your-smtp-password-here', 'SMTP authentication password', TRUE),
('config-005', 'SMTP Settings', 'smtp_from_email', 'noreply@kadellabs.com', 'Default FROM email address', FALSE),

-- Admin Settings
('config-006', 'Admin Settings', 'default_admin_email', 'admin@kadellabs.com', 'Default admin email for notifications', FALSE),
('config-007', 'Admin Settings', 'admin_notification_enabled', 'true', 'Enable/disable admin notifications', FALSE),
('config-008', 'Admin Settings', 'auto_approve_threshold_hours', '8', 'Auto-approve timesheets under this threshold', FALSE),

-- Timesheet Configuration
('config-028', 'Timesheet Configuration', 'submit_start_date', '1', 'Day of month when timesheet submission window opens (1-31)', FALSE),
('config-029', 'Timesheet Configuration', 'submit_end_date', '7', 'Day of month when timesheet submission window closes (1-31)', FALSE),

-- Azure/Office 365
('config-009', 'Azure/Office 365', 'azure_tenant_id', 'your-tenant-id-here', 'Azure AD Tenant ID', FALSE),
('config-010', 'Azure/Office 365', 'azure_client_id', 'your-client-id-here', 'Azure AD Application Client ID', FALSE),
('config-011', 'Azure/Office 365', 'azure_client_secret', 'your-client-secret-here', 'Azure AD Application Client Secret', TRUE),
('config-012', 'Azure/Office 365', 'graph_api_url', 'https://graph.microsoft.com/v1.0', 'Microsoft Graph API base URL', FALSE),
('config-013', 'Azure/Office 365', 'employee_sync_enabled', 'true', 'Enable automatic employee sync from Office 365', FALSE),
('config-023', 'Azure/Office 365', 'azure_sso_enabled', 'true', 'Enable Azure AD SSO for user authentication', FALSE),
('config-024', 'Azure/Office 365', 'azure_redirect_uri', 'https://your-app-url.com/auth/callback', 'OAuth redirect URI after authentication', FALSE),
('config-025', 'Azure/Office 365', 'azure_auth_scope', 'openid profile email User.Read', 'OAuth scopes for authentication', FALSE),
('config-026', 'Azure/Office 365', 'azure_authority_url', 'https://login.microsoftonline.com/', 'Azure AD authority URL', FALSE),
('config-027', 'Azure/Office 365', 'azure_token_expiration', '3600', 'Access token expiration in seconds (1 hour)', FALSE),

-- HROne Integration
('config-014', 'HROne Integration', 'hrone_api_key', 'your-hrone-api-key-here', 'HROne API authentication key', TRUE),
('config-015', 'HROne Integration', 'hrone_api_url', 'https://api.hrone.cloud/v1', 'HROne API base URL', FALSE),
('config-016', 'HROne Integration', 'hrone_sync_enabled', 'true', 'Enable automatic holiday/leave sync', FALSE),
('config-017', 'HROne Integration', 'hrone_sync_schedule', '0 2 * * *', 'Cron schedule for sync (daily at 2 AM)', FALSE),

-- System Settings
('config-018', 'System Settings', 'app_name', 'Kadel Labs Timesheet Management', 'Application display name', FALSE),
('config-019', 'System Settings', 'timezone', 'Asia/Kolkata', 'Default system timezone', FALSE),
('config-020', 'System Settings', 'date_format', 'DD/MM/YYYY', 'Date display format', FALSE),
('config-021', 'System Settings', 'currency', 'INR', 'Default currency code', FALSE),
('config-022', 'System Settings', 'working_hours_per_day', '8', 'Standard working hours per day', FALSE);

-- ============================================
-- 11. SEED SYNC LOGS
-- ============================================

INSERT INTO sync_logs (id, source, sync_type, status, records_fetched, records_created, records_updated, records_failed, started_at, completed_at, duration_seconds) VALUES
('sync-001', 'office365', 'employees', 'success', 8, 8, 0, 0, '2025-10-01 02:00:00', '2025-10-01 02:02:15', 135),
('sync-002', 'hrone', 'holidays', 'success', 9, 9, 0, 0, '2025-10-01 02:05:00', '2025-10-01 02:05:45', 45),
('sync-003', 'hrone', 'leaves', 'success', 3, 3, 0, 0, '2025-10-01 02:06:00', '2025-10-01 02:06:20', 20);

-- ============================================
-- 12. SEED AUDIT LOGS
-- ============================================

INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at) VALUES
('audit-001', 'user-001', 'CREATE', 'project', 'proj-001', NULL, '{"name":"Kadel Labs - Internal Development","status":"active"}', '192.168.1.100', '2024-01-15 09:00:00'),
('audit-002', 'user-002', 'UPDATE', 'user', 'user-003', '{"is_admin":false}', '{"is_admin":false}', '192.168.1.101', '2024-02-01 10:30:00'),
('audit-003', 'user-003', 'CREATE', 'timesheet', 'ts-001', NULL, '{"month":10,"year":2025,"status":"draft"}', '192.168.1.102', '2025-10-02 08:00:00'),
('audit-004', 'user-003', 'UPDATE', 'timesheet', 'ts-001', '{"status":"draft"}', '{"status":"submitted"}', '192.168.1.102', '2025-10-07 10:30:00');

-- ============================================
-- 13. SEED NOTIFICATIONS (Sample)
-- ============================================

INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, is_read) VALUES
('notif-001', 'user-002', 'timesheet_submitted', 'New Timesheet Submitted', 'Alice Johnson has submitted timesheet for October 2025', 'timesheet', 'ts-001', FALSE),
('notif-002', 'user-005', 'timesheet_submitted', 'New Timesheet Submitted', 'Mike Chen has submitted timesheet for October 2025', 'timesheet', 'ts-002', FALSE),
('notif-003', 'user-003', 'project_assigned', 'Assigned to New Project', 'You have been assigned to Banking Portal Development', 'project', 'proj-003', TRUE);

-- ============================================
-- SEED DATA COMPLETE
-- ============================================

-- Verify data counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'project_team_members', COUNT(*) FROM project_team_members
UNION ALL
SELECT 'timesheets', COUNT(*) FROM timesheets
UNION ALL
SELECT 'timesheet_entries', COUNT(*) FROM timesheet_entries
UNION ALL
SELECT 'approvals', COUNT(*) FROM approvals
UNION ALL
SELECT 'holidays', COUNT(*) FROM holidays
UNION ALL
SELECT 'leaves', COUNT(*) FROM leaves
UNION ALL
SELECT 'system_configurations', COUNT(*) FROM system_configurations
UNION ALL
SELECT 'sync_logs', COUNT(*) FROM sync_logs
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- ============================================
-- Timesheet Management System - Database Schema
-- Version: 1.0.0
-- Description: Complete database schema creation
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS timesheet_management 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE timesheet_management;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  office365_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  job_title VARCHAR(100),
  manager_id VARCHAR(36),
  
  is_admin BOOLEAN DEFAULT FALSE,
  is_project_manager BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  office365_synced_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_employee_id (employee_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_admin (is_admin),
  INDEX idx_is_project_manager (is_project_manager)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY,
  client_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('client', 'internal') DEFAULT 'client',
  industry VARCHAR(100),
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_is_active (is_active),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id VARCHAR(36) PRIMARY KEY,
  project_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  client_id VARCHAR(36) NOT NULL,
  project_manager_id VARCHAR(36) NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE,
  estimated_hours INT,
  
  status ENUM('active', 'on-hold', 'completed', 'cancelled') DEFAULT 'active',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  
  is_billable BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (project_manager_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_status (status),
  INDEX idx_client_id (client_id),
  INDEX idx_project_manager_id (project_manager_id),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. PROJECT TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE project_team_members (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(50),
  allocated_hours INT,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_project_user (project_id, user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. TIMESHEETS TABLE
-- ============================================
CREATE TABLE timesheets (
  id VARCHAR(36) PRIMARY KEY,
  timesheet_code VARCHAR(50) UNIQUE NOT NULL,
  
  user_id VARCHAR(36) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  
  total_hours DECIMAL(6,2) DEFAULT 0,
  total_working_days INT DEFAULT 0,
  total_holidays INT DEFAULT 0,
  total_leaves INT DEFAULT 0,
  
  status ENUM('draft', 'submitted', 'approved', 'rejected', 'revision_required') DEFAULT 'draft',
  
  submitted_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_user_month (user_id, year, month),
  INDEX idx_status (status),
  INDEX idx_year_month (year, month),
  INDEX idx_user_date (user_id, year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. TIMESHEET ENTRIES TABLE
-- ============================================
CREATE TABLE timesheet_entries (
  id VARCHAR(36) PRIMARY KEY,
  
  timesheet_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  
  entry_date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL,
  task_description TEXT,
  
  is_holiday BOOLEAN DEFAULT FALSE,
  is_leave BOOLEAN DEFAULT FALSE,
  is_weekend BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  
  INDEX idx_timesheet_id (timesheet_id),
  INDEX idx_project_id (project_id),
  INDEX idx_entry_date (entry_date),
  INDEX idx_timesheet_date (timesheet_id, entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. APPROVALS TABLE
-- ============================================
CREATE TABLE approvals (
  id VARCHAR(36) PRIMARY KEY,
  
  timesheet_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  project_manager_id VARCHAR(36) NOT NULL,
  
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  
  total_hours DECIMAL(6,2),
  
  comments TEXT,
  
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (project_manager_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_status (status),
  INDEX idx_project_manager_id (project_manager_id),
  INDEX idx_timesheet_id (timesheet_id),
  INDEX idx_pending_approvals (status, project_manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. HOLIDAYS TABLE
-- ============================================
CREATE TABLE holidays (
  id VARCHAR(36) PRIMARY KEY,
  
  date DATE UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('public', 'optional', 'regional') DEFAULT 'public',
  
  is_optional BOOLEAN DEFAULT FALSE,
  
  hrone_id VARCHAR(255),
  hrone_synced_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_date (date),
  INDEX idx_type (type),
  INDEX idx_year (YEAR(date))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. LEAVES TABLE
-- ============================================
CREATE TABLE leaves (
  id VARCHAR(36) PRIMARY KEY,
  
  user_id VARCHAR(36) NOT NULL,
  
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL,
  
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
  
  applied_date DATE,
  approved_by VARCHAR(255),
  
  hrone_id VARCHAR(255),
  hrone_synced_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_id (user_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_status (status),
  INDEX idx_user_dates (user_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. SYSTEM CONFIGURATIONS TABLE
-- ============================================
CREATE TABLE system_configurations (
  id VARCHAR(36) PRIMARY KEY,
  
  category VARCHAR(100) NOT NULL,
  config_key VARCHAR(255) NOT NULL,
  config_value TEXT,
  
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(36),
  
  UNIQUE KEY unique_key (config_key),
  INDEX idx_category (category),
  
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. SYNC LOGS TABLE
-- ============================================
CREATE TABLE sync_logs (
  id VARCHAR(36) PRIMARY KEY,
  
  source ENUM('office365', 'hrone') NOT NULL,
  sync_type VARCHAR(50) NOT NULL,
  
  status ENUM('success', 'partial', 'failed') NOT NULL,
  
  records_fetched INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  
  error_message TEXT,
  sync_details JSON,
  
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  duration_seconds INT,
  
  INDEX idx_source (source),
  INDEX idx_sync_type (sync_type),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  
  user_id VARCHAR(36),
  
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  
  old_values JSON,
  new_values JSON,
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  
  user_id VARCHAR(36) NOT NULL,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  related_entity_type VARCHAR(50),
  related_entity_id VARCHAR(36),
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SCHEMA CREATION COMPLETE
-- ============================================

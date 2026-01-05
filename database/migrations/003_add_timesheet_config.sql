-- ============================================
-- Add Timesheet Configuration Settings
-- ============================================
-- This script adds the submit_start_date and submit_end_date configuration
-- Run this if the seed data hasn't been loaded yet

USE timesheet_management;

-- Insert Timesheet Configuration settings
-- Only insert if they don't already exist
INSERT INTO system_configurations (id, category, config_key, config_value, description, is_secret) 
VALUES 
('config-028', 'Timesheet Configuration', 'submit_start_date', '1', 'Day of month when timesheet submission window opens (1-31)', FALSE),
('config-029', 'Timesheet Configuration', 'submit_end_date', '7', 'Day of month when timesheet submission window closes (1-31)', FALSE)
ON DUPLICATE KEY UPDATE 
  config_value = VALUES(config_value),
  description = VALUES(description);



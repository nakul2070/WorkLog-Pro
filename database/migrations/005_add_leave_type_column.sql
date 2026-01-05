-- Migration: Add leave_type column to timesheet_entries table
-- This migration adds support for distinguishing between half-day and full-day leave

-- Step 1: Add leave_type column to timesheet_entries table
ALTER TABLE timesheet_entries
ADD COLUMN leave_type VARCHAR(20) NULL DEFAULT NULL
COMMENT 'Type of leave: NULL (not a leave), "half-day" (half day leave), "full-day" (full day leave)'
AFTER is_leave;

-- Step 2: Add index for better query performance
CREATE INDEX idx_leave_type ON timesheet_entries(leave_type);

-- Step 3: Update existing leave entries to have leave_type based on hours
-- If hours = 4, set to 'half-day', otherwise 'full-day' (for backward compatibility)
UPDATE timesheet_entries
SET leave_type = CASE 
    WHEN is_leave = 1 AND hours = 4 THEN 'half-day'
    WHEN is_leave = 1 THEN 'full-day'
    ELSE NULL
END
WHERE is_leave = 1 AND leave_type IS NULL;


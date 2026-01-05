-- Migration: Add is_halfday column to timesheet_entries table
-- This migration adds support for half-day leave using numeric flag (1 or 0)
-- When is_halfday = 1: 4 hours leave + up to 6 hours work
-- When is_halfday = 0: existing behavior (full working day or full leave)

-- Step 1: Add is_halfday column to timesheet_entries table
ALTER TABLE timesheet_entries
ADD COLUMN is_halfday TINYINT(1) DEFAULT 0
COMMENT 'Half-day flag: 1 = half-day leave (4h leave + up to 6h work), 0 = full day'
AFTER leave_type;

-- Step 2: Add index for better query performance
CREATE INDEX idx_is_halfday ON timesheet_entries(is_halfday);

-- Step 3: Update existing half-day leave entries based on leave_type
-- Set is_halfday = 1 for entries with leave_type = 'half-day'
UPDATE timesheet_entries
SET is_halfday = 1
WHERE leave_type = 'half-day' AND is_halfday = 0;

-- Step 4: Ensure all other entries have is_halfday = 0
UPDATE timesheet_entries
SET is_halfday = 0
WHERE is_halfday IS NULL OR (leave_type != 'half-day' AND is_halfday != 0);


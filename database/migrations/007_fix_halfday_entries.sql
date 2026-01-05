-- Migration: Fix existing half-day leave entries
-- This migration fixes entries that have leaveType = 'half-day' but incorrect flags
-- Strategy: 
-- 1. For entries with leaveType = 'half-day' and is_leave = 1 but project_id != 'proj-001': 
--    These are work entries, set is_leave = 0, is_halfday = 1
-- 2. For entries with leaveType = 'half-day' and project_id = 'proj-001':
--    These are leave entries, ensure is_halfday = 1 and hours = 4
-- 3. Create missing 4-hour leave entries for half-day leaves that have work entries

-- Step 1: Fix work entries that are marked as leave entries
UPDATE timesheet_entries
SET is_leave = 0, is_halfday = 1
WHERE leave_type = 'half-day' 
  AND is_leave = 1 
  AND project_id != 'proj-001'
  AND is_halfday = 0;

-- Step 2: Fix leave entries to have correct flags and hours
UPDATE timesheet_entries
SET is_halfday = 1, hours = 4
WHERE leave_type = 'half-day' 
  AND is_leave = 1 
  AND project_id = 'proj-001'
  AND (is_halfday = 0 OR hours != 4);

-- Step 3: Create missing 4-hour leave entries for half-day leaves
-- Find dates that have half-day work entries but no corresponding leave entry
INSERT INTO timesheet_entries (
  id, timesheet_id, project_id, entry_date, hours, task_description,
  is_holiday, is_leave, leave_type, is_halfday, is_weekend, created_at, updated_at
)
SELECT 
  UUID() as id,
  te.timesheet_id,
  'proj-001' as project_id,
  te.entry_date,
  4 as hours,
  'Half Day Leave' as task_description,
  0 as is_holiday,
  1 as is_leave,
  'half-day' as leave_type,
  1 as is_halfday,
  0 as is_weekend,
  NOW() as created_at,
  NOW() as updated_at
FROM timesheet_entries te
WHERE te.leave_type = 'half-day'
  AND te.is_halfday = 1
  AND te.project_id != 'proj-001'
  AND NOT EXISTS (
    SELECT 1 
    FROM timesheet_entries te2 
    WHERE te2.timesheet_id = te.timesheet_id
      AND te2.entry_date = te.entry_date
      AND te2.project_id = 'proj-001'
      AND te2.is_leave = 1
      AND te2.leave_type = 'half-day'
  )
GROUP BY te.timesheet_id, te.entry_date;


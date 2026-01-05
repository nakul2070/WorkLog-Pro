-- Migration: Fix half-day leave to use single entry approach
-- Delete the separate 4-hour leave entry and ensure work entries have is_halfday = 1

-- Step 1: Find and delete the 4-hour leave entry for 2025-12-01 (the problematic one)
-- This entry has project_id = 'proj-001', hours = 4, but wrong flags
DELETE FROM timesheet_entries
WHERE timesheet_id = '7606c3ee-65d5-4ea6-8b75-0b91eac58f0a'
  AND entry_date = '2025-12-01'
  AND project_id = 'proj-001'
  AND hours = 4.00
  AND is_leave = 0;

-- Step 2: Update the work entry to have is_halfday = 1
UPDATE timesheet_entries
SET is_halfday = 1, is_leave = 0, leave_type = null
WHERE timesheet_id = '7606c3ee-65d5-4ea6-8b75-0b91eac58f0a'
  AND entry_date = '2025-12-01'
  AND project_id != 'proj-001'
  AND is_halfday = 0;

-- Step 3: General cleanup - delete any 4-hour entries with project_id = 'proj-001' 
-- that exist on the same date as entries with is_halfday = 1
DELETE FROM timesheet_entries
WHERE project_id = 'proj-001'
  AND hours = 4
  AND EXISTS (
    SELECT 1 
    FROM timesheet_entries te2 
    WHERE te2.timesheet_id = timesheet_entries.timesheet_id
      AND te2.entry_date = timesheet_entries.entry_date
      AND te2.project_id != 'proj-001'
      AND te2.is_halfday = 1
  );

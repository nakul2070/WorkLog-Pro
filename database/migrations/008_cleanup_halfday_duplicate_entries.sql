-- Migration: Clean up duplicate half-day leave entries
-- This migration removes the separate 4-hour leave entries and ensures work entries have correct is_halfday flag

-- Step 1: Delete separate 4-hour leave entries for half-day leaves (project_id = 'proj-001' with is_halfday = 1 or leave_type = 'half-day')
-- Keep only the work entries
DELETE te1 FROM timesheet_entries te1
INNER JOIN timesheet_entries te2 ON (
  te1.timesheet_id = te2.timesheet_id 
  AND te1.entry_date = te2.entry_date
  AND te1.project_id = 'proj-001'
  AND te2.project_id != 'proj-001'
  AND (te2.is_halfday = 1 OR te2.leave_type = 'half-day')
)
WHERE (te1.is_halfday = 1 OR te1.leave_type = 'half-day')
  AND te1.project_id = 'proj-001';

-- Step 2: Fix work entries that should have is_halfday = 1
-- If there's a work entry on the same date as a half-day leave entry, mark it as half-day
UPDATE timesheet_entries te1
INNER JOIN timesheet_entries te2 ON (
  te1.timesheet_id = te2.timesheet_id 
  AND te1.entry_date = te2.entry_date
  AND te1.project_id != 'proj-001'
  AND te2.project_id = 'proj-001'
  AND (te2.is_halfday = 1 OR te2.leave_type = 'half-day')
)
SET te1.is_halfday = 1, te1.is_leave = 0, te1.leave_type = null
WHERE te1.is_halfday = 0;

-- Step 3: Also fix entries that have leave_type = 'half-day' but wrong flags
UPDATE timesheet_entries
SET is_halfday = 1, is_leave = 0, leave_type = null
WHERE leave_type = 'half-day'
  AND project_id != 'proj-001'
  AND is_halfday = 0;

-- Step 4: Delete any remaining orphaned 4-hour leave entries (no corresponding work entries)
DELETE FROM timesheet_entries
WHERE project_id = 'proj-001'
  AND (is_halfday = 1 OR leave_type = 'half-day')
  AND NOT EXISTS (
    SELECT 1 
    FROM timesheet_entries te2 
    WHERE te2.timesheet_id = timesheet_entries.timesheet_id
      AND te2.entry_date = timesheet_entries.entry_date
      AND te2.project_id != 'proj-001'
      AND (te2.is_halfday = 1 OR te2.leave_type = 'half-day')
  );

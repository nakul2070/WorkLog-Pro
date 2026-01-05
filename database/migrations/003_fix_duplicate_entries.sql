-- Migration: Fix Duplicate Timesheet Entries
-- This migration removes duplicate entries and adds a unique constraint

-- Step 1: Remove duplicate entries, keeping the most recent one (by updated_at, or created_at if updated_at is same)
-- For each (timesheet_id, entry_date, project_id) combination, keep only one entry

DELETE te1 FROM timesheet_entries te1
INNER JOIN timesheet_entries te2 
WHERE te1.timesheet_id = te2.timesheet_id
  AND DATE(te1.entry_date) = DATE(te2.entry_date)
  AND te1.project_id = te2.project_id
  AND te1.id < te2.id; -- Keep the entry with the higher ID (typically more recent)

-- Alternative approach: Keep the entry with the most recent updated_at
-- If the above doesn't work well, use this instead:
/*
DELETE te1 FROM timesheet_entries te1
INNER JOIN timesheet_entries te2 
WHERE te1.timesheet_id = te2.timesheet_id
  AND DATE(te1.entry_date) = DATE(te2.entry_date)
  AND te1.project_id = te2.project_id
  AND (
    te1.updated_at < te2.updated_at 
    OR (te1.updated_at = te2.updated_at AND te1.id < te2.id)
  );
*/

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures at the database level that no two entries can have the same timesheet_id, entry_date, and project_id
ALTER TABLE timesheet_entries
ADD UNIQUE KEY unique_timesheet_date_project (timesheet_id, entry_date, project_id);

-- Step 3: Recalculate total_hours for all timesheets to fix any inflated totals
UPDATE timesheets t
SET t.total_hours = (
  SELECT COALESCE(SUM(te.hours), 0)
  FROM timesheet_entries te
  WHERE te.timesheet_id = t.id
);


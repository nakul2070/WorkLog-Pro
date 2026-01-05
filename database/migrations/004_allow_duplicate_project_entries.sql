-- Migration: Allow Multiple Entries for Same Project on Same Date
-- This migration removes the unique constraint that prevents employees from
-- logging multiple entries for the same project on the same day

-- Step 1: Drop the unique constraint that prevents duplicate project entries
ALTER TABLE timesheet_entries
DROP INDEX unique_timesheet_date_project;

-- Note: This allows employees to log multiple time entries for the same project
-- on the same date (e.g., morning and afternoon sessions, different tasks)


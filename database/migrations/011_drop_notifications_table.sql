-- ============================================
-- 15. DROP NOTIFICATIONS TABLE
-- ============================================
-- This migration removes the notifications table as it's no longer needed.
-- Project access requests are now managed through the project_access_requests table.

-- Drop the notifications table
DROP TABLE IF EXISTS notifications;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================


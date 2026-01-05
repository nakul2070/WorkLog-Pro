const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { requireAuth } = require('../middleware/auth');

// Approval routes - all require authentication
router.get('/', requireAuth, approvalController.getAllApprovals);
router.get('/pending', requireAuth, approvalController.getPendingApprovals);
router.get('/timesheet/:timesheetId', requireAuth, approvalController.getTimesheetApprovals);
router.put('/:id/approve', requireAuth, approvalController.approveTimesheet);
router.put('/:id/reject', requireAuth, approvalController.rejectTimesheet);

module.exports = router;

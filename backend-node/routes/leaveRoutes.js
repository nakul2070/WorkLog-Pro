const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Leave routes - all authenticated users can read
router.get('/', requireAuth, leaveController.getAllLeaves);
router.get('/user/:userId', requireAuth, leaveController.getUserLeaves);
router.get('/:id', requireAuth, leaveController.getLeaveById);

// Admin-only routes
router.get('/sync', requireAuth, requireAdmin, leaveController.syncLeavesFromHROne);

module.exports = router;

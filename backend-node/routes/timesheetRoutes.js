const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { requireAuth, requireAdminOrPM, requireAdmin } = require('../middleware/auth');

// Debug middleware to log all requests
router.use((req, res, next) => {
  if (req.path.includes('analysis') || req.path.includes('project-hours')) {
    console.log('🔍 Timesheet route request:', req.method, req.path, req.url);
  }
  next();
});

// All timesheet routes require authentication
// Specific routes must come before parameterized routes to ensure correct matching
router.get('/', requireAuth, timesheetController.getAllTimesheets);

// Analysis routes - must be before parameterized routes (Admin only)
router.get('/analysis/employee-time', requireAuth, requireAdmin, timesheetController.getEmployeeTimeAnalysis);

// Project Hours Analysis route - MUST be before /:timesheetId/entries (Admin only)
router.get('/analysis/project-hours', requireAuth, requireAdmin, timesheetController.getProjectHoursAnalysis);
router.get('/user/:userId', requireAuth, timesheetController.getUserTimesheets);
router.post('/', requireAuth, timesheetController.createTimesheet);

// Timesheet action routes (must come before entries routes to avoid conflicts)
router.post('/:id/save', requireAuth, timesheetController.saveTimesheet);
router.post('/:id/submit', requireAuth, timesheetController.submitTimesheet);
router.put('/:id/resubmit', requireAuth, timesheetController.resubmitTimesheet);
router.post('/:id/recalculate-totals', requireAuth, timesheetController.recalculateTimesheetTotals);

// Timesheet entry routes (specific routes before /:id)
router.get('/:timesheetId/entries', requireAuth, timesheetController.getTimesheetEntries);
router.post('/:timesheetId/entries', requireAuth, timesheetController.addTimesheetEntry);
router.put('/entries/:entryId', requireAuth, timesheetController.updateTimesheetEntry);
router.delete('/entries/:entryId', requireAuth, timesheetController.deleteTimesheetEntry);
router.post('/entries/cleanup-duplicates', requireAuth, timesheetController.cleanupDuplicateEntries);

// Generic parameterized route (must come last)
router.get('/:id', requireAuth, timesheetController.getTimesheetById);

module.exports = router;

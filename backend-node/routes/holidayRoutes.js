const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Holiday routes - all users can read
router.get('/', requireAuth, holidayController.getAllHolidays);
router.get('/:id', requireAuth, holidayController.getHolidayById);

// Admin-only routes
router.post('/', requireAuth, requireAdmin, holidayController.createHoliday);
router.put('/:id', requireAuth, requireAdmin, holidayController.updateHoliday);
router.delete('/:id', requireAuth, requireAdmin, holidayController.deleteHoliday);
router.get('/sync', requireAuth, requireAdmin, holidayController.syncHolidaysFromHROne);

module.exports = router;

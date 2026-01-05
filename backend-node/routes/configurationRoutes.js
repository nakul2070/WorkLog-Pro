const express = require('express');
const router = express.Router();
const configurationController = require('../controllers/configurationController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Public endpoint for authenticated users to get timesheet configuration
router.get('/timesheet', requireAuth, configurationController.getTimesheetConfiguration);

// Configuration routes - all require admin access
router.get('/', requireAuth, requireAdmin, configurationController.getAllConfigurations);
router.get('/:id', requireAuth, requireAdmin, configurationController.getConfigurationById);
router.post('/', requireAuth, requireAdmin, configurationController.createConfiguration);
router.put('/:id', requireAuth, requireAdmin, configurationController.updateConfiguration);
router.delete('/:id', requireAuth, requireAdmin, configurationController.deleteConfiguration);

module.exports = router;

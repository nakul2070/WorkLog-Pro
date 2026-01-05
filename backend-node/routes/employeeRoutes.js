const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Employee routes - require authentication
router.get('/', requireAuth, employeeController.getAllEmployees);
router.get('/current', requireAuth, employeeController.getCurrentUser);
router.get('/:id', requireAuth, employeeController.getEmployeeById);

// Admin-only routes
router.put('/:id', requireAuth, requireAdmin, employeeController.updateEmployee);
router.get('/sync', requireAuth, requireAdmin, employeeController.syncEmployeesFromO365);

module.exports = router;

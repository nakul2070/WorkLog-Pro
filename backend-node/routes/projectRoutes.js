const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth, requireAdmin, requireAdminOrPM } = require('../middleware/auth');

// Project routes - all users can read
router.get('/', requireAuth, projectController.getAllProjects);

// Specific routes must come BEFORE parameterized routes (/:id)
// Client routes - all users can read, admin/PM can create, admin can update/delete
router.get('/clients/all', requireAuth, projectController.getAllClients);
router.post('/clients', requireAuth, requireAdminOrPM, projectController.createClient);
router.put('/clients/:id', requireAuth, requireAdmin, projectController.updateClient);
router.delete('/clients/:id', requireAuth, requireAdmin, projectController.deleteClient);

// Project Manager routes - fetch from Office 365 (must be before /:id)
router.get('/managers', requireAuth, projectController.getProjectManagers);

// Parameterized routes - must come AFTER specific routes
router.get('/:id', requireAuth, projectController.getProjectById);
router.get('/:projectId/team', requireAuth, projectController.getProjectTeam);

// Admin-only routes for project management
router.post('/', requireAuth, requireAdmin, projectController.createProject);
router.put('/:id', requireAuth, requireAdmin, projectController.updateProject);
router.delete('/:id', requireAuth, requireAdmin, projectController.deleteProject);

module.exports = router;

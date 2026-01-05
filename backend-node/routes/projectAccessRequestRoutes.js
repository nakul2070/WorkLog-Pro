const express = require('express');
const router = express.Router();
const projectAccessRequestController = require('../controllers/projectAccessRequestController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Create a new project access request (any authenticated user, except admins)
// This saves the request to project_access_requests table and creates notifications for admins
router.post('/', requireAuth, projectAccessRequestController.createProjectAccessRequest);

// Get all project access requests (admin only)
// This fetches from project_access_requests table
router.get('/', requireAuth, requireAdmin, projectAccessRequestController.getAllProjectAccessRequests);

// Update project access request (admin only)
// This updates both project_access_requests table and related notifications
router.put('/:id', requireAuth, requireAdmin, projectAccessRequestController.updateProjectAccessRequest);

module.exports = router;


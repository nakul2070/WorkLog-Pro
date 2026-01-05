const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   GET /api/auth/login
// @desc    Initiates the Azure AD login flow
router.get('/login', authController.initiateAzureLogin);

// @route   GET /api/auth/callback
// @desc    Handles the redirect callback from Azure AD
router.get('/callback', authController.handleAzureCallback);

// @route   POST /api/auth/test-login
// @desc    Test login endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-login', authController.testLogin);
}

// Note: A /logout route is not strictly needed for JWT,
// as the frontend just deletes the token.

module.exports = router;
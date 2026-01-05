const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Get all messages (no auth required for UI messages)
router.get('/', messageController.getMessages);

module.exports = router;


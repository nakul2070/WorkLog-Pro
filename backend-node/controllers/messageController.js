const fs = require('fs');
const path = require('path');

/**
 * Message Controller
 * Serves dynamic UI messages from messages.json
 */

// Get all messages
exports.getMessages = async (req, res) => {
  try {
    const messagesPath = path.join(__dirname, '..', 'messages.json');
    
    // Read messages.json file
    const messagesData = fs.readFileSync(messagesPath, 'utf8');
    const messages = JSON.parse(messagesData);
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error reading messages.json:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load messages'
    });
  }
};


const express = require('express');
const { requireMentor, requireStudent, requireAuth } = require('../middleware/roleAuth');
const Message = require('../models/Message');

module.exports = (io) => {
  const router = express.Router();
  const sessionController = require('../controllers/sessionController');

// Create session (mentor only)
router.post('/create', requireMentor, sessionController.createSession);

// Join session (student only)
router.post('/join', requireStudent, sessionController.joinSession);

// End session (mentor only)
router.post('/end', requireMentor, sessionController.endSession);

// Get session details (authenticated users only)
router.get('/:sessionId', requireAuth, sessionController.getSession);

// Get chat messages for a session
router.get('/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // If database is not available, return empty messages
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({
        success: true,
        messages: []
      });
    }

    // Verify user is part of the session
    const session = await require('../models/Session').findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const isMentor = session.mentor_id.toString() === req.user._id.toString();
    const isStudent = session.student_id && session.student_id.toString() === req.user._id.toString();

    if (!isMentor && !isStudent) {
      return res.status(403).json({ success: false, error: 'Not authorized to view messages' });
    }

    const messages = await Message.getSessionMessages(sessionId, limit);

    res.json({
      success: true,
      messages: messages.reverse() // Return in chronological order
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Get user's sessions (authenticated users only)
router.get('/', requireAuth, sessionController.getUserSessions);

return router;
};
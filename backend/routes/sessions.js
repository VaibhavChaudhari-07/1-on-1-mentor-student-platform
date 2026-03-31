const express = require('express');
const sessionController = require('../controllers/sessionController');
const { requireMentor, requireStudent, requireAuth } = require('../middleware/roleAuth');

const router = express.Router();

// Create session (mentor only)
router.post('/create', requireMentor, sessionController.createSession);

// Join session (student only)
router.post('/join', requireStudent, sessionController.joinSession);

// End session (mentor only)
router.post('/end', requireMentor, sessionController.endSession);

// Get session details (authenticated users only)
router.get('/:sessionId', requireAuth, sessionController.getSession);

// Get user's sessions (authenticated users only)
router.get('/', requireAuth, sessionController.getUserSessions);

module.exports = router;
const express = require('express');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

const router = express.Router();

// Create session (mentor only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can create sessions' });
    }

    const session = new Session({
      mentor_id: req.user._id,
      title: req.body.title || 'Mentoring Session'
    });

    await session.save();
    await session.populate('mentor_id', 'name email');

    res.status(201).json({
      sessionId: session._id,
      session
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get session by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('mentor_id', 'name email')
      .populate('student_id', 'name email');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is part of the session
    if (session.mentor_id._id.toString() !== req.user._id.toString() &&
        (!session.student_id || session.student_id._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized to view this session' });
    }

    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Join session (student only)
router.post('/:id/join', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can join sessions' });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not available' });
    }

    if (session.student_id) {
      return res.status(400).json({ error: 'Session is already full' });
    }

    session.student_id = req.user._id;
    await session.save();
    await session.populate('mentor_id', 'name email');
    await session.populate('student_id', 'name email');

    res.json({ success: true, session });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// End session (mentor only)
router.post('/:id/end', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.mentor_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only session mentor can end the session' });
    }

    session.status = 'ended';
    session.ended_at = new Date();
    await session.save();

    res.json({ success: true, session });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
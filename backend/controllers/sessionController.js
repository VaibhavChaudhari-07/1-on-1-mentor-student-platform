const mongoose = require('mongoose');
const Session = require('../models/Session');

class SessionController {
  constructor(io) {
    this.io = io;
  }

  // Create session (mentor only)
  async createSession(req, res) {
    try {
      const { title } = req.body;
      const mentorId = req.user._id;

      // Create new session with explicit status
      const session = new Session({
        mentor_id: mentorId,
        title: title || 'Mentoring Session',
        status: 'active'
      });

      await session.save();
      
      // Verify status was saved
      if (!session.status) {
        session.status = 'active';
        await session.save();
      }

      // Re-fetch to ensure data consistency
      const savedSession = await Session.findById(session._id).populate('mentor_id', 'name email role');

      const sessionLink = `/session/${savedSession._id}`;

      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        session: {
          id: savedSession._id,
          title: savedSession.title,
          status: savedSession.status,
          mentor: savedSession.mentor_id,
          createdAt: savedSession.createdAt
        },
        sessionLink
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  }

  // Join session (student only)
  async joinSession(req, res) {
    try {
      let { sessionId } = req.body;
      const studentId = req.user._id;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ success: false, error: 'Session ID is required' });
      }

      sessionId = sessionId.trim()
      const maybeId = sessionId.match(/\/session\/(.+)$/)?.[1] || sessionId
      const normalized = maybeId.split(/[?#]/)[0]

      if (!mongoose.Types.ObjectId.isValid(normalized)) {
        return res.status(400).json({ success: false, error: 'Invalid session ID format' })
      }

      // Find the session
      const session = await Session.findById(normalized);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Ensure status defaults to active (for legacy/edge cases)
      if (!session.status) {
        session.status = 'active';
        await session.save();
      }

      // Check if session is active
      if (session.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Session is not active'
        });
      }

      // If student is already in the session, return success and existing session
      if (session.student_id && session.student_id.toString() === studentId.toString()) {
        await session.populate('mentor_id', 'name email role');
        await session.populate('student_id', 'name email role');

        return res.json({
          success: true,
          message: 'Already in session',
          session: {
            id: session._id,
            title: session.title,
            status: session.status,
            mentor: session.mentor_id,
            student: session.student_id,
            createdAt: session.createdAt
          }
        });
      }

      // Check if session already has a different student
      if (session.student_id) {
        return res.status(400).json({
          success: false,
          error: 'Session is already full'
        });
      }

      // Add student to session
      session.student_id = studentId;
      await session.save();

      // Populate session details
      await session.populate('mentor_id', 'name email role');
      await session.populate('student_id', 'name email role');

      res.json({
        success: true,
        message: 'Successfully joined session',
        session: {
          id: session._id,
          title: session.title,
          status: session.status,
          mentor: session.mentor_id,
          student: session.student_id,
          createdAt: session.createdAt
        }
      });
    } catch (error) {
      console.error('Join session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join session'
      });
    }
  }

  // End session
  async endSession(req, res) {
    try {
      const { sessionId } = req.body;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Find the session
      const session = await Session.findById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check if user is the mentor of this session
      if (session.mentor_id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the session mentor can end the session'
        });
      }

      // Check if session is already ended
      if (session.status === 'ended') {
        return res.status(400).json({
          success: false,
          error: 'Session is already ended'
        });
      }

      // End the session
      session.status = 'ended';
      session.ended_at = new Date();
      await session.save();

      // Notify all participants in the session room
      if (this.io) {
        this.io.to(sessionId).emit('session-ended', {
          sessionId,
          endedBy: userId,
          endedAt: session.ended_at
        });
      }

      // Populate session details
      await session.populate('mentor_id', 'name email role');
      await session.populate('student_id', 'name email role');

      res.json({
        success: true,
        message: 'Session ended successfully',
        session: {
          id: session._id,
          title: session.title,
          status: session.status,
          mentor: session.mentor_id,
          student: session.student_id,
          createdAt: session.createdAt,
          endedAt: session.ended_at
        }
      });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end session'
      });
    }
  }

  // Get session details
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;

      const session = await Session.findById(sessionId)
        .populate('mentor_id', 'name email role')
        .populate('student_id', 'name email role');

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check if user is part of the session
      const isMentor = session.mentor_id._id.toString() === userId.toString();
      const isStudent = session.student_id && session.student_id._id.toString() === userId.toString();

      if (!isMentor && !isStudent) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      res.json({
        success: true,
        session: {
          id: session._id,
          title: session.title,
          status: session.status,
          mentor: session.mentor_id,
          student: session.student_id,
          mentor_id: session.mentor_id && session.mentor_id._id ? session.mentor_id._id : session.mentor_id,
          student_id: session.student_id && session.student_id._id ? session.student_id._id : session.student_id,
          createdAt: session.createdAt,
          endedAt: session.ended_at
        }
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session details'
      });
    }
  }

  // Get user's sessions
  async getUserSessions(req, res) {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;

      let query = {};

      if (userRole === 'mentor') {
        query.mentor_id = userId;
      } else if (userRole === 'student') {
        query.student_id = userId;
      }

      const sessions = await Session.find(query)
        .populate('mentor_id', 'name email role')
        .populate('student_id', 'name email role')
        .sort({ createdAt: -1 });

      const formattedSessions = sessions.map(session => ({
        id: session._id,
        title: session.title,
        status: session.status,
        mentor: session.mentor_id,
        student: session.student_id,
        createdAt: session.createdAt,
        endedAt: session.ended_at,
        sessionLink: `/session/${session._id}`
      }));

      res.json({
        success: true,
        sessions: formattedSessions
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }
}

module.exports = new SessionController();
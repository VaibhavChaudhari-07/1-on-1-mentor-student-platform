const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

const socketHandler = (io) => {
  // Store active sessions and their participants
  // sessionId -> { mentor: socketId, student: socketId, participants: Set<socketId> }
  const sessions = new Map();

  // Store socket to session mapping for cleanup
  // socketId -> sessionId
  const socketSessions = new Map();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join session event
    socket.on('join-session', ({ sessionId, userId, role }) => {
      try {
        console.log(`User ${userId} (${role}) joining session: ${sessionId}`);

        // Initialize session if it doesn't exist
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, {
            mentor: null,
            student: null,
            participants: new Set()
          });
        }

        const session = sessions.get(sessionId);

        // Check if room is full (max 2 users)
        if (session.participants.size >= 2) {
          socket.emit('join-error', {
            error: 'Session is full',
            message: 'Maximum 2 participants allowed per session'
          });
          return;
        }

        // Check if role is already taken
        if (role === 'mentor' && session.mentor) {
          socket.emit('join-error', {
            error: 'Role taken',
            message: 'Mentor role is already taken in this session'
          });
          return;
        }

        if (role === 'student' && session.student) {
          socket.emit('join-error', {
            error: 'Role taken',
            message: 'Student role is already taken in this session'
          });
          return;
        }

        // Join the socket.io room
        socket.join(sessionId);

        // Update session data
        session.participants.add(socket.id);
        if (role === 'mentor') {
          session.mentor = socket.id;
        } else if (role === 'student') {
          session.student = socket.id;
        }

        // Store socket to session mapping
        socketSessions.set(socket.id, sessionId);

        // Set socket properties for cleanup
        socket.sessionId = sessionId;
        socket.userId = userId;
        socket.role = role;

        // Notify others in the session
        socket.to(sessionId).emit('user-joined', {
          userId,
          role,
          sessionId,
          participantCount: session.participants.size
        });

        // Confirm join to the user
        socket.emit('joined-session', {
          sessionId,
          role,
          participantCount: session.participants.size
        });

        console.log(`User ${userId} successfully joined session ${sessionId}. Participants: ${session.participants.size}`);

      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('join-error', {
          error: 'Server error',
          message: 'Failed to join session'
        });
      }
    });

    // Leave session event
    socket.on('leave-session', () => {
      handleLeaveSession(socket);
    });

    // Chat message event
    socket.on('chat-message', async (message) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'Not in a session' });
          return;
        }

        // Create message object
        const messageData = {
          id: Date.now().toString(),
          content: message.content,
          userId: socket.userId,
          role: socket.role,
          timestamp: new Date().toISOString(),
          sessionId: socket.sessionId
        };

        // Try to store message in database if available
        try {
          if (mongoose.connection.readyState === 1) {
            // Get user details from database
            const user = await User.findById(socket.userId).select('name email');
            if (user) {
              messageData.sender = {
                name: user.name,
                role: socket.role
              };
            }

            // Store message in database
            const dbMessage = new Message({
              sessionId: socket.sessionId,
              sender: {
                _id: socket.userId,
                name: user ? user.name : 'Unknown User',
                role: socket.role
              },
              content: message.content,
              messageType: 'text'
            });

            await dbMessage.save();

            // Clean up old messages if needed
            await Message.cleanupOldMessages(socket.sessionId);
          }
        } catch (dbError) {
          console.log('Database not available, proceeding without persistence:', dbError.message);
        }

        // Broadcast to room only (excluding sender)
        socket.to(socket.sessionId).emit('chat-message', messageData);

        console.log(`Chat message ${mongoose.connection.readyState === 1 ? 'stored and ' : ''}broadcasted from ${socket.userId} in session ${socket.sessionId}`);

      } catch (error) {
        console.error('Error handling chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // WebRTC signaling events
    socket.on('webrtc-offer', (data) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'Not in a session' });
          return;
        }

        console.log(`WebRTC offer from ${socket.userId} in session ${socket.sessionId}`);

        // Broadcast offer to other participant in room
        socket.to(socket.sessionId).emit('webrtc-offer', {
          ...data,
          from: socket.userId,
          role: socket.role
        });

      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
        socket.emit('error', { message: 'Failed to send offer' });
      }
    });

    socket.on('webrtc-answer', (data) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'Not in a session' });
          return;
        }

        console.log(`WebRTC answer from ${socket.userId} in session ${socket.sessionId}`);

        // Broadcast answer to other participant in room
        socket.to(socket.sessionId).emit('webrtc-answer', {
          ...data,
          from: socket.userId,
          role: socket.role
        });

      } catch (error) {
        console.error('Error handling WebRTC answer:', error);
        socket.emit('error', { message: 'Failed to send answer' });
      }
    });

    socket.on('ice-candidate', (data) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'Not in a session' });
          return;
        }

        // Broadcast ICE candidate to other participant in room
        socket.to(socket.sessionId).emit('ice-candidate', {
          ...data,
          from: socket.userId,
          role: socket.role
        });

      } catch (error) {
        console.error('Error handling ICE candidate:', error);
        socket.emit('error', { message: 'Failed to send ICE candidate' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
      handleLeaveSession(socket);
    });

    // Handle reconnect
    socket.on('reconnect', () => {
      console.log(`User reconnected: ${socket.id}`);
      // Reconnection logic can be added here if needed
      // For now, users need to rejoin their sessions manually
    });
  });

  // Helper function to handle leaving session
  function handleLeaveSession(socket) {
    try {
      const sessionId = socket.sessionId || socketSessions.get(socket.id);

      if (!sessionId) {
        return; // Not in any session
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return;
      }

      // Remove from participants
      session.participants.delete(socket.id);

      // Clear role assignment
      if (session.mentor === socket.id) {
        session.mentor = null;
      }
      if (session.student === socket.id) {
        session.student = null;
      }

      // Remove socket mapping
      socketSessions.delete(socket.id);

      // Leave socket.io room
      socket.leave(sessionId);

      // Notify others in the session
      socket.to(sessionId).emit('user-left', {
        userId: socket.userId,
        role: socket.role,
        sessionId,
        participantCount: session.participants.size
      });

      // Clean up empty sessions
      if (session.participants.size === 0) {
        sessions.delete(sessionId);
        console.log(`Session ${sessionId} cleaned up - no participants remaining`);
      } else {
        console.log(`User ${socket.userId} left session ${sessionId}. Participants remaining: ${session.participants.size}`);
      }

      // Clear socket properties
      delete socket.sessionId;
      delete socket.userId;
      delete socket.role;

    } catch (error) {
      console.error('Error handling leave session:', error);
    }
  }

  // Cleanup function for graceful shutdown
  const cleanup = () => {
    console.log('Cleaning up socket handler...');
    sessions.clear();
    socketSessions.clear();
  };

  return { cleanup };
};

module.exports = socketHandler;
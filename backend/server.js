const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Socket.io handling
const sessions = new Map(); // sessionId -> { mentor: socketId, student: socketId }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-session', ({ sessionId, userId, role }) => {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.userId = userId;
    socket.role = role;

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { mentor: null, student: null });
    }

    const session = sessions.get(sessionId);
    if (role === 'mentor') {
      session.mentor = socket.id;
    } else if (role === 'student') {
      session.student = socket.id;
    }

    // Notify others in session
    socket.to(sessionId).emit('user-joined', { userId, role });
  });

  // Collaborative editor
  socket.on('editor-change', (data) => {
    socket.to(socket.sessionId).emit('editor-change', data);
  });

  // Chat
  socket.on('send-message', (message) => {
    io.to(socket.sessionId).emit('receive-message', {
      ...message,
      userId: socket.userId,
      role: socket.role
    });
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(socket.sessionId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(socket.sessionId).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(socket.sessionId).emit('ice-candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.sessionId) {
      const session = sessions.get(socket.sessionId);
      if (session) {
        if (session.mentor === socket.id) session.mentor = null;
        if (session.student === socket.id) session.student = null;
        socket.to(socket.sessionId).emit('user-left', { userId: socket.userId, role: socket.role });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
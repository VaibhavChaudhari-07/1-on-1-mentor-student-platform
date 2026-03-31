const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());

// Middleware to verify JWT
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Create session (mentor only)
app.post('/api/sessions', verifyToken, async (req, res) => {
  const { user } = req;
  const { title } = req.body;

  // Check if user is mentor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'mentor') {
    return res.status(403).json({ error: 'Only mentors can create sessions' });
  }

  const sessionId = Math.random().toString(36).substring(2, 15);
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id: sessionId,
      mentor_id: user.id,
      title,
      status: 'waiting'
    });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ sessionId });
});

// Get session info
app.get('/api/sessions/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Session not found' });

  res.json(data);
});

// Join session
app.post('/api/sessions/:id/join', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'waiting') return res.status(400).json({ error: 'Session not available' });

  // Check if user is student
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student') {
    return res.status(403).json({ error: 'Only students can join sessions' });
  }

  // Update session
  await supabase
    .from('sessions')
    .update({ student_id: user.id, status: 'active' })
    .eq('id', id);

  res.json({ success: true });
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
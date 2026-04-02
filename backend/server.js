const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { setupWSConnection } = require('y-websocket/bin/utils');
const socketHandler = require('./socket/socketHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Setup y-websocket for CRDT collaboration (separate from Socket.io)
const wss = new (require('ws').Server)({ noServer: true });

// Handle upgrade requests for y-websocket
server.on('upgrade', (request, socket, head) => {
  const pathname = require('url').parse(request.url).pathname;

  if (pathname === '/y-websocket') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Setup y-websocket connections
wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
});

// Initialize Socket.io handler
const { cleanup: cleanupSocket } = socketHandler(io);

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB URI not configured, running without database');
}

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions')(io);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketio: io ? 'active' : 'inactive',
    ywebsocket: wss ? 'active' : 'inactive'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  cleanupSocket();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  cleanupSocket();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
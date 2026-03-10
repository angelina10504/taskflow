const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

console.log('✅ Environment loaded');
console.log('📍 MongoDB URI exists:', !!process.env.MONGO_URI);

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:3000'].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 TaskFlow API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// API Routes with error handling
try {
  console.log('📂 Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
  app.use('/api/workspaces', require('./routes/workspaces'));
  console.log('✅ Workspace routes loaded');
  app.use('/api/projects', require('./routes/projects'));
  console.log('✅ Project routes loaded');
  app.use('/api/tasks', require('./routes/tasks'));
  console.log('✅ Task routes loaded');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  process.exit(1);
}

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// projectId -> Map(socketId -> { id, name, avatar })
const projectRooms = new Map();

const broadcastOnlineUsers = (projectId) => {
  const room = projectRooms.get(projectId);
  if (!room) return;
  // Deduplicate by userId before broadcasting
  const seen = new Set();
  const users = [];
  for (const u of room.values()) {
    if (!seen.has(u.id)) { seen.add(u.id); users.push(u); }
  }
  io.to(projectId).emit('online-users', users);
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('join-project', ({ projectId, user }) => {
    socket.join(projectId);
    socket.data.projectId = projectId;
    socket.data.user = user;
    if (!projectRooms.has(projectId)) projectRooms.set(projectId, new Map());
    projectRooms.get(projectId).set(socket.id, user);
    broadcastOnlineUsers(projectId);
  });

  socket.on('leave-project', ({ projectId }) => {
    socket.leave(projectId);
    if (projectRooms.has(projectId)) {
      projectRooms.get(projectId).delete(socket.id);
      if (projectRooms.get(projectId).size === 0) projectRooms.delete(projectId);
      else broadcastOnlineUsers(projectId);
    }
  });

  // Relay task moves to everyone else in the room
  socket.on('task-moved', ({ projectId, task, movedBy }) => {
    socket.to(projectId).emit('task-moved', { task, movedBy });
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    const { projectId } = socket.data || {};
    if (projectId && projectRooms.has(projectId)) {
      projectRooms.get(projectId).delete(socket.id);
      if (projectRooms.get(projectId).size === 0) projectRooms.delete(projectId);
      else broadcastOnlineUsers(projectId);
    }
  });
});

// Start server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
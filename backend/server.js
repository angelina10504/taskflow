const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

console.log('✅ Environment loaded');
console.log('📍 MongoDB URI exists:', !!process.env.MONGODB_URI);

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    origin: process.env.CLIENT_URL || '*',
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
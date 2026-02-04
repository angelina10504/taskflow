const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Simple test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 TaskFlow API is running!',
    version: '1.0.0'
  });
});

// Create HTTP server (needed for Socket.IO)
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
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
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
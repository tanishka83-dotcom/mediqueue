const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// INIT DATABASE
initDB();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// attach socket
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);

// health check (IMPORTANT for Render)
app.get('/health', (req, res) => {
  res.send('Backend running OK');
});

// socket
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// PORT (IMPORTANT FOR RENDER)
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
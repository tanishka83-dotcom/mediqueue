const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');

// Init DB
initDB();

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// attach socket to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);

// Health check route (IMPORTANT for Render)
app.get('/', (req, res) => {
  res.send('MediQueue Backend Running 🚀');
});

// Socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// IMPORTANT: Render uses process.env.PORT
const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
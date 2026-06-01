const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');

const app = express();
const server = http.createServer(app);

// INIT DB
initDB();

// Middleware
app.use(cors());
app.use(express.json());

// Test route (IMPORTANT)
app.get('/', (req, res) => {
  res.json({ message: "MediQueue backend running 🚀" });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
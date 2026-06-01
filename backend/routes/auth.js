const express = require('express');
const router = express.Router();
const { query } = require('../db');

// TEST ROUTE
router.get('/', (req, res) => {
  res.json({ message: "Auth route working 🚀" });
});

module.exports = router;
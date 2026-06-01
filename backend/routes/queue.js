const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const auth = require('../middleware/auth');

// Public endpoints
router.get('/', queueController.getQueue);
router.get('/doctors', queueController.getDoctors);
router.post('/book', queueController.bookAppointment);

// Protected doctor endpoints
router.post('/next', auth, queueController.callNext);
router.post('/emergency', auth, queueController.addEmergency);
router.post('/delay/:id', auth, queueController.delayPatient);

module.exports = router;

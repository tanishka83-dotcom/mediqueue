const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery } = require('../db');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find Doctor by email in SQLite
    const doctor = await getQuery('SELECT * FROM doctors WHERE LOWER(email) = ?', [email.toLowerCase().trim()]);
    if (!doctor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT Token
    const payload = {
      id: doctor.id,
      doctorId: doctor.doctorId,
      email: doctor.email,
      dept: doctor.dept
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretjwtkey123!',
      { expiresIn: '12h' }
    );

    // Return profile & token
    res.json({
      token,
      doctor: {
        id: doctor.id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        title: doctor.title,
        room: doctor.room,
        dept: doctor.dept,
        avatar: doctor.avatar,
        status: doctor.status,
        avgTime: doctor.avgTime
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

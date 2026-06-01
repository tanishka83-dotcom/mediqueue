const { runQuery, allQuery, getQuery } = require('../db');

// Helper to broadcast socket update
const notifyQueueUpdate = (req) => {
  if (req.io) {
    req.io.emit('queueUpdated');
  }
};

// GET /api/queue
exports.getQueue = async (req, res) => {
  try {
    const patients = await allQuery(
      "SELECT * FROM patients WHERE status != 'Completed' ORDER BY timeAdded ASC"
    );
    const doctors = await allQuery("SELECT * FROM doctors");

    // Construct doctor map like the frontend state
    const doctorsMap = {};
    doctors.forEach(doc => {
      doctorsMap[doc.doctorId] = {
        name: doc.name,
        title: doc.title,
        room: doc.room,
        dept: doc.dept,
        avatar: doc.avatar,
        status: doc.status,
        avgTime: doc.avgTime
      };
    });

    res.json({ patients, doctors: doctorsMap });
  } catch (error) {
    console.error('Error fetching queue from SQLite:', error);
    res.status(500).json({ message: 'Error fetching queue status' });
  }
};

// GET /api/doctors
exports.getDoctors = async (req, res) => {
  try {
    const doctors = await allQuery("SELECT * FROM doctors");
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors from SQLite:', error);
    res.status(500).json({ message: 'Error fetching doctors' });
  }
};

// POST /api/queue/book
exports.bookAppointment = async (req, res) => {
  const { name, dept, doctorId, isEmergency } = req.body;

  try {
    if (!name || !dept || !doctorId) {
      return res.status(400).json({ message: 'Name, department, and doctor are required' });
    }

    const doctor = await getQuery("SELECT * FROM doctors WHERE doctorId = ?", [doctorId]);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Generate Token
    let token = '';
    if (isEmergency) {
      token = `E-${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      // Find the last standard ticket count to increment
      const lastPatient = await getQuery(
        "SELECT id FROM patients WHERE id LIKE 'P-%' ORDER BY rowid DESC LIMIT 1"
      );
      let counter = 1029;
      if (lastPatient) {
        const lastNum = parseInt(lastPatient.id.split('-')[1]);
        if (!isNaN(lastNum)) {
          counter = lastNum + 1;
        }
      }
      token = `P-${counter}`;
    }

    // Get current active queue for this doctor in SQLite
    const docQueue = await allQuery(
      "SELECT * FROM patients WHERE doctorId = ? AND status != 'Completed'",
      [doctorId]
    );

    let newStatus = 'Waiting';
    if (isEmergency) {
      const hasActiveConsult = docQueue.some(p => p.status === 'In Consultation');
      newStatus = hasActiveConsult ? 'Emergency' : 'In Consultation';
      if (!hasActiveConsult) {
        await runQuery("UPDATE doctors SET status = 'In Consultation' WHERE doctorId = ?", [doctorId]);
      }
    } else {
      if (docQueue.length === 0) {
        newStatus = 'In Consultation';
        await runQuery("UPDATE doctors SET status = 'In Consultation' WHERE doctorId = ?", [doctorId]);
      } else if (docQueue.length === 1 && !docQueue.some(p => p.status === 'Next')) {
        newStatus = 'Next';
      }
    }

    const timeAdded = Date.now();
    await runQuery(
      "INSERT INTO patients (id, name, dept, doctorId, status, timeAdded) VALUES (?, ?, ?, ?, ?, ?)",
      [token, name, dept, doctorId, newStatus, timeAdded]
    );

    // Broadcast update
    notifyQueueUpdate(req);

    res.status(201).json({
      message: 'Booking successful',
      patient: {
        id: token,
        name,
        dept,
        doctorId,
        status: newStatus,
        timeAdded
      },
      position: isEmergency ? 1 : docQueue.length + 1,
      estWaitTime: isEmergency ? 0 : docQueue.length * doctor.avgTime
    });

  } catch (error) {
    console.error('Error booking appointment in SQLite:', error);
    res.status(500).json({ message: 'Server error during booking' });
  }
};

// POST /api/queue/next
exports.callNext = async (req, res) => {
  const doctorId = req.doctor.doctorId; // Authenticated doctor's ID

  try {
    const doctor = await getQuery("SELECT * FROM doctors WHERE doctorId = ?", [doctorId]);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // 1. Mark current patient consulting as Completed
    await runQuery(
      "UPDATE patients SET status = 'Completed' WHERE doctorId = ? AND status = 'In Consultation'",
      [doctorId]
    );

    // 2. Find remaining active patients for this doctor
    const remainingQueue = await allQuery(
      "SELECT * FROM patients WHERE doctorId = ? AND status != 'Completed'",
      [doctorId]
    );

    if (remainingQueue.length > 0) {
      // Sort remaining queue to find next in line: Emergency first, then Next, then Waiting
      const statusWeight = { 'Emergency': 1, 'Next': 2, 'Waiting': 3 };
      remainingQueue.sort((a, b) => {
        if (statusWeight[a.status] !== statusWeight[b.status]) {
          return statusWeight[a.status] - statusWeight[b.status];
        }
        return a.timeAdded - b.timeAdded;
      });

      const nextPatient = remainingQueue[0];
      await runQuery("UPDATE patients SET status = 'In Consultation' WHERE id = ?", [nextPatient.id]);

      // If there's a second patient in the queue, mark them as 'Next'
      const nextRemainingQueue = remainingQueue.filter(p => p.id !== nextPatient.id);
      if (nextRemainingQueue.length > 0) {
        nextRemainingQueue.sort((a, b) => a.timeAdded - b.timeAdded);
        const secondPatient = nextRemainingQueue[0];
        if (secondPatient.status === 'Waiting') {
          await runQuery("UPDATE patients SET status = 'Next' WHERE id = ?", [secondPatient.id]);
        }
      }

      await runQuery("UPDATE doctors SET status = 'In Consultation' WHERE doctorId = ?", [doctorId]);
    } else {
      await runQuery("UPDATE doctors SET status = 'Available' WHERE doctorId = ?", [doctorId]);
    }

    notifyQueueUpdate(req);
    res.json({ message: 'Called next patient successfully' });

  } catch (error) {
    console.error('Error calling next patient in SQLite:', error);
    res.status(500).json({ message: 'Server error when calling next patient' });
  }
};

// POST /api/queue/emergency
exports.addEmergency = async (req, res) => {
  const doctorId = req.doctor.doctorId;

  try {
    const doctor = await getQuery("SELECT * FROM doctors WHERE doctorId = ?", [doctorId]);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const token = `E-${Math.floor(1000 + Math.random() * 9000)}`;
    const emergencyNames = ['Sarah Connor (Critical)', 'Arthur Morgan (Chest Pain)', 'John Wick (Trauma)', 'Bruce Wayne (Laceration)'];
    const name = emergencyNames[Math.floor(Math.random() * emergencyNames.length)];

    const hasConsultingRow = await getQuery(
      "SELECT 1 FROM patients WHERE doctorId = ? AND status = 'In Consultation' LIMIT 1",
      [doctorId]
    );
    const hasConsulting = !!hasConsultingRow;
    const newStatus = hasConsulting ? 'Emergency' : 'In Consultation';
    const timeAdded = Date.now();

    await runQuery(
      "INSERT INTO patients (id, name, dept, doctorId, status, timeAdded) VALUES (?, ?, ?, ?, ?, ?)",
      [token, name, doctor.dept, doctorId, newStatus, timeAdded]
    );

    if (!hasConsulting) {
      await runQuery("UPDATE doctors SET status = 'In Consultation' WHERE doctorId = ?", [doctorId]);
    }

    notifyQueueUpdate(req);
    res.status(201).json({
      message: 'Emergency added successfully',
      patient: {
        id: token,
        name,
        dept: doctor.dept,
        doctorId,
        status: newStatus,
        timeAdded
      }
    });

  } catch (error) {
    console.error('Error adding emergency in SQLite:', error);
    res.status(500).json({ message: 'Server error when adding emergency' });
  }
};

// POST /api/queue/delay/:id
exports.delayPatient = async (req, res) => {
  const patientId = req.params.id;
  const doctorId = req.doctor.doctorId; // Authenticated doctor's ID

  try {
    const patient = await getQuery("SELECT * FROM patients WHERE id = ?", [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Security check: must belong to the logged-in doctor
    if (patient.doctorId !== doctorId) {
      return res.status(403).json({ message: 'Unauthorized: Patient is in another doctor\'s queue' });
    }

    // Postpone the timeAdded by 5 minutes
    const newTimeAdded = patient.timeAdded + 5 * 60 * 1000;
    await runQuery("UPDATE patients SET timeAdded = ? WHERE id = ?", [newTimeAdded, patientId]);

    // Re-evaluate waiting queue statuses
    const docQueue = await allQuery(
      "SELECT * FROM patients WHERE doctorId = ? AND status IN ('Waiting', 'Next') ORDER BY timeAdded ASC",
      [doctorId]
    );

    for (let i = 0; i < docQueue.length; i++) {
      const p = docQueue[i];
      let updatedStatus = p.status;
      if (i === 0 && p.status !== 'Emergency') {
        updatedStatus = 'Next';
      } else if (p.status !== 'Emergency') {
        updatedStatus = 'Waiting';
      }

      if (updatedStatus !== p.status) {
        await runQuery("UPDATE patients SET status = ? WHERE id = ?", [updatedStatus, p.id]);
      }
    }

    notifyQueueUpdate(req);
    res.json({ message: 'Patient delayed successfully' });

  } catch (error) {
    console.error('Error delaying patient in SQLite:', error);
    res.status(500).json({ message: 'Server error when delaying patient' });
  }
};

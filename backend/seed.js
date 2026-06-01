const bcrypt = require('bcryptjs');
const { initDB, runQuery } = require('./db');

const doctorsData = [
  {
    doctorId: 'dr-jenkins',
    name: 'Dr. Sarah Jenkins',
    title: 'Cardiology Consultant',
    room: 'Room 104',
    dept: 'Cardiology',
    avatar: 'SJ',
    status: 'In Consultation',
    avgTime: 20,
    email: 'jenkins@mediqueue.com',
    password: 'password123'
  },
  {
    doctorId: 'dr-patel',
    name: 'Dr. Alex Patel',
    title: 'General Medicine Practitioner',
    room: 'Room 202',
    dept: 'General Medicine',
    avatar: 'AP',
    status: 'Available',
    avgTime: 12,
    email: 'patel@mediqueue.com',
    password: 'password123'
  },
  {
    doctorId: 'dr-smith',
    name: 'Dr. Lisa Smith',
    title: 'Pediatrics Specialist',
    room: 'Room 305',
    dept: 'Pediatrics',
    avatar: 'LS',
    status: 'In Consultation',
    avgTime: 10,
    email: 'smith@mediqueue.com',
    password: 'password123'
  },
  {
    doctorId: 'dr-jones',
    name: 'Dr. Liam Jones',
    title: 'Orthopedics Specialist',
    room: 'Room 410',
    dept: 'Orthopedics',
    avatar: 'LJ',
    status: 'Available',
    avgTime: 15,
    email: 'jones@mediqueue.com',
    password: 'password123'
  }
];

const getPatientsData = () => {
  const now = Date.now();
  return [
    { id: 'P-1020', name: 'Edward Benson', dept: 'Cardiology', doctorId: 'dr-jenkins', status: 'In Consultation', timeAdded: now - 25 * 60 * 1000 },
    { id: 'P-1021', name: 'Eleanor Vance', dept: 'Cardiology', doctorId: 'dr-jenkins', status: 'Next', timeAdded: now - 15 * 60 * 1000 },
    { id: 'P-1022', name: 'Robert Chen', dept: 'Cardiology', doctorId: 'dr-jenkins', status: 'Waiting', timeAdded: now - 5 * 60 * 1000 },
    
    { id: 'P-1023', name: 'Marcus Miller', dept: 'General Medicine', doctorId: 'dr-patel', status: 'Waiting', timeAdded: now - 20 * 60 * 1000 },
    { id: 'P-1024', name: 'Chloe Hargreeves', dept: 'General Medicine', doctorId: 'dr-patel', status: 'Waiting', timeAdded: now - 10 * 60 * 1000 },
    
    { id: 'P-1025', name: 'Sophia Sterling', dept: 'Pediatrics', doctorId: 'dr-smith', status: 'In Consultation', timeAdded: now - 18 * 60 * 1000 },
    { id: 'P-1026', name: 'LucasSterling (Jr.)', dept: 'Pediatrics', doctorId: 'dr-smith', status: 'Next', timeAdded: now - 12 * 60 * 1000 },
    { id: 'P-1027', name: 'Emma Watson', dept: 'Pediatrics', doctorId: 'dr-smith', status: 'Waiting', timeAdded: now - 2 * 60 * 1000 },
    
    { id: 'P-1028', name: 'Diana Prince', dept: 'Orthopedics', doctorId: 'dr-jones', status: 'Waiting', timeAdded: now - 1 * 60 * 1000 }
  ];
};

const seedDatabase = async () => {
  try {
    // 1. Initialize tables if they don't exist
    await initDB();

    console.log('Clearing old SQLite database records...');
    await runQuery('DELETE FROM patients');
    await runQuery('DELETE FROM doctors');

    // 2. Hash passwords and insert doctors
    console.log('Seeding doctors into SQLite...');
    for (const doc of doctorsData) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(doc.password, salt);
      
      await runQuery(
        `INSERT INTO doctors (doctorId, name, title, room, dept, avatar, status, avgTime, email, password) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.doctorId,
          doc.name,
          doc.title,
          doc.room,
          doc.dept,
          doc.avatar,
          doc.status,
          doc.avgTime,
          doc.email.toLowerCase(),
          hashedPassword
        ]
      );
    }
    console.log(`Successfully seeded ${doctorsData.length} doctors.`);

    // 3. Insert patients
    console.log('Seeding patients queue into SQLite...');
    const patients = getPatientsData();
    for (const p of patients) {
      await runQuery(
        `INSERT INTO patients (id, name, dept, doctorId, status, timeAdded) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.dept, p.doctorId, p.status, p.timeAdded]
      );
    }
    console.log(`Successfully seeded ${patients.length} patients in queue.`);

    console.log('SQLite Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`SQLite Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();

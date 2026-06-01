const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Run query (INSERT/UPDATE/DELETE)
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Get multiple rows
const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Get single row
const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize DB
const initDB = async () => {
  try {
    await runQuery(`PRAGMA foreign_keys = ON`);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctorId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        room TEXT NOT NULL,
        dept TEXT NOT NULL,
        avatar TEXT NOT NULL,
        status TEXT CHECK(status IN ('Available', 'In Consultation', 'Busy')) DEFAULT 'Available',
        avgTime INTEGER DEFAULT 15,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dept TEXT NOT NULL,
        doctorId TEXT NOT NULL,
        status TEXT CHECK(status IN ('Waiting', 'Next', 'In Consultation', 'Emergency', 'Completed')) DEFAULT 'Waiting',
        timeAdded INTEGER NOT NULL,
        FOREIGN KEY (doctorId) REFERENCES doctors (doctorId) ON DELETE CASCADE
      )
    `);

    console.log('✅ SQLite tables ready');
  } catch (err) {
    console.error('❌ DB init error:', err);
  }
};

module.exports = {
  db,
  runQuery,
  allQuery,
  getQuery,
  initDB
};
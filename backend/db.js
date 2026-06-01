const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Run query (INSERT, UPDATE, DELETE)
const runQuery = (sql, params = []) => {
  const stmt = db.prepare(sql);
  const result = stmt.run(params);
  return result; // { lastInsertRowid, changes }
};

// Get multiple rows
const allQuery = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.all(params);
};

// Get single row
const getQuery = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.get(params);
};

// Initialize DB
const initDB = () => {
  try {
    db.exec(`
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

    db.exec(`
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

    console.log('SQLite tables initialized successfully.');
  } catch (err) {
    console.error('DB init error:', err);
  }
};

module.exports = {
  db,
  runQuery,
  allQuery,
  getQuery,
  initDB
};
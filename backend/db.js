const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "database.sqlite"),
  (err) => {
    if (err) {
      console.error("❌ SQLite connection error:", err.message);
    } else {
      console.log("✅ Connected to SQLite database");
    }
  }
);

// -------------------- INIT DB (ADD THIS) --------------------
function initDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS doctors (
          doctorId TEXT PRIMARY KEY,
          name TEXT,
          title TEXT,
          room TEXT,
          dept TEXT,
          avatar TEXT,
          status TEXT,
          avgTime INTEGER,
          email TEXT,
          password TEXT
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          name TEXT,
          dept TEXT,
          doctorId TEXT,
          status TEXT,
          timeAdded INTEGER
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Promise wrapper
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  initDB,   // ✅ IMPORTANT
  runQuery,
  getQuery,
  allQuery,
};
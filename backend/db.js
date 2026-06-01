const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Initialize DB tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        doctorId TEXT PRIMARY KEY,
        name TEXT,
        title TEXT,
        room TEXT,
        dept TEXT,
        avatar TEXT,
        status TEXT,
        avgTime INT,
        email TEXT,
        password TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT,
        dept TEXT,
        doctorId TEXT,
        status TEXT,
        timeAdded BIGINT
      );
    `);

    console.log("✅ PostgreSQL DB initialized");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

// Run query
function runQuery(sql, params = []) {
  return pool.query(sql, params);
}

// Get single row
function getQuery(sql, params = []) {
  return pool.query(sql, params).then((res) => res.rows[0]);
}

// Get all rows
function allQuery(sql, params = []) {
  return pool.query(sql, params).then((res) => res.rows);
}

module.exports = {
  pool,
  initDB,
  runQuery,
  getQuery,
  allQuery,
};
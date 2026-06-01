const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Generic query helper
const query = (text, params) => pool.query(text, params);

// Initialize database tables
const initDB = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        doctorId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        room TEXT NOT NULL,
        dept TEXT NOT NULL,
        avatar TEXT NOT NULL,
        status TEXT DEFAULT 'Available',
        avgTime INT DEFAULT 15,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dept TEXT NOT NULL,
        doctorId TEXT NOT NULL,
        status TEXT DEFAULT 'Waiting',
        timeAdded BIGINT NOT NULL
      )
    `);

    console.log("✅ Supabase connected & tables ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
};

module.exports = {
  query,
  initDB
};
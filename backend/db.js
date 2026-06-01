const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Generic query function
const query = (text, params) => {
  return pool.query(text, params);
};

// INIT TABLES
const initDB = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        doctorid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        room TEXT NOT NULL,
        dept TEXT NOT NULL,
        avatar TEXT NOT NULL,
        status TEXT DEFAULT 'Available',
        avgtime INT DEFAULT 15,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dept TEXT NOT NULL,
        doctorid TEXT NOT NULL,
        status TEXT DEFAULT 'Waiting',
        timeadded BIGINT NOT NULL
      );
    `);

    console.log("✅ Supabase DB connected & tables ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
};

module.exports = {
  query,
  initDB
};
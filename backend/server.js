const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initDB } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// ---------------- ROUTES ----------------

// simple test route
app.get("/", (req, res) => {
  res.json({ message: "MediQueue backend running 🚀" });
});

// doctors route
app.get("/api/doctors", async (req, res) => {
  try {
    const { allQuery } = require("./db");
    const doctors = await allQuery("SELECT * FROM doctors");
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// patients route
app.get("/api/patients", async (req, res) => {
  try {
    const { allQuery } = require("./db");
    const patients = await allQuery("SELECT * FROM patients");
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- START SERVER ----------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await initDB();
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("DB init error:", err);
  }
});
import express from "express";
import pool from "./db.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// GET all users
app.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// POST a new user
app.post("/users", async (req, res) => {
  const { name, email } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );
    const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json(newUser[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [updatedUser] = await pool.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
    res.json(updatedUser[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

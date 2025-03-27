import express from "express";
import pool from "./db.js";
import dotenv from "dotenv";
import { createClient } from "redis";
dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Error:", err));

await redisClient.connect();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

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

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const cachedUser = await redisClient.get(`user:${id}`);

    if (cachedUser) {
      return res.json(JSON.parse(cachedUser));
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    await redisClient.setEx(`user:${id}`, 60, JSON.stringify(user));

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

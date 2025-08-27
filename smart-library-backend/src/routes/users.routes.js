import { Router } from "express";
import { mysqlPool } from '../db/mysql.js';

const router = Router();

router.get("/user/:userId", async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      "SELECT user_id, name, email FROM users WHERE user_id = ?",
      [req.params.userId]
    );
    if (rows.length) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

export default router;
const express = require("express");
const { users } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => res.json(users));

router.get("/:id", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

// Admin panel -> role dropdown
router.patch("/:id", requireAuth, requireRole("Admin"), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const { role, title, name } = req.body;
  if (role) user.role = role;
  if (title) user.title = title;
  if (name) user.name = name;
  res.json(user);
});

// RatingModal -> applyRatings
router.post("/:id/ratings", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const { projectId, rating, feedback } = req.body;
  if (!projectId || !rating) return res.status(400).json({ error: "projectId and rating are required" });
  user.ratings.push({ projectId, rating, feedback: feedback || "" });
  res.status(201).json(user);
});

module.exports = router;

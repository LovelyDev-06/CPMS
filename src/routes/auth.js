const express = require("express");
const { users } = require("../data/store");
const { uid } = require("../utils/helpers");
const { issueToken } = require("../middleware/auth");

const router = express.Router();

// Mirrors LoginView's "pick a demo account" flow.
router.post("/login", (req, res) => {
  const { userId } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user, token: issueToken(user.id) });
});

// Mirrors the "Create account" form.
router.post("/register", (req, res) => {
  const { name, email, role, title } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email are required" });
  const user = {
    id: uid("u"), name, email, role: role || "Team Member",
    title: title || role || "Team Member", color: "#4C5FD5", ratings: [],
  };
  users.push(user);
  res.status(201).json({ user, token: issueToken(user.id) });
});

// Mirrors the "Forgot password?" flow — demo only, no email sent.
router.post("/forgot-password", (req, res) => {
  res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
});

module.exports = router;

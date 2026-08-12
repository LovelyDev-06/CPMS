const express = require("express");
const { notifications } = require("../data/store");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.json(notifications.filter((n) => n.userId === req.user.id));
});

router.patch("/:id/read", requireAuth, (req, res) => {
  const n = notifications.find((x) => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: "Not found" });
  n.read = true;
  res.json(n);
});

router.patch("/read-all", requireAuth, (req, res) => {
  notifications.filter((n) => n.userId === req.user.id).forEach((n) => (n.read = true));
  res.json({ ok: true });
});

module.exports = router;

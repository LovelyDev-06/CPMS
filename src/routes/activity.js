const express = require("express");
const { activity } = require("../data/store");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const { projectId } = req.query;
  const result = projectId ? activity.filter((a) => a.projectId === projectId) : activity;
  res.json(result);
});

module.exports = router;

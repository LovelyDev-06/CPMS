require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/users");
const projectRoutes = require("./src/routes/projects");
const taskRoutes = require("./src/routes/tasks");
const notificationRoutes = require("./src/routes/notifications");
const activityRoutes = require("./src/routes/activity");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

// 404 for unmatched API routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Nimbus API listening on http://localhost:${PORT}`));

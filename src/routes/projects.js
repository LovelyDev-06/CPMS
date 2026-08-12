const express = require("express");
const { projects, activity, users } = require("../data/store");
const { requireAuth } = require("../middleware/auth");
const { uid, todayISO, addDays } = require("../utils/helpers");

const router = express.Router();

// Same rule as the frontend's ctx.canManageProject
function canManageProject(user, project) {
  if (!project) return false;
  if (user.role === "Admin") return true;
  return user.role === "Project Manager" && project.memberIds.includes(user.id);
}
function logActivity(projectId, userId, action) {
  activity.unshift({ id: uid("a"), projectId, userId, action, date: todayISO() });
}
function visibleProjects(user) {
  if (user.role === "Admin") return projects;
  return projects.filter((p) => p.memberIds.includes(user.id));
}

router.get("/", requireAuth, (req, res) => res.json(visibleProjects(req.user)));

router.get("/:id", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

router.post("/", requireAuth, (req, res) => {
  if (!["Admin", "Project Manager"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const project = {
    id: uid("p"), name: "Untitled Project", client: "Internal", description: "", status: "Active",
    template: "Blank", startDate: todayISO(), endDate: addDays(todayISO(), 30), memberIds: [], tags: [],
    milestones: [], sprints: [], risks: [], meetings: [], announcements: [], ...req.body,
  };
  projects.unshift(project);
  logActivity(project.id, req.user.id, "created project");
  res.status(201).json(project);
});

router.patch("/:id", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  Object.assign(project, req.body);
  logActivity(project.id, req.user.id, "updated project details");
  res.json(project);
});

// body: { status: "Active" | "Archived" | "Completed" }
router.patch("/:id/status", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  project.status = req.body.status;
  logActivity(project.id, req.user.id, `marked the project ${req.body.status}`);
  res.json(project);
});

router.post("/:id/announcements", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  const announcement = { id: uid("an"), authorId: req.user.id, text: req.body.text, date: todayISO() };
  project.announcements.unshift(announcement);
  logActivity(project.id, req.user.id, "posted an announcement");
  res.status(201).json(announcement);
});

router.post("/:id/members", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  const { userId } = req.body;
  if (!project.memberIds.includes(userId)) project.memberIds.push(userId);
  logActivity(project.id, req.user.id, `added ${users.find((u) => u.id === userId)?.name} to the team`);
  res.json(project);
});

router.delete("/:id/members/:userId", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  project.memberIds = project.memberIds.filter((id) => id !== req.params.userId);
  logActivity(project.id, req.user.id, "removed a member from the team");
  res.json(project);
});

router.post("/:id/sprints", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  const sprint = { id: uid("s"), status: "Planned", start: todayISO(), end: addDays(todayISO(), 14), ...req.body };
  project.sprints.push(sprint);
  logActivity(project.id, req.user.id, `created sprint '${sprint.name}'`);
  res.status(201).json(sprint);
});

router.post("/:id/risks", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  const risk = { id: uid("r"), ...req.body };
  project.risks.push(risk);
  logActivity(project.id, req.user.id, `logged risk '${risk.title}'`);
  res.status(201).json(risk);
});

router.delete("/:id/risks/:riskId", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  project.risks = project.risks.filter((r) => r.id !== req.params.riskId);
  res.status(204).end();
});

router.post("/:id/meetings", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canManageProject(req.user, project)) return res.status(403).json({ error: "Forbidden" });
  const meeting = { id: uid("mt"), actionItems: [], ...req.body };
  project.meetings.unshift(meeting);
  logActivity(project.id, req.user.id, `scheduled meeting '${meeting.title}'`);
  res.status(201).json(meeting);
});

module.exports = router;

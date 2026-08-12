const express = require("express");
const { tasks, projects, notifications, activity, users } = require("../data/store");
const { requireAuth } = require("../middleware/auth");
const { uid, todayISO } = require("../utils/helpers");

const router = express.Router();
const STATUSES = ["To Do", "In Progress", "Under Review", "Completed"];

function canManageProject(user, project) {
  if (!project) return false;
  if (user.role === "Admin") return true;
  return user.role === "Project Manager" && project.memberIds.includes(user.id);
}
function logActivity(projectId, userId, action) {
  activity.unshift({ id: uid("a"), projectId, userId, action, date: todayISO() });
}
function notify(userId, text, type = "info") {
  if (!userId) return;
  notifications.unshift({ id: uid("n"), userId, text, date: todayISO(), read: false, type });
}

router.get("/", requireAuth, (req, res) => {
  let result = tasks;
  const { projectId, assigneeId, status } = req.query;
  if (projectId) result = result.filter((t) => t.projectId === projectId);
  if (assigneeId) result = result.filter((t) => t.assigneeId === assigneeId);
  if (status) result = result.filter((t) => t.status === status);
  res.json(result);
});

router.get("/:id", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

router.post("/", requireAuth, (req, res) => {
  const project = projects.find((p) => p.id === req.body.projectId);
  if (!project) return res.status(400).json({ error: "Invalid projectId" });
  const task = {
    id: uid("t"), sprintId: null, description: "", type: "Task", severity: null, status: "To Do",
    priority: "Medium", assigneeId: null, tags: [], subtasks: [], comments: [], attachments: [],
    dependsOn: [], estimate: 4, timeLogged: 0, recurring: { enabled: false, freq: "Weekly" },
    createdAt: todayISO(), reporterId: req.user.id, ...req.body,
  };
  tasks.unshift(task);
  if (task.assigneeId) notify(task.assigneeId, `You were assigned '${task.title}'`, "assign");
  logActivity(task.projectId, req.user.id, `created task '${task.title}'`);
  res.status(201).json(task);
});

// General field edits (title, description, priority, dueDate, tags, estimate, assignee, recurring...)
router.patch("/:id", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const { status, ...rest } = req.body; // status changes go through /status so the rules below always apply
  Object.assign(task, rest);
  if (rest.assigneeId) notify(rest.assigneeId, `You were assigned '${task.title}'`, "assign");
  res.json(task);
});

// Mirrors ctx.changeTaskStatus's permission + dependency + notification rules
router.patch("/:id/status", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const project = projects.find((p) => p.id === task.projectId);
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const isOwner = req.user.id === task.assigneeId;
  const manager = canManageProject(req.user, project);
  if (!manager && !isOwner) return res.status(403).json({ error: "You don't have permission to move this task" });
  if (!manager && isOwner && status === "Completed") {
    return res.status(403).json({ error: "Only a manager can mark a task Completed — submit it for review instead" });
  }

  task.status = status;
  logActivity(task.projectId, req.user.id, `moved '${task.title}' to ${status}`);

  if (status === "Under Review" && project) {
    project.memberIds
      .map((id) => users.find((u) => u.id === id))
      .filter((u) => u && (u.role === "Project Manager" || u.role === "Admin"))
      .forEach((u) => notify(u.id, `'${task.title}' was submitted for review`, "review"));
  }
  if (status === "Completed" && task.assigneeId) {
    notify(task.assigneeId, `'${task.title}' was approved and marked Completed`, "approve");
  }
  res.json(task);
});

router.delete("/:id", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  tasks.splice(tasks.indexOf(task), 1);
  logActivity(task.projectId, req.user.id, `deleted task '${task.title}'`);
  res.status(204).end();
});

router.post("/:id/subtasks", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const subtask = { id: uid("st"), text: req.body.text, done: false };
  task.subtasks.push(subtask);
  res.status(201).json(subtask);
});

router.patch("/:id/subtasks/:subId", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const sub = task.subtasks.find((s) => s.id === req.params.subId);
  if (!sub) return res.status(404).json({ error: "Not found" });
  sub.done = req.body.done ?? !sub.done;
  res.json(sub);
});

router.post("/:id/comments", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const comment = { id: uid("c"), userId: req.user.id, text: req.body.text, date: todayISO() };
  task.comments.push(comment);
  users.filter((u) => req.body.text.includes("@" + u.name))
    .forEach((u) => notify(u.id, `${req.user.name} mentioned you on '${task.title}'`, "mention"));
  logActivity(task.projectId, req.user.id, `commented on '${task.title}'`);
  res.status(201).json(comment);
});

router.post("/:id/attachments", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const attachment = { id: uid("f"), name: req.body.name };
  task.attachments.push(attachment);
  res.status(201).json(attachment);
});

router.post("/:id/time-log", requireAuth, (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const hours = Number(req.body.hours);
  if (!hours) return res.status(400).json({ error: "hours must be a non-zero number" });
  task.timeLogged += hours;
  logActivity(task.projectId, req.user.id, `logged ${hours}h on '${task.title}'`);
  res.json(task);
});

module.exports = router;

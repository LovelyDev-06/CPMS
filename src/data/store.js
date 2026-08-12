const { uid, todayISO, addDays } = require("../utils/helpers");

// NOTE: This is an in-memory store — data resets whenever the server restarts.
// Once the API shape feels right, swap these arrays for a real database
// (Postgres/Mongo) behind the same functions without changing any routes.

const ROLES = ["Admin", "Project Manager", "Team Member", "Client"];
const STATUSES = ["To Do", "In Progress", "Under Review", "Completed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const users = [
  { id: "u1", name: "Priya Sharma", role: "Admin", title: "System Admin", email: "priya@nimbus.io", color: "#4C5FD5", ratings: [] },
  { id: "u2", name: "Rohan Mehta", role: "Project Manager", title: "Senior PM", email: "rohan@nimbus.io", color: "#1E9E82", ratings: [] },
  { id: "u3", name: "Aisha Khan", role: "Team Member", title: "Frontend Engineer", email: "aisha@nimbus.io", color: "#D98E2B", ratings: [] },
  { id: "u4", name: "Dev Patel", role: "Team Member", title: "Backend Engineer", email: "dev@nimbus.io", color: "#E0692F", ratings: [] },
  { id: "u5", name: "Meera Nair", role: "Team Member", title: "QA Engineer", email: "meera@nimbus.io", color: "#8B6BD6", ratings: [] },
  { id: "u6", name: "Vikram Rao", role: "Client", title: "Client — Acme Retail", email: "vikram@acme-corp.com", color: "#D14343", ratings: [] },
];

const projects = [
  {
    id: "p1",
    name: "Acme Retail Revamp",
    client: "Acme Corp",
    description: "Full storefront redesign with a new checkout flow, inventory sync and a merchant analytics dashboard.",
    status: "Active",
    template: "Web App",
    startDate: addDays(todayISO(), -20),
    endDate: addDays(todayISO(), 25),
    memberIds: ["u2", "u3", "u4", "u5", "u6"],
    tags: ["Frontend", "Backend", "API"],
    milestones: [
      { id: uid("m"), name: "Design freeze", date: addDays(todayISO(), -5), done: true },
      { id: uid("m"), name: "Checkout beta", date: addDays(todayISO(), 4), done: false },
    ],
    sprints: [
      { id: "s1", name: "Sprint 4 — Checkout", goal: "Ship guest checkout + payment retries", start: addDays(todayISO(), -6), end: addDays(todayISO(), 8), status: "Active" },
    ],
    risks: [],
    meetings: [],
    announcements: [],
  },
];

const tasks = [
  {
    id: "t1", projectId: "p1", sprintId: "s1", title: "Build guest checkout form",
    description: "Multi-step form with address validation and saved-card support.",
    type: "Task", severity: null, status: "In Progress", priority: "High",
    assigneeId: "u3", reporterId: "u2", dueDate: addDays(todayISO(), 2),
    tags: ["Frontend"], subtasks: [], comments: [], attachments: [], dependsOn: [],
    estimate: 10, timeLogged: 6, recurring: { enabled: false, freq: "Weekly" }, createdAt: todayISO(),
  },
  {
    id: "t2", projectId: "p1", sprintId: "s1", title: "Payment retry queue",
    description: "Queue + backoff for failed gateway calls.",
    type: "Task", severity: null, status: "To Do", priority: "Critical",
    assigneeId: "u4", reporterId: "u2", dueDate: addDays(todayISO(), 3),
    tags: ["Backend", "API"], subtasks: [], comments: [], attachments: [], dependsOn: [],
    estimate: 12, timeLogged: 0, recurring: { enabled: false, freq: "Weekly" }, createdAt: todayISO(),
  },
];

const notifications = [];
const activity = [
  { id: uid("a"), projectId: "p1", userId: "u2", action: "created project", date: addDays(todayISO(), -20) },
];

module.exports = { users, projects, tasks, notifications, activity, ROLES, STATUSES, PRIORITIES };

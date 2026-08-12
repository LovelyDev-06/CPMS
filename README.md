# Nimbus Backend (Express)

A REST API that mirrors the data model and business rules already living in
your React artifact's `useState` calls — same shapes for users, projects,
tasks, notifications, and activity, plus the same permission rules
(`canManageProject`, the review→approve task workflow, etc).

## 1. Run it

```bash
cd nimbus-backend
npm install
npm run dev        # or: npm start
```

Server starts at `http://localhost:4000`. Check `GET /api/health`.

Data is **in-memory** — it resets on restart. That's intentional for now:
get the API shape right first, then swap `src/data/store.js`'s arrays for a
real database (see "Next steps" below) without touching any route files.

## 2. Auth model

This is demo-grade auth matching your `LoginView`'s "pick a demo account"
flow — no passwords yet:

```
POST /api/auth/login        { userId }                 -> { user, token }
POST /api/auth/register     { name, email, role, title } -> { user, token }
POST /api/auth/forgot-password { email }                -> { ok: true }
```

`token` is just the userId, base64-encoded — send it as
`Authorization: Bearer <token>` on every other request. `requireAuth`
middleware decodes it back into `req.user`. This is fine for wiring up the
UI; **before any real user data touches it**, swap in `jsonwebtoken` +
hashed passwords (`bcrypt`).

## 3. Endpoints

| Resource | Route | Mirrors |
|---|---|---|
| Users | `GET /api/users` | `users` state |
| | `GET /api/users/:id` | |
| | `PATCH /api/users/:id` (Admin) | Admin panel role dropdown |
| | `POST /api/users/:id/ratings` | `applyRatings` |
| Projects | `GET /api/projects` | `projects` state (auto-scoped to role) |
| | `GET /api/projects/:id` | |
| | `POST /api/projects` | `saveProject` (create) |
| | `PATCH /api/projects/:id` | `saveProject` (edit) |
| | `PATCH /api/projects/:id/status` | `archiveProject` / `completeProject` |
| | `POST /api/projects/:id/announcements` | `postAnnouncement` |
| | `POST /api/projects/:id/members` | `TeamTab` add member |
| | `DELETE /api/projects/:id/members/:userId` | `TeamTab` remove member |
| | `POST /api/projects/:id/sprints` | `SprintsTab` new sprint |
| | `POST /api/projects/:id/risks` | `RisksTab` add risk |
| | `DELETE /api/projects/:id/risks/:riskId` | `RisksTab` remove risk |
| | `POST /api/projects/:id/meetings` | `MeetingsTab` schedule meeting |
| Tasks | `GET /api/tasks?projectId=&assigneeId=&status=` | `tasks` state |
| | `POST /api/tasks` | `createTask` |
| | `PATCH /api/tasks/:id` | `updateTask` (general fields) |
| | `PATCH /api/tasks/:id/status` | `changeTaskStatus` (**permission rules live here**) |
| | `DELETE /api/tasks/:id` | `deleteTask` |
| | `POST /api/tasks/:id/subtasks` | add subtask |
| | `PATCH /api/tasks/:id/subtasks/:subId` | toggle subtask |
| | `POST /api/tasks/:id/comments` | comment + @mention notifications |
| | `POST /api/tasks/:id/attachments` | add attachment |
| | `POST /api/tasks/:id/time-log` | log hours |
| Notifications | `GET /api/notifications` | scoped to current user |
| | `PATCH /api/notifications/:id/read` | |
| | `PATCH /api/notifications/read-all` | `markAllRead` |
| Activity | `GET /api/activity?projectId=` | `activity` feed |

## 4. Wiring the React artifact to this API

The cleanest path: keep every component exactly as it is, and rewrite just
the **action functions in `App`'s `ctx` object** (`createTask`, `updateTask`,
`changeTaskStatus`, `saveProject`, etc.) to call `fetch` instead of
`setState`. The components already call `ctx.xxx()` — they don't care what's
inside.

Add a tiny API client:

```js
// api.js
const API_BASE = "http://localhost:4000/api";
let token = null;
export const setToken = (t) => (token = t);

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (userId) => request("/auth/login", { method: "POST", body: JSON.stringify({ userId }) }),
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getUsers: () => request("/users"),
  getProjects: () => request("/projects"),
  getTasks: (params = "") => request(`/tasks${params}`),
  createTask: (data) => request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id, patch) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  changeTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  // ...one line per remaining endpoint in the table above
};
```

Then, inside `App`, replace the local-state mutations with API calls +
re-fetch (or optimistic updates). Two examples:

```js
// Login: replaces setCurrentUserId(id)
const handleLogin = async (userId) => {
  const { user, token } = await api.login(userId);
  setToken(token);
  setCurrentUserId(user.id);
  const [freshUsers, freshProjects, freshTasks] = await Promise.all([
    api.getUsers(), api.getProjects(), api.getTasks(),
  ]);
  setUsers(freshUsers); setProjects(freshProjects); setTasks(freshTasks);
};

// changeTaskStatus: replaces the local permission-check + setTasks
const changeTaskStatus = async (task, newStatus) => {
  try {
    const updated = await api.changeTaskStatus(task.id, newStatus);
    setTasks((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
  } catch (e) {
    showToast(e.message); // server sends back the same messages you already show
  }
};
```

Repeat this pattern for `createTask`, `updateTask`, `deleteTask`,
`saveProject`, `archiveProject`, `completeProject`, `postAnnouncement`, and
`applyRatings` — each one becomes "call the matching endpoint, then merge
the response into state." Since the server now owns validation and
permissions, you can also delete the duplicated permission checks in the
frontend (e.g. `canManageProject`), or keep them client-side purely to hide
buttons the user can't use — just don't rely on them for security anymore.

## 5. Next steps toward production

- **Persistence**: replace the arrays in `src/data/store.js` with a real
  database. SQLite (`better-sqlite3`) is the lowest-friction upgrade for a
  single-server app; Postgres (`pg` + Prisma) if you'll scale out.
- **Real auth**: `jsonwebtoken` for signed tokens with expiry,
  `bcrypt` for password hashing, and an actual password field on `users`.
- **Validation**: add `zod` or `express-validator` on request bodies —
  right now a bad `PATCH /tasks/:id` body can write arbitrary fields.
- **Websockets**: notifications and activity feeds are naturally
  real-time — consider `socket.io` so a teammate's status change shows up
  without a refresh.
- **File uploads**: `attachments` currently just store a filename string;
  swap for real uploads via `multer` + S3/local disk if you need that.

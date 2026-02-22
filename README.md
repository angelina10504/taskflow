# TaskFlow

A full-stack project management app (Trello/Notion-style) with workspaces, projects, and a Kanban task board.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express 5, MongoDB + Mongoose, Socket.IO |
| **Auth** | JWT (access 15m + refresh 7d), bcryptjs |
| **Frontend** | React 19, React Router 7, Chakra UI 3 |
| **State** | Context API (AuthContext) |
| **Drag & Drop** | @dnd-kit |
| **HTTP** | Axios with auto token-refresh interceptors |
| **Deployment** | Railway (backend) |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── models/         User, Workspace, Project, Task
│   ├── controllers/    auth, workspace, project, task
│   ├── routes/         /api/auth, /workspaces, /projects, /tasks
│   ├── middleware/     JWT auth guard
│   └── server.js
└── frontend/
    ├── pages/          Login, Register, Dashboard, Workspaces, WorkspaceDetail, ProjectDetail
    ├── components/     KanbanBoard, TaskCard, Modals, etc.
    ├── services/       api.js (axios), authService, workspaceService, etc.
    └── context/        AuthContext
```

---

## Key Features

- **Auth**: Register/Login with JWT stored in localStorage, auto-refresh on 401
- **Workspaces**: Multi-tenant, role-based access (owner/admin/member/viewer), invite members by email with 7-day expiring tokens
- **Projects**: Color/icon customization, deadlines, archive/unarchive
- **Tasks**: Kanban board (todo → in_progress → in_review → done), drag-and-drop ordering, priority levels, assignees, labels, estimated time — auto-timestamps when moved to "done"

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| POST | `/refresh-token` | Refresh access token |
| GET | `/me` | Get current user (protected) |

### Workspaces (`/api/workspaces`) — all protected
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all user's workspaces |
| GET | `/:id` | Get single workspace |
| POST | `/` | Create workspace |
| PUT | `/:id` | Update workspace |
| DELETE | `/:id` | Delete workspace |
| POST | `/:id/leave` | Leave workspace |
| POST | `/:id/invite` | Invite member by email |
| DELETE | `/:id/members/:userId` | Remove member |

### Projects (`/api/projects`) — all protected
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get projects (requires `?workspace=id`) |
| GET | `/:id` | Get single project |
| POST | `/` | Create project |
| PUT | `/:id` | Update project |
| DELETE | `/:id` | Delete project |
| PATCH | `/:id/archive` | Toggle archive status |

### Tasks (`/api/tasks`) — all protected
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get tasks (requires `?project=id`) |
| GET | `/:id` | Get single task |
| POST | `/` | Create task |
| PUT | `/:id` | Update task |
| PATCH | `/:id/status` | Update task status & position |
| PATCH | `/:id/reorder` | Batch reorder tasks |
| DELETE | `/:id` | Delete task |

---

## Database Models

### User
- `name`, `email` (unique), `password` (hashed), `avatar`, `bio`, `timezone`, `isEmailVerified`

### Workspace
- `name`, `description`, `owner` → User
- `members[]` → `{ user, role: owner|admin|member|viewer, joinedAt }`
- `invitations[]` → `{ email, role, token, expiresAt (7d), invitedBy }`
- Pre-save hook: automatically adds owner to members on creation

### Project
- `name`, `description`, `workspace` → Workspace
- `color` (default: #6366f1), `icon` (default: 📊), `deadline`
- `status: active | archived`, `createdBy` → User

### Task
- `title`, `description`, `project` → Project, `workspace` → Workspace
- `status: todo | in_progress | in_review | done`
- `priority: low | medium | high | urgent`
- `assignedTo[]` → User, `createdBy` → User
- `dueDate`, `estimatedTime` (minutes), `labels[]`, `position`
- `completedAt` — auto-set when status becomes `done`

---

## Authentication Flow

```
Register/Login
  → Generate JWT (access token: 15m, refresh token: 7d)
  → Store in localStorage
  → Include access token in Authorization header
  → 401 response? → Use refresh token to get new access token
  → Retry original request
  → Logout + redirect on refresh failure
```

---

## Security

- Password hashing with bcryptjs (10 salt rounds)
- Short-lived JWT access tokens (15 min) with refresh mechanism
- Workspace membership verified on all project/task operations
- Role-based access control (owner/admin/member/viewer)
- CORS configured for client origin
- Protected routes on frontend

---

## Known TODOs

- Email sending for member invitations (no email client configured yet)
- Task detail modal on click
- Full real-time collaboration via Socket.IO (scaffolded but minimal)
- Password reset flow
- Email verification flow

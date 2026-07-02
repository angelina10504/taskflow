# 📝 TaskFlow

A full-stack, high-performance project management application inspired by Trello and Notion. TaskFlow features a multi-tenant workspace architecture, real-time Kanban boards, a robust JWT-based authentication system, and an **AI layer** that turns raw board data into forecasts and lets you command the board in plain English.

<img width="1470" height="800" alt="image" src="https://github.com/user-attachments/assets/c2d75dde-26f1-40e4-a9ab-85794f6cedf2" />


---

## 🚀 Key Features

* **🤖 AI Velocity Intelligence:** One click turns your board into a forecast — throughput, cycle time, overdue/stale detection, per-assignee workload, and a *projected finish date vs. deadline*, with an AI-written risk verdict, insights, and recommendations.
* **⚡ AI "Command the Board":** A chat box that *acts*, not just answers. Type natural-language commands (e.g. *"move everything in review to done"*, *"assign all unassigned tasks to me"*, *"create a task 'Write release notes' due Friday"*) and an AI agent executes them via tool-use against your tasks.
* **🩺 Proactive Risk Radar:** A scheduled health scan (daily cron + boot catch-up) that checks every active project for overdue work, stale tasks, and deadline slips — then pushes a live risk banner to everyone viewing the project via Socket.IO. No more "analytics you have to remember to check."
* **✨ AI Quick-Add:** Type one line above the board — *"Fix login bug, urgent, due Friday, assign to Sam"* — and the parser extracts a clean title, priority, due date, and assignees into a properly structured task. Works without an AI key too (falls back to a plain task).
* **📋 Meeting Notes → Tasks:** Paste raw standup notes, a Slack thread, or a transcript; the AI extracts the concrete action items (owners, deadlines, priorities) into a review checklist — tick what you want and they're bulk-created on the board. Decisions and FYIs are skipped automatically.
* **🗺️ Plan with AI (Epic Decomposition):** Describe a big goal — *"build Stripe payment integration"* — and the AI drafts 5–10 ordered, board-ready subtasks with priorities and time estimates. Review the plan, untick steps, approve — and the estimates feed straight into Velocity Intelligence's forecasting.
* **Multi-Tenant Workspaces:** Create distinct environments for different teams with Role-Based Access Control (Owner, Admin, Member, Viewer) — enforced server-side: owners/admins assign tasks to anyone, members self-assign only, viewers are read-only.
* **📧 Email Notifications + Calendar Invites:** Assign someone a task and they get a branded email with the details — including a standard `.ics` calendar invite when the task has a due date, so Gmail/Outlook offer "Add to calendar" natively (no Google Calendar OAuth needed). Workspace invitations are emailed too. Works with any SMTP provider via env vars; cleanly disabled when unconfigured.
* **Real-time Kanban:** Interactive board using `@dnd-kit` for smooth drag-and-drop. Task movements are synced across all active users in a project via **Socket.IO**.
* **Smart Tasks:** Track priorities (Low to Urgent), assignees, labels, and estimated time. Automatic `completedAt` timestamps are generated when moved to "Done."
* **Secure Authentication:** Dual-token JWT system (Access/Refresh) with automated silent refreshing via Axios interceptors and Google OAuth support.
* **Member Invitations:** Invite teammates via email with secure, 7-day expiring tokens.
* **Profile Customization:** Ephemeral file handling using Multer, with direct uploads to Cloudinary (auto-cropped to 400x400).

---

## 🤖 AI Features (deep dive)

TaskFlow's AI is **provider-agnostic** — it talks to any OpenAI-compatible endpoint (Groq, Google Gemini, OpenRouter, local Ollama, …) configured purely through environment variables, so you can switch models without touching code. The API key lives only on the backend and is never exposed to the client.

### ✨ Velocity Intelligence — `GET /api/ai/projects/:projectId/velocity`
All hard metrics are computed **deterministically in code** (the LLM never does math). The model only *interprets* the numbers, so figures are always trustworthy.
* **Computed:** completion rate, weekly throughput, average/median cycle time, overdue tasks, stale in-progress tasks (5+ days untouched), estimate coverage, per-assignee workload, and a deadline projection (`projectedFinish` vs. `project.deadline`).
* **AI narrative:** a structured JSON verdict — `riskLevel` (on_track / at_risk / off_track), a headline, summary, insights, and concrete recommendations.
* **Graceful fallback:** with no API key set, the endpoint still returns the full computed metrics plus a rule-based summary (no crash).

### 🩺 Risk Radar — `GET /api/ai/projects/:projectId/health` · `POST …/health/scan`
Proactive monitoring instead of on-demand analytics.
* **Scheduled:** a `node-cron` job (daily, 08:00 server time) plus a boot-time catch-up scan (skips projects scanned in the last ~20h, so restarts don't spam reports).
* **Deterministic risk:** `on_track / at_risk / off_track` is derived purely from computed stats (overdue count, stale in-progress tasks, deadline projection). The LLM only phrases the one-line headline — and is only called when something is actually wrong.
* **Live delivery:** each report is persisted (`HealthReport` collection) and broadcast to the project's Socket.IO room, so the risk banner updates in real time for everyone viewing the board. A "Scan now" button triggers it manually.

### ⚡ Command the Board — `POST /api/ai/projects/:projectId/command`
An agentic tool-use loop maps natural language to real board mutations.
* **Tools:** `update_task`, `create_task`, `delete_task` — each scoped and validated to the project, reusing the same position/`completedAt` logic as the normal task API.
* **Context-aware:** the current board snapshot + workspace member list are passed in, so the agent resolves references like *"me"*, a teammate's name, *"urgent tasks"*, or *"everything in review"*.
* **Safe by design:** deletes only happen when explicitly requested; the response includes a plain-language summary and an action log of exactly what changed, then the board refreshes in place.

### ✨ Quick-Add — `POST /api/ai/projects/:projectId/quick-add`
One line of natural language → one structured task, in a single round-trip.
* **Extracts:** a cleaned imperative title, priority (including implied — *"asap"* → urgent), relative due dates resolved against today's date (*"tomorrow"*, *"Friday"*), assignees matched against workspace members (*"me"* works), and an optional status/description.
* **Validated server-side:** everything the model returns is checked against real enums and the actual member list before any DB write — hallucinated assignees or fields are dropped, never saved.
* **Degrades gracefully:** with no API key (or a failed parse), the raw text simply becomes the task title with default fields, so the input never breaks.

### 📋 Meeting Notes → Tasks — `POST /api/ai/projects/:projectId/extract-tasks` · `POST …/bulk-create`
Review-first by design: extraction and creation are **separate endpoints**, so nothing touches the database until a human approves it.
* **Extraction:** the model pulls only concrete action items (max 12) from up to 12,000 characters of notes — skipping decisions, FYIs, and vague intentions. Owners are matched against real workspace members; people mentioned who aren't members stay unassigned with an *"Owner per notes: …"* note instead of a hallucinated assignment.
* **Review checklist:** every extracted item (title, priority, due date, assignees, context) is shown in the UI with a toggle — untick anything before confirming.
* **Bulk-create:** a deterministic endpoint (no AI involved) re-validates every field server-side and creates the approved tasks with correct board positions.

### 🗺️ Plan with AI — `POST /api/ai/projects/:projectId/decompose`
One sentence in, a trackable project plan out — what a team lead does at sprint kickoff, drafted by the model.
* **Generates** 5–10 ordered subtasks for a stated goal: imperative titles, "what done looks like" descriptions with dependency notes, priorities (foundational work high, polish low), and honest per-task time estimates.
* **Estimates compound:** suggested `estimated_minutes` land in the task's `estimatedTime` field, directly improving Velocity Intelligence's estimate coverage and remaining-effort forecasts.
* **Same review-first flow:** the plan goes through the checklist UI and the shared deterministic `bulk-create` endpoint — the model proposes, the human approves, validated code writes.

### 🧪 Prompt evals — `npm run eval` (backend/evals)
Prompts are code, so they have a test suite: 65 golden cases scored deterministically (no LLM-as-judge) against the **exact production prompts**, imported from the controller rather than copied.
* **What's covered:** 50 quick-add parses (title cleanup, priorities, calendar date resolution, roster-exact assignees, trap cases like a client named *"Friday's Diner"*), 9 meeting-notes extractions **including 2 prompt-injection attacks**, and 6 structural plan decompositions.
* **Reproducible by construction:** the eval clock is pinned (Wed 2026-07-01), so every date expectation is a literal string and any machine gets the same calendar. Scoring mirrors the controllers' own validation, so a pass means production would have stored exactly the expected values.
* **It found real bugs:** the baseline run (80% pass) exposed a systematic self-assignment bias, a weekday-resolution blind spot, and a successful injection override ("IGNORE ALL PREVIOUS INSTRUCTIONS…" returned zero tasks). Three targeted prompt rules later, the suite passes **92%** and the injection is defeated — measured, not eyeballed.
* **Ops-aware runner:** worker pool with backoff for free-tier rate limits, a repair pass for per-minute 429s, **abort on daily-quota exhaustion** (with a distinct exit code), per-run latency/token/cost reporting, `EVAL_API_KEY` so evals never starve production's quota, and a pass-rate threshold that can gate CI.
* **Doubles as a router qualification test:** the same suite run on `llama-3.1-8b-instant` (≈10× cheaper) scores 36.9% — solid on structural planning (6/6 decompose) but hopeless at precision parsing (26% quick-add, 38% assignee accuracy). That's the measurement you need *before* cost-optimizing with model routing. Full details and the results table live in [`backend/evals/README.md`](backend/evals/README.md).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, React Router 7, Chakra UI 3 |
| **Backend** | Node.js, Express 5, MongoDB + Mongoose, Socket.IO |
| **AI** | OpenAI SDK against any OpenAI-compatible endpoint (default: **Groq** / Llama 3.3 70B); structured JSON output + tool-use |
| **Authentication** | JWT (15m Access + 7d Refresh), bcryptjs (10 rounds), Google OAuth |
| **State & HTTP** | Context API, Axios (with interceptors) |
| **Drag & Drop** | `@dnd-kit` |
| **Deployment** | Railway/Render (Backend), Vercel/Netlify (Frontend) |

---

## 🏗️ Architecture & Request Flow

### 1. Silent Authentication & Interceptors
TaskFlow uses a seamless token rotation strategy. Users receive a short-lived **Access Token (15m)** and a long-lived **Refresh Token (7d)** stored as an HttpOnly cookie.
* All API calls route through an Axios instance.
* If a request receives a `401 Unauthorized`, the interceptor automatically pauses the queue, hits `POST /api/auth/refresh-token`, updates the tokens, and retries the original request without user interruption.
* Cookie flags are environment-aware: `secure` + `sameSite: 'none'` in production (cross-site HTTPS), `sameSite: 'lax'` in development (so login works over `http://localhost`).

### 2. Real-time Collaboration (Socket.IO)
When a user opens a project, the client joins a specific Socket.IO room partitioned by `projectId`.
* **Optimized for Cloud:** Connections use `pingTimeout: 60000` and `pingInterval: 25000` to keep the connection alive on ephemeral hosts like Render/Railway.
* **Auto-Reconnect:** The frontend is configured with `reconnection: true` and a `1000ms` delay to handle network drops gracefully.

### 3. AI Layer
A single, provider-agnostic `aiController` powers all six AI features. Hard metrics are computed in `utils/velocityStats.js` (deterministic), then passed to the model for interpretation (Velocity) or to an agentic tool-use loop (Command). Cloudinary is lazy-loaded so heavy/optional dependencies never block server startup. Every prompt is regression-tested by the 65-case eval harness in `backend/evals` (see above), which imports the production prompts directly — a prompt edit that hurts accuracy shows up as a measured score drop, not a user report.

### 4. Database Entity Relationships
The MongoDB schema is designed for multi-tenant scalability:
* **User** belongs to many **Workspaces** (via `members` array).
* **Workspace** contains **Projects** and manages Role-Based Access Control (`owner`, `admin`, `member`, `viewer`).
* **Project** contains **Tasks**.
* **Task** belongs to both a Project and a Workspace (for optimized querying), tracking `status`, `priority`, `position`, and `assignedTo`.

---

## 🔌 Core API Endpoints

### 🔐 Auth (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/register` | Register a new user |
| POST | `/login` | Authenticate and receive JWTs |
| POST | `/refresh-token` | Exchange refresh token for new access token |
| GET | `/me` | Get current authenticated user profile |

### 🤖 AI (`/api/ai`) - *Protected*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/projects/:projectId/velocity` | Velocity & estimate intelligence (computed metrics + AI verdict) |
| POST | `/projects/:projectId/command` | Execute a natural-language command against the board (agentic tool-use) |
| GET | `/projects/:projectId/health` | Latest Risk Radar health report for the project |
| POST | `/projects/:projectId/health/scan` | Run a Risk Radar scan now (broadcasts to the project's socket room) |
| POST | `/projects/:projectId/quick-add` | Parse one line of natural language into a structured task |
| POST | `/projects/:projectId/extract-tasks` | Extract action items from pasted meeting notes (review-first, no writes) |
| POST | `/projects/:projectId/decompose` | Break a high-level goal into ordered, estimated subtasks (review-first, no writes) |
| POST | `/projects/:projectId/bulk-create` | Bulk-create the approved tasks from the review step |

### 🏢 Workspaces (`/api/workspaces`) - *Protected*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/` | Create a new workspace |
| POST | `/:id/invite` | Validate the email, then email a 7-day invitation link (or return it for manual sharing) |
| DELETE | `/:id/members/:userId`| Remove a member from the workspace |

### 📊 Projects & Tasks (`/api/projects`, `/api/tasks`) - *Protected*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/projects?workspace=id`| Get all projects for a workspace |
| PATCH | `/tasks/:id/status` | Update task status (todo/in_progress/done) |
| PATCH | `/tasks/:id/reorder` | Batch update task positions after drag-and-drop |

---

## ⚙️ Environment Setup

Create a `.env` file in the `/backend` directory (it is gitignored — never commit it):

```env
NODE_ENV=development
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_access_secret_key
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary (avatar uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI provider (OpenAI-compatible). Default = Groq.
# Get a free key at https://console.groq.com/keys
AI_API_KEY=your_groq_api_key      # e.g. gsk_...
AI_MODEL=llama-3.3-70b-versatile
AI_BASE_URL=https://api.groq.com/openai/v1
# To switch providers, change the three vars above, e.g.:
#   Gemini: AI_MODEL=gemini-2.0-flash  AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
#   Ollama: AI_MODEL=llama3.1          AI_BASE_URL=http://localhost:11434/v1

# Email notifications (optional — any SMTP provider works; leave as-is to disable)
# Gmail: smtp.gmail.com + an App Password (Google Account → Security → 2FA → App passwords)
# Brevo free tier: smtp-relay.brevo.com (300 emails/day)
SMTP_HOST=your_smtp_host_here
SMTP_PORT=587
SMTP_USER=your_smtp_user_here
SMTP_PASS=your_smtp_password_here
MAIL_FROM="TaskFlow <no-reply@yourdomain.com>"
```

The frontend reads its API/Socket URLs from `frontend/.env` (production) / `frontend/.env.local` (local), e.g. `REACT_APP_API_URL=http://localhost:5001`.

> **Deploying?** Because `.env` is gitignored, set these same variables in your host's dashboard (Render/Railway → Environment Variables). The AI features won't work in production until `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL` are set there.

---

## ▶️ Running Locally

```bash
# Backend
cd backend
npm install
npm start          # http://localhost:5001

# Frontend (in a second terminal)
cd frontend
npm install
npm start          # http://localhost:3000
```

---

## 👩‍💻 Author

Angelina Gupta

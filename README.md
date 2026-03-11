# 📝 TaskFlow

A full-stack, high-performance project management application inspired by Trello and Notion. TaskFlow features a multi-tenant workspace architecture, real-time Kanban boards, and a robust JWT-based authentication system.

*(Add your main project screenshot here)*
![TaskFlow Kanban Board](./screenshots/main-board.png)

---

## 🚀 Key Features

* **Multi-Tenant Workspaces:** Create distinct environments for different teams with Role-Based Access Control (Owner, Admin, Member, Viewer).
* **Real-time Kanban:** Interactive board using `@dnd-kit` for smooth drag-and-drop. Task movements are synced across all active users in a project via **Socket.IO**.
* **Smart Tasks:** Track priorities (Low to Urgent), assignees, labels, and estimated time. Automatic `completedAt` timestamps are generated when moved to "Done."
* **Secure Authentication:** Dual-token JWT system (Access/Refresh) with automated silent refreshing via Axios interceptors and Google OAuth support.
* **Member Invitations:** Invite teammates via email with secure, 7-day expiring tokens.
* **Profile Customization:** Ephemeral file handling using Multer, with direct uploads to Cloudinary (auto-cropped to 400x400).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, React Router 7, Chakra UI 3 |
| **Backend** | Node.js, Express 5, MongoDB + Mongoose, Socket.IO |
| **Authentication** | JWT (15m Access + 7d Refresh), bcryptjs (10 rounds) |
| **State & HTTP** | Context API, Axios (with interceptors) |
| **Drag & Drop** | `@dnd-kit` |
| **Deployment** | Railway/Render (Backend), Vercel/Netlify (Frontend) |

---

## 🏗️ Architecture & Request Flow

### 1. Silent Authentication & Interceptors
TaskFlow uses a seamless token rotation strategy. Users receive a short-lived **Access Token (15m)** and a long-lived **Refresh Token (7d)** stored in `localStorage`. 
* All API calls route through an Axios instance.
* If a request receives a `401 Unauthorized`, the interceptor automatically pauses the queue, hits `POST /api/auth/refresh-token`, updates the tokens, and retries the original request without user interruption.

### 2. Real-time Collaboration (Socket.IO)
When a user opens a project, the client joins a specific Socket.IO room partitioned by `projectId`. 
* **Optimized for Cloud:** Connections use `pingTimeout: 60000` and `pingInterval: 25000` to keep the connection alive on ephemeral hosts like Render/Railway.
* **Auto-Reconnect:** The frontend is configured with `reconnection: true` and a `1000ms` delay to handle network drops gracefully.

### 3. Database Entity Relationships
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

### 🏢 Workspaces (`/api/workspaces`) - *Protected*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/` | Create a new workspace |
| POST | `/:id/invite` | Generate a 7-day email invitation token |
| DELETE | `/:id/members/:userId`| Remove a member from the workspace |

### 📊 Projects & Tasks (`/api/projects`, `/api/tasks`) - *Protected*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/projects?workspace=id`| Get all projects for a workspace |
| PATCH | `/tasks/:id/status` | Update task status (todo/in_progress/done) |
| PATCH | `/tasks/:id/reorder` | Batch update task positions after drag-and-drop |

---

## ⚙️ Environment Setup

To run this project locally, create a `.env` file in the `/backend` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000

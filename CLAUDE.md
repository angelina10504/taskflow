# CLAUDE.md — TaskFlow

Guidance for Claude Code working in this repo. `README.md` is the feature tour; this file is the
operational contract: invariants that must hold, conventions to match, and the gaps that are
currently unfixed. **Read the Multi-tenancy and Socket sections before touching anything that
reads or emits user data.**

MERN: Express 5 + Mongoose (`backend/`), React 19 CRA + Chakra UI v3 (`frontend/`), Socket.IO for
realtime, Groq (via the `openai` SDK) for LLM calls, local MiniLM embeddings for RAG.

## Commands

```bash
cd backend  && npm run dev            # nodemon, port 5001
cd frontend && npm start              # CRA, port 3000
cd backend  && npm run eval -- --suite today   # prompt evals (burns Groq quota — see below)
cd backend  && npm run embed:backfill          # backfill task embeddings
```

Never start dev servers with a bare `node`/`npm` background shell — use the preview tooling so the
port is managed. A stale listener on 5001 is the usual cause of `EADDRINUSE`.

## Tenancy model

```
User ──< Workspace.members[] ──< Project ──< Task
         (role: owner|admin|member|viewer)
```

**The workspace is the tenant boundary.** Projects and tasks have no independent access control —
they inherit it from their workspace. `Task` denormalizes `workspace` alongside `project`
(`models/Task.js:19-27`) so tenant-scoped queries never need a join.

## Multi-tenancy invariants

These are not style preferences. Violating one is a cross-tenant data leak.

1. **Every query that touches user content is scoped by tenant. No exceptions.** A client-supplied
   `projectId`, `taskId`, or `workspaceId` is an *untrusted claim of access*, never proof of it.

2. **Resolve, then verify, then query.** The only accepted pattern:

   ```js
   const project = await Project.findById(projectId);
   if (!project) return res.status(404)...
   const { isMember, workspace, role } = await checkWorkspaceMembership(project.workspace, req.user.id);
   if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });
   // ...only now may you query Task.find({ project: projectId })
   ```

   `Task.find({ project: req.params.projectId })` *without* the membership check above is the bug
   this section exists to prevent. It looks scoped. It is not — the id came from the client.

3. **Multi-tenant list endpoints scope by membership set, not by a single id.** Anything spanning
   workspaces (e.g. `globalSearch` in `controllers/aiController.js`) must first resolve the caller's
   workspace memberships and constrain the query with `{ workspace: { $in: [...ids] } }`. Filtering
   results *after* fetching is not acceptable — it leaks through counts, scores, and pagination.

4. **Personal endpoints scope by `req.user.id`.** `getTodayPlan` and `DailyPlan` are per-user, not
   per-workspace; they filter on `assignedTo`/`createdBy`. Plans are personal — never expose another
   user's plan even to a workspace owner.

5. **`checkWorkspaceMembership` is duplicated in three files** — `controllers/taskController.js:7`,
   `controllers/projectController.js:5`, `controllers/aiController.js:15`. They are currently
   identical. If you change membership semantics, change all three or extract them to
   `utils/` first. Fixing one is how this becomes a vulnerability.

6. **RBAC gates sit after the membership check, not instead of it.**
   - `viewer` → read-only; return 403 on any mutation.
   - `member` → may only assign tasks to themselves.
   - `admin` / `owner` → may assign anyone (`canAssignOthers`, `taskController.js:20`).
   - An owner cannot be removed from their own workspace.

   When an LLM proposes assignees, re-apply these rules in code before writing — the model's output
   is a suggestion, not an authorization decision (`aiController.js` filters `assignee_ids` against
   `memberIds` and drops non-self assignments for members).

7. **`AiCall` is the one deliberately un-scoped collection.** It is safe *only* because it is
   content-free by construction (see AI conventions). Never add a field to it that could carry board
   content, prompt text, or model output. If that changes, `/api/ai/ops` must become tenant-scoped
   in the same commit.

## Auth: dual-token JWT flow

Two tokens signed with **two different secrets**. Never conflate them; never verify a refresh token
with `JWT_SECRET`.

| | Access token | Refresh token |
|---|---|---|
| Secret | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| Lifetime | `JWT_EXPIRE` (short) | `JWT_REFRESH_EXPIRE` (7d cookie `maxAge`) |
| Transport | `Authorization: Bearer <t>` | httpOnly cookie `refreshToken` |
| Storage | `localStorage.accessToken` | httpOnly cookie — JS cannot read it |
| Verified by | `protect` (`middleware/auth.js`) | `POST /api/auth/refresh-token` only |

Helpers live in `utils/generateToken.js` (`generateAccessToken`, `generateRefreshToken`,
`verifyAccessToken`, `verifyRefreshToken`); the verify functions return `null` rather than throwing.

**Refresh cycle** (`frontend/src/services/api.js`): a response interceptor catches `401`, guards with
`originalRequest._retry` and an explicit exclusion of the `/refresh-token` URL (both prevent an
infinite refresh loop), calls `refreshAccessToken()`, retries the original request once, and on
failure quietly clears `localStorage` and lets React Router redirect. Do not add
`window.location.href` here — that was deliberately removed.

**Cookie flags** (`controllers/authController.js`): `httpOnly` always; in production `secure: true` +
`sameSite: 'none'` because the Vercel frontend and Railway backend are cross-site; in development
`sameSite: 'lax'` + non-secure because browsers refuse to store a `secure` cookie over
`http://localhost`. `app.set('trust proxy', 1)` in `server.js` is required for the host's reverse
proxy to honor secure cookies — don't remove it.

`protect` only ever validates the **access** token, and rejects with 401 when the header is missing,
the token fails verification, or the user no longer exists.

## Socket layer rules

Current emissions are the entire realtime surface: `online-users` and `task-moved`
(`server.js`), `health-report` (`utils/riskRadar.js:123`). Client side is
`frontend/src/services/socketService.js` plus `ProjectDetail.js` / `KanbanBoard.js`.

**The socket layer has no authentication today** (see Known gaps). Because of that, these rules are
mandatory for any change here:

1. **Do not add a new socket event until handshake auth exists.** Adding one widens a known hole.
   Build the `io.use()` middleware first, in the same PR.
2. **Identity comes from the verified token, never from the payload.** `socket.data.userId` must be
   set by auth middleware from `verifyAccessToken(socket.handshake.auth.token)`. Today
   `join-project` stores a client-supplied `user` object — that is exactly the anti-pattern to
   remove, not to copy.
3. **Room joins are an authorization decision.** `socket.join(projectId)` must be preceded by the
   same resolve→verify→act check the REST controllers use. Membership must be re-checked on join,
   not cached from connect — a removed member must lose access immediately.
4. **Never trust a relayed payload as persistence.** `task-moved` relays a client-supplied task
   object to the room; it is presentation only. All durable writes go through the REST API, which
   is protected. Keep it that way.

## AI conventions

**"Model proposes, code validates."** Deterministic feature extraction and scoring happen in code;
the LLM selects and explains; strict validation rejects anything it invented; a deterministic
fallback always exists. Never let model output reach the database unvalidated, and never let it make
an authorization decision.

- All provider calls go through `loggedChat` (`utils/aiLog.js`) — never call
  `ai.chat.completions.create` directly. It times the call, records token usage, and is
  fire-and-forget so observability can never slow or fail a user request.
- `AiCall` rows are **content-free by construction**: tokens, latency, model, outcome, and a short
  operational `detail` string. No prompt or response text, ever. 30-day TTL.
- Record `recordAiEvent(... outcome: 'rejected')` whenever validation refuses model output and a
  fallback is served, and `'cache'` when a cached result saves a call. These are what make the
  degraded-rate metric on `/ops` honest.
- Prompts used in production are exported via `module.exports.__evalInternals` so
  `backend/evals` tests the exact strings production uses. If you edit a prompt, run its suite.
- `getClient()` returns `null` when no API key is set; every feature must degrade gracefully rather
  than 500. Surface it in the UI with `RuleBasedChip`, never dress a fallback up as an AI opinion.

**Groq quota:** ~100k tokens/day for `llama-3.3-70b-versatile`, shared org-wide between production
and the eval harness. One full eval run is ~60k tokens — two runs exhaust the day and production
starts 429ing. Use `AI_MODEL=llama-3.1-8b-instant` or `EVAL_API_KEY` for eval runs. Eval-harness
calls bypass the server, so quota they burn does **not** appear on `/ops`.

## Design identity

Wine + gold, and the split is semantic — don't blur it.

- **Wine** (`#7a1f3d` = `brand.700`, gradient partner `#a83a58`) is the product brand. Never indigo.
- **Gold** (`#b8892b`) is reserved **exclusively** for AI surfaces. If it isn't the model speaking,
  it isn't gold.
- AI surfaces use the shared primitives in `frontend/src/components/ai/primitives.js` —
  `AIHallmark` (◆, not sparkle emoji), `AIThread` (gold seam, glints while thinking,
  reduced-motion safe), `gold(dark)`, `RuleBasedChip`. Don't invent per-feature AI styling.
- Serif (`fontFamily="ai"`, Fraunces) is the model's *voice* — use it for generated prose, not chrome.
- Colors come from `useColors()` and the theme; both light and dark must be checked on any new page.

## Secrets

`backend/.env` holds the real Groq key, the Mongo URI with credentials, both JWT secrets, the Google
OAuth secret, and SMTP credentials. It is gitignored and **must never be committed**.

- Run `git status --short | grep -E '\.env'` before any commit. If it lists `.env`, stop.
- Inspect it with targeted `grep -o` / `sed`, never by printing the whole file.
- No key, token, or password may ever appear in frontend code — anything in `frontend/` ships to the
  browser. `REACT_APP_*` vars are public by definition.

## Known gaps

Documented deliberately. Do not treat these as done, and do not build on top of them without
closing them first.

### 1. The Socket.IO layer is entirely unauthenticated

`io.on('connection')` in `server.js` has **no `io.use()` handshake middleware**. Any client that can
reach the server may connect without a token, and `join-project` accepts both a `projectId` and a
`user` object straight from the client (`server.js`, `join-project` handler).

Impact, given a project id (a 24-hex ObjectId that appears in board URLs, so any ex-member or anyone
who has seen a link has one):

- **Cross-tenant read.** Joining the room delivers `task-moved` payloads (full task objects — titles,
  descriptions, assignees) and `health-report` broadcasts (headline, issues, open/overdue counts).
- **Presence spoofing.** The presence list renders a client-supplied name and avatar, so a connection
  can appear as any user.
- **Fabricated board activity.** A forged `task-moved` renders on every other client in the room.
  Not persisted — REST writes are protected — so this is trust/UX corruption, not data corruption.
- **Revocation doesn't apply.** Nothing re-checks membership, so a removed member keeps realtime
  access until they disconnect.

Fix: add `io.use()` that verifies the access token from `socket.handshake.auth.token`, sets
`socket.data.userId` from the token, and re-runs `checkWorkspaceMembership` inside `join-project`
before `socket.join`. Derive the presence identity server-side from the authenticated user.

### 2. The invitation flow is only half-built

`POST /api/workspaces/:id/invite` (`controllers/workspaceController.js:249`) has two branches:

- **Existing user** → added to `workspace.members[]` immediately. This path works.
- **New user** → mints a `crypto.randomBytes(32)` token, pushes an entry to `workspace.invitations[]`
  with a 7-day `expiresAt`, and emails a link to `${CLIENT_URL}/invite/${token}`.

**Nothing can redeem that token.** There is no accept/redeem route in `routes/workspaces.js`, no
controller to consume an invitation, and no `/invite/:token` route in `frontend/src/App.js`. The
emailed link is dead, `workspace.invitations[]` only ever grows, and expired entries are never
reaped. The API still returns a success message and the link, so the failure is silent — the
inviter believes it worked.

Fix: add `POST /api/workspaces/invitations/:token/accept` that matches the token, rejects expired
entries, requires an authenticated user whose email matches the invitation, moves them into
`members[]` with the stored role, and `$pull`s the invitation. Add the matching frontend route that
sends unauthenticated visitors through register/login and back. Until then, the UI should not
present the new-user path as a completed action.

### 3. Access token in `localStorage` (accepted trade-off)

The access token is readable by any script on the page, so an XSS becomes session theft. It is a
deliberate trade-off: the token is short-lived and the *refresh* token is httpOnly, so an attacker
gets a bounded window rather than durable access. Revisit if the app ever renders untrusted HTML.

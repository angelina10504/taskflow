// Prefer IPv4 for outbound connections. Hosts like Render have no IPv6 route,
// and Node ≥17 otherwise tries IPv6 first for dual-stack hosts (smtp.gmail.com)
// → "connect ENETUNREACH 2607:..." before the connection is even attempted.
require('dns').setDefaultResultOrder('ipv4first');

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

console.log('✅ Environment loaded');
console.log('📍 MongoDB URI exists:', !!process.env.MONGO_URI);

// A model the provider no longer serves is otherwise invisible until a user hits
// an AI feature and gets a 502. Report it at boot — but keep serving: AI features
// degrade to their deterministic fallbacks (getClient() returns null) and /ops
// carries the reason. A typo in one env var must not take the whole API down.
const { validateModelConfig } = require('./config/aiModels');
const { aiStatus } = require('./utils/aiClient');
const { verifyAccessToken } = require('./utils/generateToken');
const { checkWorkspaceMembership } = require('./utils/workspaceAccess');
const User = require('./models/User');
const Project = require('./models/Project');
const modelConfig = validateModelConfig();
if (modelConfig.problems.length) {
  console.warn('⚠️  AI model configuration:');
  modelConfig.problems.forEach((p) => console.warn(`     - ${p}`));
  console.warn(
    modelConfig.usable
      ? '     Allowed by AI_ALLOW_UNKNOWN_MODEL — calls will be attempted anyway.'
      : '     AI features are DISABLED and serving rule-based fallbacks. See /ops.'
  );
} else {
  console.log('🤖 AI model config OK');
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // Required for Render's reverse proxy to honour secure cookies

// Middleware
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:3000'].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check.
//
// Reports AI configuration next to liveness so a deploy can be verified without
// logging in. The same reason is already written to the boot log and served by
// /api/ai/ops, but logs scroll away and /ops needs auth — so a host env still
// pinning a retired model stayed invisible until a user hit an AI feature and
// got a fallback. One unauthenticated GET now answers it.
//
// Safe to expose: aiStatus() reports only WHETHER a key is present, never its
// value, and the model ids it names are already public in config/aiModels.js.
//
// `status` stays 'ok' when AI is misconfigured, and that is deliberate — the AI
// layer is degradable by design, so a bad model id is not an unhealthy process.
// Flipping this to 503 would make the platform restart a server that is serving
// auth, tasks and the board perfectly well.
app.get('/api/health', (req, res) => {
  const { available, reason, detail, model } = aiStatus();
  res.status(200).json({
    status: 'ok',
    ai: { available, reason: reason || null, model: model || null, detail: detail || null },
  });
});

// Simple test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 TaskFlow API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Rate limiting.
//
// Two limiters because the threats are different shapes.
//
// Auth is credential stuffing: low volume, slow, targeted at one account.
// Keyed by IP because an attacker has no session yet. skipSuccessfulRequests
// means a legitimate user typing one wrong password is not pushed toward the
// ceiling by their subsequent successful login.
//
// The AI routes are a SPEND channel, not just a compute one — the provider
// budget is ~100k tokens/day, shared org-wide with the eval harness, so an
// uncapped endpoint lets one caller exhaust the day for every user and for CI.
// Keyed by user id, falling back to IP before `protect` has run: keying purely
// by IP would let one account behind a shared NAT lock out colleagues, and
// keying purely by user would leave unauthenticated traffic uncounted.
//
// Tradeoff: the default store is in-memory, so counters reset on deploy and are
// per-instance. That is honest for a single Render instance; a second instance
// or a Redis store is required before this is a real global limit.
// ipKeyGenerator is the library's IPv6-safe key helper — a bare req.ip would
// let one IPv6 client rotate through a /64 and bypass the limit entirely.
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in a few minutes.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // ipKeyGenerator takes the IP STRING, not the request — passing `req` yields
  // a fresh object key per request, so the limit silently never triggers.
  keyGenerator: (req) => (req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip)),
  message: {
    success: false,
    message: 'Too many AI requests. These calls share a daily token budget — try again shortly.',
  },
});

// API Routes with error handling
try {
  console.log('📂 Loading routes...');
  // Only the credential-checking routes, not the whole namespace —
  // /me and /refresh-token are called routinely by a logged-in client.
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'], authLimiter);
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
  app.use('/api/workspaces', require('./routes/workspaces'));
  console.log('✅ Workspace routes loaded');
  app.use('/api/projects', require('./routes/projects'));
  console.log('✅ Project routes loaded');
  app.use('/api/tasks', require('./routes/tasks'));
  console.log('✅ Task routes loaded');
  app.use('/api/ai', aiLimiter, require('./routes/ai'));
  console.log('✅ AI routes loaded');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  process.exit(1);
}

// Unmatched API routes return JSON, not Express's HTML error page — a frontend
// that does res.json() on a 404 should get a parseable body, not a SyntaxError
// that hides the real status.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `No route for ${req.method} ${req.originalUrl}` });
});

// Last-resort error handler.
//
// Every controller already try/catches, so this exists for what they cannot
// catch: a synchronous throw in middleware, a malformed JSON body rejected by
// express.json(), a bug in a route handler outside its try block. Without it
// Express replies with an HTML stack trace — which leaks file paths in
// production and breaks any client expecting JSON.
//
// The four-argument signature is what registers this as an error handler; the
// unused `next` cannot be removed.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // A body-parser failure is the client's fault, not ours — report it as 400.
  const status = err.status || err.statusCode || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error('Unhandled error:', err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Server error' : err.message || 'Bad request',
    // Same rule as the controllers: internals are for logs, never for clients.
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io reachable from route handlers (e.g. manual Risk Radar scans)
app.set('io', io);

// projectId -> Map(socketId -> { id, name, avatar })
const projectRooms = new Map();

const broadcastOnlineUsers = (projectId) => {
  const room = projectRooms.get(projectId);
  if (!room) return;
  // Deduplicate by userId before broadcasting
  const seen = new Set();
  const users = [];
  for (const u of room.values()) {
    if (!seen.has(u.id)) { seen.add(u.id); users.push(u); }
  }
  io.to(projectId).emit('online-users', users);
};

// Socket.IO connection handling
// Handshake authentication.
//
// Until this existed, any client that could reach the server could connect and
// join any room given only a project id — a 24-hex ObjectId that appears in
// board URLs, so any ex-member or anyone who had seen a link had one. That
// delivered task-moved payloads (full task objects) and health-report
// broadcasts to unauthenticated listeners, let presence be spoofed as any
// user, and let forged board activity render on every client in the room.
//
// Identity comes from the verified token and nothing else. A connection with
// no token, an expired token, or a token for a deleted user is refused here
// rather than being allowed in and checked later.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const decoded = token ? verifyAccessToken(token) : null;
  if (!decoded?.id) return next(new Error('unauthorized'));

  const user = await User.findById(decoded.id).select('name avatar');
  if (!user) return next(new Error('unauthorized'));

  // The ONLY source of identity for this socket from here on. Nothing the
  // client sends in a payload is allowed to override it.
  socket.data.userId = user._id.toString();
  socket.data.presence = { id: user._id.toString(), name: user.name, avatar: user.avatar || null };
  next();
});

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id, 'as', socket.data.userId);

  // Joining a room is an authorization decision, not a subscription.
  //
  // Membership is re-checked on every join rather than cached at connect, so a
  // member removed from the workspace loses realtime access on their next join
  // instead of keeping it until they happen to disconnect.
  socket.on('join-project', async ({ projectId }) => {
    try {
      const project = await Project.findById(projectId);
      if (!project) return;

      const { isMember } = await checkWorkspaceMembership(project.workspace, socket.data.userId);
      if (!isMember) {
        console.warn(`[socket] refused join: user ${socket.data.userId} -> project ${projectId}`);
        return;
      }

      socket.join(projectId);
      socket.data.projectId = projectId;
      // Presence is derived server-side from the authenticated user; the client
      // no longer sends a name or avatar, so it cannot appear as someone else.
      if (!projectRooms.has(projectId)) projectRooms.set(projectId, new Map());
      projectRooms.get(projectId).set(socket.id, socket.data.presence);
      broadcastOnlineUsers(projectId);
    } catch (err) {
      console.error('[socket] join-project failed:', err.message);
    }
  });

  socket.on('leave-project', ({ projectId }) => {
    socket.leave(projectId);
    if (projectRooms.has(projectId)) {
      projectRooms.get(projectId).delete(socket.id);
      if (projectRooms.get(projectId).size === 0) projectRooms.delete(projectId);
      else broadcastOnlineUsers(projectId);
    }
  });

  // Relay task moves to everyone else in the room.
  //
  // Presentation only — every durable write goes through the REST API, which is
  // protected. But the relay is now restricted to the room this socket actually
  // joined (and therefore passed the membership check for), so a client cannot
  // broadcast into an arbitrary project by naming its id.
  socket.on('task-moved', ({ projectId, task, movedBy }) => {
    if (projectId !== socket.data.projectId) return;
    socket.to(projectId).emit('task-moved', { task, movedBy });
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    const { projectId } = socket.data || {};
    if (projectId && projectRooms.has(projectId)) {
      projectRooms.get(projectId).delete(socket.id);
      if (projectRooms.get(projectId).size === 0) projectRooms.delete(projectId);
      else broadcastOnlineUsers(projectId);
    }
  });
});

// Start server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// --- Risk Radar: proactive project health scans ---
const cron = require('node-cron');
const { scanAllActiveProjects } = require('./utils/riskRadar');

// Daily scan at 08:00 server time. Note: on free-tier hosts that sleep when idle,
// the process must be awake for this to fire — the boot catch-up below covers gaps.
cron.schedule('0 8 * * *', () => {
  scanAllActiveProjects(io, 'scheduled').catch((err) =>
    console.error('Risk radar scheduled scan failed:', err)
  );
});

// Catch-up scan shortly after boot; skips projects with a report fresher than ~20h
// so nodemon restarts and redeploys don't spam new reports.
setTimeout(() => {
  scanAllActiveProjects(io, 'boot').catch((err) =>
    console.error('Risk radar boot scan failed:', err)
  );
}, 15000);
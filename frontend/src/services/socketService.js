import { io } from 'socket.io-client';

// The server authenticates the handshake (io.use in backend/server.js), so a
// connection without a valid access token is refused.
//
// `auth` is a FUNCTION, not an object, on purpose: socket.io-client calls it
// before every connection attempt, so the token is read fresh each time. An
// object literal would capture whatever was in localStorage at module import —
// which is before login on a cold load, and stale after a token refresh, so
// every reconnect would fail with the old value.
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
  reconnection: true,
  reconnectionDelay: 1000,
  auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
});

// A rejected handshake is expected, not exceptional: it happens on every page
// load before login, and whenever an access token expires mid-session. The
// axios interceptor refreshes the token on the next HTTP call; reconnect() then
// re-runs `auth` above and picks up the new one.
socket.on('connect_error', (err) => {
  if (err.message === 'unauthorized') return; // quiet — the retry will carry a fresh token
  console.warn('[socket] connection error:', err.message);
});

// Call after login/refresh so realtime attaches without a page reload.
export const reconnectSocket = () => {
  socket.disconnect();
  socket.connect();
};

export default socket;

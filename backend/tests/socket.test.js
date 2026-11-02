// Socket.IO authentication and room authorization.
//
// This closes CLAUDE.md known-gap #1. Unlike the HTTP suites these need a real
// listening server, because the handshake is a transport-level event that
// supertest cannot drive.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startDb, clearDb, stopDb } = require('./harness');
const { makeUser, makeWorkspace, makeProject } = require('./helpers');
const { httpServer } = require('../server');
const ioClient = require('socket.io-client');

let url;

before(async () => {
  await startDb();
  // Port 0 = let the OS pick a free one, so the suite never collides with a dev
  // server already on 5001.
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${httpServer.address().port}`;
});
beforeEach(clearDb);
after(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  await stopDb();
});

// Attempt a handshake; resolve 'connected' or 'refused: <reason>'.
const handshake = (auth) =>
  new Promise((resolve) => {
    const s = ioClient(url, { auth, reconnection: false, timeout: 5000, transports: ['websocket'] });
    const done = (r) => { s.close(); resolve(r); };
    s.on('connect', () => done('connected'));
    s.on('connect_error', (e) => done('refused: ' + e.message));
    setTimeout(() => done('timeout'), 6000);
  });

// Connect, try to join a room, and report whether presence arrived.
const tryJoin = (token, projectId) =>
  new Promise((resolve) => {
    const s = ioClient(url, { auth: { token }, reconnection: false, timeout: 5000, transports: ['websocket'] });
    let connected = false, presence = false;
    const done = (r) => { s.close(); resolve(r); };
    s.on('connect', () => { connected = true; s.emit('join-project', { projectId }); });
    s.on('online-users', () => { presence = true; });
    s.on('connect_error', (e) => done('refused: ' + e.message));
    setTimeout(() => done(!connected ? 'never-connected' : presence ? 'joined' : 'join-refused'), 2500);
  });

describe('handshake authentication', () => {
  test('refuses a connection with no token', async () => {
    assert.equal(await handshake({}), 'refused: unauthorized');
  });

  test('refuses a malformed token', async () => {
    assert.equal(await handshake({ token: 'not-a-jwt' }), 'refused: unauthorized');
  });

  test('refuses a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'attacker-secret', { expiresIn: '1h' });
    assert.equal(await handshake({ token: forged }), 'refused: unauthorized');
  });

  test('refuses an expired token', async () => {
    const stale = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '-60s' });
    assert.equal(await handshake({ token: stale }), 'refused: unauthorized');
  });

  test('refuses a valid token for a user that no longer exists', async () => {
    const ghost = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    assert.equal(await handshake({ token: ghost }), 'refused: unauthorized');
  });

  test('refuses a token signed with the REFRESH secret', async () => {
    const user = await makeUser();
    const crossed = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1h' });
    assert.equal(await handshake({ token: crossed }), 'refused: unauthorized');
  });

  test('accepts a real access token', async () => {
    const user = await makeUser();
    assert.equal(await handshake({ token: user.token }), 'connected');
  });
});

describe('room authorization', () => {
  test('a workspace member may join the project room', async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace(owner);
    const project = await makeProject(owner, ws._id);
    assert.equal(await tryJoin(owner.token, String(project._id)), 'joined');
  });

  test('an authenticated non-member is refused the room', async () => {
    // The core of gap #1: a valid account naming a real project id. Connecting
    // is allowed (the token is genuine); joining is not.
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace(owner);
    const project = await makeProject(owner, ws._id);
    assert.equal(await tryJoin(outsider.token, String(project._id)), 'join-refused');
  });

  test('a non-existent project id is refused', async () => {
    const user = await makeUser();
    assert.equal(await tryJoin(user.token, '507f1f77bcf86cd799439011'), 'join-refused');
  });
});

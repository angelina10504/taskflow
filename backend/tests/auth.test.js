// Authentication — the failure paths especially. A login route that returns 200
// for a wrong password is the single worst bug this codebase could ship, and no
// amount of prompt evaluation would detect it.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, clearDb, stopDb } = require('./harness');
const { app, request, makeUser } = require('./helpers');

before(startDb);
beforeEach(clearDb);
after(stopDb);

describe('POST /api/auth/login', () => {
  test('rejects a wrong password with 401 and issues no token', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'definitely-not-the-password' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(!res.body.accessToken, 'a failed login must not return an access token');
  });

  test('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.dev', password: 'Passw0rd!23' });
    assert.equal(res.status, 401);
    assert.ok(!res.body.accessToken);
  });

  test('does not reveal whether the email exists', async () => {
    // Identical responses for "wrong password" and "no such user" — otherwise
    // the endpoint is a user-enumeration oracle.
    const user = await makeUser();
    const wrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password-here' });
    const noUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.dev', password: 'wrong-password-here' });

    assert.equal(wrongPass.status, noUser.status);
    assert.equal(wrongPass.body.message, noUser.body.message);
  });

  test('accepts correct credentials and returns a usable token', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken, 'successful login must return an access token');

    // The token must actually work, not merely exist.
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    assert.equal(me.status, 200);
  });

  test('never returns the password hash', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    assert.ok(!JSON.stringify(res.body).includes('$2'), 'bcrypt hash leaked in the login response');
    assert.equal(res.body.user?.password, undefined);
  });
});

describe('POST /api/auth/register', () => {
  test('rejects a duplicate email', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Impostor', email: user.email, password: 'Passw0rd!23' });
    assert.ok(res.status >= 400, `expected a 4xx, got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  test('requires email and password', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'No Creds' });
    assert.ok(res.status >= 400);
  });
});

describe('protected routes', () => {
  test('401 with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('401 with a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    assert.equal(res.status, 401);
  });

  test('401 with a token signed by the wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'attacker-secret', { expiresIn: '1h' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    assert.equal(res.status, 401);
  });

  test('401 when the token is valid but the user no longer exists', async () => {
    const jwt = require('jsonwebtoken');
    const ghost = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ghost}`);
    assert.equal(res.status, 401);
  });

  test('401 when an access token is signed with the REFRESH secret', async () => {
    // The two secrets must never be interchangeable — CLAUDE.md's auth contract.
    const jwt = require('jsonwebtoken');
    const user = await makeUser();
    const crossed = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${crossed}`);
    assert.equal(res.status, 401);
  });
});

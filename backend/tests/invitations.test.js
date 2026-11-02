// Invitation redemption — CLAUDE.md known-gap #2.
//
// Before this existed, inviteMember minted a 32-byte token and emailed a link
// that nothing could redeem: no accept route, no frontend page, and
// invitations[] grew forever. The API still reported success, so the failure
// was silent — the inviter believed it had worked.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, clearDb, stopDb, mongoose } = require('./harness');
const { app, request, makeUser, makeWorkspace } = require('./helpers');

before(startDb);
beforeEach(clearDb);
after(stopDb);

// Invite an address that has no account yet -> the token branch.
const inviteNewcomer = async (owner, ws, email, role = 'member') => {
  const res = await owner.as(request(app).post(`/api/workspaces/${ws._id}/invite`)).send({ email, role });
  assert.ok(res.status < 300, `invite failed: ${JSON.stringify(res.body)}`);
  const row = await mongoose.connection.db
    .collection('workspaces')
    .findOne({ _id: new mongoose.Types.ObjectId(String(ws._id)) });
  const invitation = (row.invitations || []).find((i) => i.email === email.toLowerCase());
  assert.ok(invitation, 'no invitation was recorded for a brand-new email');
  return invitation.token;
};

describe('GET /api/workspaces/invitations/:token (public preview)', () => {
  test('describes the invitation without a session', async () => {
    const owner = await makeUser({ name: 'Owner' });
    const ws = await makeWorkspace(owner, 'Design Team');
    const token = await inviteNewcomer(owner, ws, 'newcomer@test.dev', 'viewer');

    const res = await request(app).get(`/api/workspaces/invitations/${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.invitation.workspaceName, 'Design Team');
    assert.equal(res.body.invitation.role, 'viewer');
    assert.equal(res.body.invitation.email, 'newcomer@test.dev');
  });

  test('leaks nothing beyond the invitation itself', async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace(owner);
    const token = await inviteNewcomer(owner, ws, 'newcomer@test.dev');

    const res = await request(app).get(`/api/workspaces/invitations/${token}`);
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('members'), 'member list exposed to an unauthenticated caller');
    assert.ok(!body.includes(String(ws._id)), 'workspace id exposed before acceptance');
    assert.ok(!body.includes(owner.email), 'owner email exposed');
  });

  test('404 for an unknown token', async () => {
    const res = await request(app).get('/api/workspaces/invitations/not-a-real-token');
    assert.equal(res.status, 404);
  });
});

describe('POST /api/workspaces/invitations/:token/accept', () => {
  test('a matching signed-in user joins with the invited role', async () => {
    const owner = await makeUser({ name: 'Owner' });
    const ws = await makeWorkspace(owner, 'Engineering');
    const email = 'joiner@test.dev';
    const token = await inviteNewcomer(owner, ws, email, 'admin');

    // The recipient registers, then redeems.
    const joiner = await makeUser({ email, password: 'Passw0rd!23' });
    const res = await joiner.as(request(app).post(`/api/workspaces/invitations/${token}/accept`));

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.role, 'admin');

    // Membership actually written, with the right role.
    const row = await mongoose.connection.db
      .collection('workspaces')
      .findOne({ _id: new mongoose.Types.ObjectId(String(ws._id)) });
    const member = row.members.find((m) => String(m.user) === joiner.id);
    assert.ok(member, 'no membership row was created');
    assert.equal(member.role, 'admin');

    // And the workspace is now reachable, which it was not before.
    const get = await joiner.as(request(app).get(`/api/workspaces/${ws._id}`));
    assert.equal(get.status, 200);
  });

  test('the invitation is consumed — the same token cannot be reused', async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace(owner);
    const email = 'once@test.dev';
    const token = await inviteNewcomer(owner, ws, email);
    const joiner = await makeUser({ email });

    await joiner.as(request(app).post(`/api/workspaces/invitations/${token}/accept`));
    const second = await joiner.as(request(app).post(`/api/workspaces/invitations/${token}/accept`));
    assert.equal(second.status, 404, 'a consumed token was accepted a second time');

    const row = await mongoose.connection.db
      .collection('workspaces')
      .findOne({ _id: new mongoose.Types.ObjectId(String(ws._id)) });
    assert.equal(row.invitations.length, 0, 'invitations[] was not reaped');
  });

  test('a different account cannot redeem someone else’s link', async () => {
    // The whole point of the email check: a forwarded or leaked link must not
    // be enough on its own.
    const owner = await makeUser();
    const ws = await makeWorkspace(owner);
    const token = await inviteNewcomer(owner, ws, 'intended@test.dev');

    const interloper = await makeUser({ email: 'someone-else@test.dev' });
    const res = await interloper.as(request(app).post(`/api/workspaces/invitations/${token}/accept`));
    assert.equal(res.status, 403, `expected 403, got ${res.status}`);

    const row = await mongoose.connection.db
      .collection('workspaces')
      .findOne({ _id: new mongoose.Types.ObjectId(String(ws._id)) });
    assert.ok(
      !row.members.some((m) => String(m.user) === interloper.id),
      'an interloper was added to the workspace'
    );
    assert.equal(row.invitations.length, 1, 'a refused attempt must not consume the invitation');
  });

  test('requires authentication', async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace(owner);
    const token = await inviteNewcomer(owner, ws, 'anon@test.dev');
    const res = await request(app).post(`/api/workspaces/invitations/${token}/accept`);
    assert.equal(res.status, 401);
  });

  test('an expired invitation is refused and reaped', async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace(owner);
    const email = 'late@test.dev';
    const token = await inviteNewcomer(owner, ws, email);

    // Backdate it past its expiry.
    await mongoose.connection.db.collection('workspaces').updateOne(
      { _id: new mongoose.Types.ObjectId(String(ws._id)), 'invitations.token': token },
      { $set: { 'invitations.$.expiresAt': new Date(Date.now() - 1000) } }
    );

    const joiner = await makeUser({ email });
    const res = await joiner.as(request(app).post(`/api/workspaces/invitations/${token}/accept`));
    assert.equal(res.status, 410, `expected 410 Gone, got ${res.status}`);

    const row = await mongoose.connection.db
      .collection('workspaces')
      .findOne({ _id: new mongoose.Types.ObjectId(String(ws._id)) });
    assert.equal(row.invitations.length, 0, 'an expired invitation was left to accumulate');
    assert.ok(!row.members.some((m) => String(m.user) === joiner.id));
  });

  test('404 for an unknown token', async () => {
    const user = await makeUser();
    const res = await user.as(request(app).post('/api/workspaces/invitations/bogus/accept'));
    assert.equal(res.status, 404);
  });
});

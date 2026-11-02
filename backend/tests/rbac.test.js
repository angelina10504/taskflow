// Role restrictions. CLAUDE.md invariant 6: "RBAC gates sit after the
// membership check, not instead of it."
//   viewer      -> read-only; 403 on any mutation
//   member      -> may only assign tasks to themselves
//   admin/owner -> may assign anyone
//   an owner cannot be removed from their own workspace
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, clearDb, stopDb } = require('./harness');
const { app, request, makeUser, makeWorkspace, makeProject, makeTask, addMember } = require('./helpers');

before(startDb);
beforeEach(clearDb);
after(stopDb);

// Owner + one collaborator at the given role, with a project and task ready.
const withRole = async (role) => {
  const owner = await makeUser({ name: 'Owner' });
  const actor = await makeUser({ name: `A ${role}` });
  const ws = await makeWorkspace(owner);
  await addMember(owner, ws._id, actor.email, role);
  const project = await makeProject(owner, ws._id);
  const task = await makeTask(owner, project._id, ws._id, 'Original title');
  return { owner, actor, ws, project, task };
};

describe('viewer is read-only', () => {
  test('a viewer CAN read a task', async () => {
    const { actor, task } = await withRole('viewer');
    const res = await actor.as(request(app).get(`/api/tasks/${task._id}`));
    assert.equal(res.status, 200, 'a viewer must still be able to read');
  });

  test('a viewer cannot create a task', async () => {
    const { actor, ws, project } = await withRole('viewer');
    const res = await actor
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Viewer wrote this', project: project._id, workspace: ws._id });
    assert.equal(res.status, 403, `expected 403, got ${res.status}`);
  });

  test('a viewer cannot update a task', async () => {
    const { actor, task } = await withRole('viewer');
    const res = await actor.as(request(app).put(`/api/tasks/${task._id}`)).send({ title: 'changed' });
    assert.equal(res.status, 403, `expected 403, got ${res.status}`);

    const { mongoose } = require('./harness');
    const after = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.equal(after.title, 'Original title', 'a viewer mutated a task');
  });

  test('a viewer cannot delete a task', async () => {
    const { actor, task } = await withRole('viewer');
    const res = await actor.as(request(app).delete(`/api/tasks/${task._id}`));
    assert.equal(res.status, 403, `expected 403, got ${res.status}`);
  });
});

describe('member may only self-assign', () => {
  test('a member can assign a task to themselves', async () => {
    const { actor, ws, project } = await withRole('member');
    const res = await actor
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Mine', project: project._id, workspace: ws._id, assignedTo: [actor.id] });
    assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    const ids = (res.body.task.assignedTo || []).map((u) => String(u._id || u));
    assert.ok(ids.includes(actor.id), 'self-assignment was dropped');
  });

  test('a member cannot assign a task to someone else', async () => {
    const { owner, actor, ws, project } = await withRole('member');
    const res = await actor
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Yours', project: project._id, workspace: ws._id, assignedTo: [owner.id] });

    // Either refused outright, or accepted with the foreign assignee stripped —
    // what must never happen is a member assigning work to another user.
    if (res.status === 201) {
      const ids = (res.body.task.assignedTo || []).map((u) => String(u._id || u));
      assert.ok(!ids.includes(owner.id), 'a member assigned a task to another user');
    } else {
      assert.ok(res.status >= 400);
    }
  });
});

describe('admin and owner may assign anyone', () => {
  test('an admin can assign a task to another member', async () => {
    const { owner, actor, ws, project } = await withRole('admin');
    const res = await actor
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Delegated', project: project._id, workspace: ws._id, assignedTo: [owner.id] });
    assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    const ids = (res.body.task.assignedTo || []).map((u) => String(u._id || u));
    assert.ok(ids.includes(owner.id), 'an admin should be able to assign others');
  });
});

describe('workspace membership management', () => {
  test('an owner cannot be removed from their own workspace', async () => {
    const { owner, ws } = await withRole('admin');
    const res = await owner.as(request(app).delete(`/api/workspaces/${ws._id}/members/${owner.id}`));
    assert.ok(res.status >= 400, `expected a 4xx, got ${res.status}`);
  });

  test('a plain member cannot remove another member', async () => {
    const owner = await makeUser({ name: 'Owner' });
    const member = await makeUser({ name: 'Member' });
    const victim = await makeUser({ name: 'Victim' });
    const ws = await makeWorkspace(owner);
    await addMember(owner, ws._id, member.email, 'member');
    await addMember(owner, ws._id, victim.email, 'member');

    const res = await member.as(request(app).delete(`/api/workspaces/${ws._id}/members/${victim.id}`));
    assert.ok(res.status >= 400, `a member removed another member (status ${res.status})`);
  });

  test('a non-member cannot invite themselves in', async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace(owner);
    const res = await outsider
      .as(request(app).post(`/api/workspaces/${ws._id}/invite`))
      .send({ email: outsider.email, role: 'admin' });
    assert.ok(res.status >= 400, `an outsider invited themselves (status ${res.status})`);
  });
});

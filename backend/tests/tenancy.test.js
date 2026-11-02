// Workspace isolation — the invariant CLAUDE.md opens with: "Every query that
// touches user content is scoped by tenant. No exceptions. A client-supplied
// projectId, taskId, or workspaceId is an untrusted claim of access, never
// proof of it."
//
// Every test here is an outsider holding a VALID token for a real account,
// naming a real id belonging to someone else. That is the exact shape of a
// cross-tenant leak, and the only thing standing between it and the data is the
// resolve -> verify -> query pattern.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, clearDb, stopDb } = require('./harness');
const { app, request, makeUser, makeWorkspace, makeProject, makeTask } = require('./helpers');

before(startDb);
beforeEach(clearDb);
after(stopDb);

// Two unrelated tenants, each with a workspace, project and task.
const twoTenants = async () => {
  const alice = await makeUser({ name: 'Alice' });
  const mallory = await makeUser({ name: 'Mallory' });
  const ws = await makeWorkspace(alice, "Alice's workspace");
  const project = await makeProject(alice, ws._id);
  const task = await makeTask(alice, project._id, ws._id, "Alice's secret task");
  return { alice, mallory, ws, project, task };
};

describe('workspace isolation', () => {
  test("an outsider cannot read another tenant's workspace", async () => {
    const { mallory, ws } = await twoTenants();
    const res = await mallory.as(request(app).get(`/api/workspaces/${ws._id}`));
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
  });

  test('workspace list returns only the caller’s own workspaces', async () => {
    const { mallory } = await twoTenants();
    const res = await mallory.as(request(app).get('/api/workspaces'));
    assert.equal(res.status, 200);
    const list = res.body.workspaces || res.body.data || [];
    assert.equal(list.length, 0, "Mallory must not see Alice's workspace in her list");
  });

  test("an outsider cannot read another tenant's project", async () => {
    const { mallory, project } = await twoTenants();
    const res = await mallory.as(request(app).get(`/api/projects/${project._id}`));
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
  });

  test("an outsider cannot list tasks in another tenant's project", async () => {
    const { mallory, project } = await twoTenants();
    const res = await mallory.as(request(app).get(`/api/tasks?project=${project._id}`));
    // Either refused, or an empty list — what must never happen is Alice's task
    // appearing in Mallory's response body.
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes("Alice's secret task"), `leaked task content: ${body.slice(0, 200)}`);
  });

  test("an outsider cannot read a single task by id", async () => {
    const { mallory, task } = await twoTenants();
    const res = await mallory.as(request(app).get(`/api/tasks/${task._id}`));
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
    assert.ok(!JSON.stringify(res.body).includes("Alice's secret task"));
  });

  test("an outsider cannot UPDATE another tenant's task", async () => {
    const { mallory, task } = await twoTenants();
    const res = await mallory.as(request(app).put(`/api/tasks/${task._id}`)).send({ title: 'pwned' });
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);

    // And the write must not have landed.
    const { mongoose } = require('./harness');
    const after = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.equal(after.title, "Alice's secret task", 'task was mutated by a non-member');
  });

  test("an outsider cannot DELETE another tenant's task", async () => {
    const { mallory, task } = await twoTenants();
    const res = await mallory.as(request(app).delete(`/api/tasks/${task._id}`));
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);

    const { mongoose } = require('./harness');
    const still = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.ok(still, 'task was deleted by a non-member');
  });

  test("an outsider cannot create a project inside another tenant's workspace", async () => {
    const { mallory, ws } = await twoTenants();
    const res = await mallory
      .as(request(app).post('/api/projects'))
      .send({ name: 'Injected', workspace: ws._id });
    assert.ok(res.status >= 400, `expected a 4xx, got ${res.status}`);
  });

  test("an outsider cannot create a task inside another tenant's project", async () => {
    const { mallory, ws, project } = await twoTenants();
    const res = await mallory
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Injected', project: project._id, workspace: ws._id });
    assert.ok(res.status >= 400, `expected a 4xx, got ${res.status}`);
  });

  test('global AI search never crosses the tenant boundary', async () => {
    // Invariant 3: multi-tenant list endpoints scope by membership set. With no
    // API key the AI layer degrades, but the RETRIEVAL scope is computed in code
    // and must still exclude other tenants.
    const { mallory } = await twoTenants();
    const res = await mallory.as(request(app).get('/api/ai/search?q=secret'));
    assert.ok(!JSON.stringify(res.body).includes("Alice's secret task"), 'global search leaked across tenants');
  });
});

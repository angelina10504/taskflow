// Task CRUD — the happy paths plus the validation and invariant checks that
// keep a task consistent.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, clearDb, stopDb, mongoose } = require('./harness');
const { app, request, makeUser, makeWorkspace, makeProject, makeTask } = require('./helpers');

before(startDb);
beforeEach(clearDb);
after(stopDb);

const board = async () => {
  const user = await makeUser();
  const ws = await makeWorkspace(user);
  const project = await makeProject(user, ws._id);
  return { user, ws, project };
};

describe('create', () => {
  test('creates a task with defaults', async () => {
    const { user, ws, project } = await board();
    const res = await user
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Write the tests', project: project._id, workspace: ws._id });

    assert.equal(res.status, 201);
    assert.equal(res.body.task.title, 'Write the tests');
    assert.equal(res.body.task.status, 'todo', 'new tasks start in todo');
    assert.equal(res.body.task.priority, 'medium', 'default priority');
  });

  test('requires a title', async () => {
    const { user, ws, project } = await board();
    const res = await user
      .as(request(app).post('/api/tasks'))
      .send({ project: project._id, workspace: ws._id });
    assert.ok(res.status >= 400);
  });

  test('denormalizes workspace onto the task', async () => {
    // CLAUDE.md: Task carries `workspace` alongside `project` so tenant-scoped
    // queries never need a join. If it is ever missing, every cross-workspace
    // query silently loses that task.
    const { user, ws, project } = await board();
    const task = await makeTask(user, project._id, ws._id);
    const row = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.ok(row.workspace, 'task is missing its denormalized workspace');
    assert.equal(String(row.workspace), String(ws._id));
  });

  test('rejects an out-of-enum status', async () => {
    const { user, ws, project } = await board();
    const res = await user
      .as(request(app).post('/api/tasks'))
      .send({ title: 'Bad status', project: project._id, workspace: ws._id, status: 'banana' });
    if (res.status === 201) {
      assert.notEqual(res.body.task.status, 'banana', 'an invalid status reached the database');
    } else {
      assert.ok(res.status >= 400);
    }
  });
});

describe('read', () => {
  test('lists tasks for a project', async () => {
    const { user, ws, project } = await board();
    await makeTask(user, project._id, ws._id, 'One');
    await makeTask(user, project._id, ws._id, 'Two');

    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}`));
    assert.equal(res.status, 200);
    const list = res.body.tasks || res.body.data || [];
    assert.equal(list.length, 2);
  });

  test('reads a single task', async () => {
    const { user, ws, project } = await board();
    const task = await makeTask(user, project._id, ws._id, 'Readable');
    const res = await user.as(request(app).get(`/api/tasks/${task._id}`));
    assert.equal(res.status, 200);
    assert.equal((res.body.task || res.body.data).title, 'Readable');
  });

  test('404 for a well-formed id that does not exist', async () => {
    const { user } = await board();
    const res = await user.as(request(app).get('/api/tasks/507f1f77bcf86cd799439011'));
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
  });
});

describe('update', () => {
  test('updates the title', async () => {
    const { user, ws, project } = await board();
    const task = await makeTask(user, project._id, ws._id, 'Before');
    const res = await user.as(request(app).put(`/api/tasks/${task._id}`)).send({ title: 'After' });
    assert.equal(res.status, 200);
    assert.equal((res.body.task || res.body.data).title, 'After');
  });

  test('moving a task to done stamps completedAt', async () => {
    // models/Task.js has a pre-save hook for this; a status change that leaves
    // completedAt unset would silently break every velocity metric.
    const { user, ws, project } = await board();
    const task = await makeTask(user, project._id, ws._id);
    const res = await user.as(request(app).put(`/api/tasks/${task._id}`)).send({ status: 'done' });
    assert.equal(res.status, 200);

    const row = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.equal(row.status, 'done');
    assert.ok(row.completedAt, 'completedAt was not stamped when the task was completed');
  });

  test('moving back out of done clears completedAt', async () => {
    const { user, ws, project } = await board();
    const task = await makeTask(user, project._id, ws._id);
    await user.as(request(app).put(`/api/tasks/${task._id}`)).send({ status: 'done' });
    await user.as(request(app).put(`/api/tasks/${task._id}`)).send({ status: 'in_progress' });

    const row = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.ok(!row.completedAt, 'completedAt survived a move out of done');
  });
});

describe('delete', () => {
  test('deletes a task', async () => {
    const { user, ws, project } = await board();
    const task = await makeTask(user, project._id, ws._id);
    const res = await user.as(request(app).delete(`/api/tasks/${task._id}`));
    assert.ok([200, 204].includes(res.status), `expected 200/204, got ${res.status}`);

    const row = await mongoose.connection.db
      .collection('tasks')
      .findOne({ _id: new mongoose.Types.ObjectId(String(task._id)) });
    assert.equal(row, null, 'task still present after delete');
  });
});

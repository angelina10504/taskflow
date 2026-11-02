// Pagination on the task list, plus a measurement of what the query actually
// does against representative data.
//
// The endpoint was unbounded: every task in the project on every request. The
// change is opt-in — the Kanban board still needs all tasks to render its
// columns, so paginating by default would silently drop cards.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, clearDb, stopDb, mongoose } = require('./harness');
const { app, request, makeUser, makeWorkspace, makeProject } = require('./helpers');

before(startDb);
beforeEach(clearDb);
after(stopDb);

// Insert N tasks directly. Going through the API would be 150 round trips and
// this fixture is about read performance, not the create path.
const seedTasks = async (projectId, workspaceId, userId, n) => {
  const statuses = mongoose.model('Task').schema.path('status').enumValues;
  const rows = Array.from({ length: n }, (_, i) => ({
    title: `Task ${String(i).padStart(4, '0')}`,
    project: new mongoose.Types.ObjectId(String(projectId)),
    workspace: new mongoose.Types.ObjectId(String(workspaceId)),
    status: statuses[i % statuses.length],
    priority: 'medium',
    position: i,
    createdBy: new mongoose.Types.ObjectId(String(userId)),
    assignedTo: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await mongoose.connection.db.collection('tasks').insertMany(rows);
};

const board = async (n = 0) => {
  const user = await makeUser();
  const ws = await makeWorkspace(user);
  const project = await makeProject(user, ws._id);
  if (n) await seedTasks(project._id, ws._id, user.id, n);
  return { user, ws, project };
};

describe('backward compatibility', () => {
  test('with no pagination params it still returns every task', async () => {
    // The Kanban board depends on this. If it ever starts truncating, cards
    // vanish from whichever column sorts last.
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}`));
    assert.equal(res.status, 200);
    assert.equal(res.body.tasks.length, 150);
    assert.equal(res.body.pagination, undefined, 'unpaginated responses must not grow a pagination block');
  });
});

describe('opt-in pagination', () => {
  test('?limit caps the page and reports totals', async () => {
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&limit=20`));
    assert.equal(res.status, 200);
    assert.equal(res.body.tasks.length, 20);
    assert.equal(res.body.pagination.total, 150);
    assert.equal(res.body.pagination.pages, 8);
    assert.equal(res.body.pagination.hasMore, true);
  });

  test('?page walks without overlap or gaps', async () => {
    const { user, project } = await board(150);
    const seen = new Set();
    for (let p = 1; p <= 8; p += 1) {
      const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&limit=20&page=${p}`));
      res.body.tasks.forEach((t) => seen.add(String(t._id)));
    }
    assert.equal(seen.size, 150, 'paging produced duplicates or dropped rows');
  });

  test('the last page reports hasMore false', async () => {
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&limit=20&page=8`));
    assert.equal(res.body.tasks.length, 10);
    assert.equal(res.body.pagination.hasMore, false);
  });

  test('limit is capped at 200 however large the request', async () => {
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&limit=10000`));
    assert.ok(res.body.pagination.limit <= 200, `limit was not capped: ${res.body.pagination.limit}`);
  });

  test('garbage page/limit values fall back to sane defaults', async () => {
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&page=-5&limit=abc`));
    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.page, 1);
    assert.ok(res.body.pagination.limit >= 1);
  });

  test('status filter narrows the page and the total', async () => {
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&limit=10&status=todo`));
    assert.equal(res.status, 200);
    assert.ok(res.body.tasks.every((t) => t.status === 'todo'));
    // 150 tasks round-robin across 4 statuses.
    assert.ok(res.body.pagination.total < 150, 'total should reflect the filter, not the whole project');
  });

  test('an unknown status is ignored rather than returning an empty page', async () => {
    const { user, project } = await board(150);
    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}&limit=10&status=banana`));
    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.total, 150);
  });

  test('pagination does not bypass the tenant check', async () => {
    const { project } = await board(10);
    const outsider = await makeUser();
    const res = await outsider.as(request(app).get(`/api/tasks?project=${project._id}&limit=5`));
    assert.ok(res.status >= 400, `pagination leaked across tenants (status ${res.status})`);
  });
});

describe('query plan on representative data', () => {
  test('a paginated page is index-backed, not a collection scan', async () => {
    const { project } = await board(500);

    const explain = await mongoose.connection.db
      .collection('tasks')
      .find({ project: new mongoose.Types.ObjectId(String(project._id)) })
      .sort({ position: 1 })
      .limit(50)
      .explain('executionStats');

    const stats = explain.executionStats;
    const plan = JSON.stringify(explain.queryPlanner.winningPlan);

    console.log(
      `[plan] returned=${stats.nReturned} docsExamined=${stats.totalDocsExamined} ` +
        `keysExamined=${stats.totalKeysExamined} collection=500`
    );

    // The index is {project, status, position} — it serves this filter+sort, so
    // the page must not read the whole collection to return 50 rows.
    assert.ok(!plan.includes('"stage":"COLLSCAN"'), `query fell back to a collection scan: ${plan.slice(0, 200)}`);
    assert.equal(stats.nReturned, 50);
    assert.ok(
      stats.totalDocsExamined <= 50,
      `examined ${stats.totalDocsExamined} documents to return 50 — the sort is not using the index`
    );
  });

  test('an unpaginated board read is bounded by project, not collection size', async () => {
    // Two projects, so a project-scoped read must not see the other's rows.
    const { user, ws, project } = await board(300);
    const other = await makeProject(user, ws._id, 'Other project');
    await seedTasks(other._id, ws._id, user.id, 300);

    const res = await user.as(request(app).get(`/api/tasks?project=${project._id}`));
    assert.equal(res.body.tasks.length, 300, 'project scoping leaked or truncated');
  });
});

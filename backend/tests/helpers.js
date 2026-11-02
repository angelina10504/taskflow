// Fixture builders, written against the API's real contract:
//   register  -> 201 { success, user: { id }, accessToken }
//   workspace -> 201 { success, workspace: { _id } }
//   project   -> 201 { success, project: { _id } }
//   task      -> requires title + project + workspace
//
// Users are created through the real /api/auth/register route rather than
// User.create(), so the password hashing hook, the unique-email index and token
// issuing all participate. A fixture that bypassed the route under test would
// make the auth suite assert against itself.
const request = require('supertest');
const { app } = require('../server');

let seq = 0;
const uniq = () => `${Date.now().toString(36)}-${++seq}`;

const makeUser = async (overrides = {}) => {
  const body = {
    name: overrides.name || `User ${uniq()}`,
    email: overrides.email || `u-${uniq()}@test.dev`,
    password: overrides.password || 'Passw0rd!23',
  };
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register ${res.status}: ${JSON.stringify(res.body)}`);
  const token = res.body.accessToken;
  return {
    token,
    id: String(res.body.user.id),
    email: body.email,
    password: body.password,
    name: body.name,
    // Convenience: as(request(app).get('/x')) attaches this user's bearer token.
    as: (req) => req.set('Authorization', `Bearer ${token}`),
  };
};

const makeWorkspace = async (user, name = `WS ${uniq()}`) => {
  const res = await user.as(request(app).post('/api/workspaces')).send({ name });
  if (res.status !== 201) throw new Error(`workspace ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.workspace;
};

const makeProject = async (user, workspaceId, name = `Proj ${uniq()}`) => {
  const res = await user
    .as(request(app).post('/api/projects'))
    .send({ name, workspace: workspaceId });
  if (res.status !== 201) throw new Error(`project ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.project;
};

const makeTask = async (user, projectId, workspaceId, title = `Task ${uniq()}`) => {
  const res = await user
    .as(request(app).post('/api/tasks'))
    .send({ title, project: projectId, workspace: workspaceId });
  if (res.status !== 201) throw new Error(`task ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.task;
};

// Add an EXISTING user to a workspace via the real invite route (the
// existing-user branch, which writes straight into members[]).
const addMember = async (owner, workspaceId, email, role = 'member') => {
  const res = await owner
    .as(request(app).post(`/api/workspaces/${workspaceId}/invite`))
    .send({ email, role });
  if (res.status >= 300) throw new Error(`invite ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
};

module.exports = { app, request, makeUser, makeWorkspace, makeProject, makeTask, addMember };

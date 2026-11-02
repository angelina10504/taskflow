// Shared test harness.
//
// Runner: Node's built-in `node --test`, not Jest.
//
// Jest was tried first and abandoned for a concrete reason: inside its module
// sandbox the mongodb driver fails to assemble its handshake metadata, and every
// connection is rejected by the server with "Missing required sub-document
// 'driver' in the client metadata document". Reproduced against both
// mongodb-memory-server and a plain local mongod, while the identical connection
// succeeds under plain `node` — so it is the sandbox, not the database. The
// alternative was pinning mongoose down a major version to suit the test runner,
// which is the wrong way round: production dependencies should not bend to the
// harness.
const path = require('path');

// Test environment. Set before server.js is required, because dotenv does NOT
// override already-set variables — so these win and the real .env (production
// Mongo, the live Groq key, the real SMTP password) is never loaded.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRE = '15m';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.CLIENT_URL = 'http://localhost:3000';
// Empty key => getClient() returns null => AI features serve deterministic
// fallbacks. These tests are about auth and business logic and must never
// spend a token or depend on a model's mood.
process.env.AI_API_KEY = '';
// Placeholders => isMailConfigured() false => sendMail is a logged no-op.
process.env.SMTP_HOST = 'your_smtp_host_here';
process.env.SMTP_USER = 'your_smtp_user_here';
process.env.SMTP_PASS = 'your_smtp_pass_here';
// Use the Homebrew mongod rather than downloading ~100MB on a cold cache.
process.env.MONGOMS_SYSTEM_BINARY =
  process.env.MONGOMS_SYSTEM_BINARY || '/opt/homebrew/bin/mongod';

// Silence the app's boot chatter.
//
// server.js logs a dozen lines on require (env loaded, routes loaded, mailer
// status...). Beyond being noise, `node --test` serialises results over stdout,
// and enough interleaved output corrupts that stream — it surfaces as
// "Unable to deserialize cloned data", a runner error that looks like a test
// failure but is not. console.error is left alone so real problems still show.
if (!process.env.TEST_VERBOSE) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo = null;

// Never the real cluster: these tests create and delete users, workspaces and
// tasks freely, and a URI pointing at Atlas would do that to real data.
const startDb = async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
};

// Truncate rather than drop: dropping a collection drops its indexes too, and
// the unique index on User.email is load-bearing for the duplicate-registration
// test.
const clearDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

const stopDb = async () => {
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
};

module.exports = { startDb, clearDb, stopDb, mongoose };

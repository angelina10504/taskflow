#!/usr/bin/env node
// One-time backfill: embed every task that has no vector yet (or was embedded
// with a different model). New/edited tasks stay in sync automatically via the
// Task model hooks — run this once after adopting semantic search.
//
//   cd backend && npm run embed:backfill

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Task = require('../models/Task');
const { embedText, EMBEDDING_MODEL } = require('../utils/embeddings');
const { ensureVectorIndex } = require('../utils/taskSearch');

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected; ensuring vector index…');
  await ensureVectorIndex();

  const filter = {
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }, { embeddingModel: { $ne: EMBEDDING_MODEL } }],
  };
  const total = await Task.countDocuments(filter);
  console.log(`${total} task(s) need embeddings (model: ${EMBEDDING_MODEL})`);

  let done = 0;
  let failed = 0;
  const cursor = Task.find(filter).select('title description').lean().cursor();
  for await (const t of cursor) {
    try {
      const vector = await embedText([t.title, t.description].filter(Boolean).join('\n'));
      if (vector) {
        await Task.updateOne(
          { _id: t._id },
          { $set: { embedding: vector, embeddingModel: EMBEDDING_MODEL, embeddedAt: new Date() } }
        );
        done++;
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t._id}: ${err.message}`);
    }
    if (done % 25 === 0 && done > 0) console.log(`  …${done}/${total}`);
  }

  console.log(`backfill complete: ${done} embedded, ${failed} failed`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Backfill crashed:', err);
  process.exit(1);
});

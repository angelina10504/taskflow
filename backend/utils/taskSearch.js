// Semantic task retrieval (the R in RAG).
//
// Write path: ensureTaskEmbedding() runs fire-and-forget from Task model hooks
// whenever a task's text changes — it never blocks or fails a request (same
// contract as the mailer).
//
// Read path: searchTasks() embeds the query and tries Atlas $vectorSearch
// first (ANN index, scales to millions); if the index is unavailable (local
// MongoDB, index still building) it falls back to exact in-memory cosine over
// the project's tasks, which is perfectly fast at workspace scale. Callers
// never need to know which path served them.

const mongoose = require('mongoose');
const { embedText, cosine, EMBEDDING_MODEL, EMBEDDING_DIMS } = require('./embeddings');

const VECTOR_INDEX = 'task_embedding_index';

// After a $vectorSearch failure, skip straight to the fallback for a while
// instead of paying a failed round-trip on every search.
let vectorSearchBrokenUntil = 0;

const taskText = (task) => [task.title, task.description].filter(Boolean).join('\n');

// Fire-and-forget: embed a task's text and store the vector on the document.
// Uses updateOne so it bypasses the model hooks that call it (no loops).
const ensureTaskEmbedding = (task) => {
  Promise.resolve()
    .then(async () => {
      const vector = await embedText(taskText(task));
      if (!vector) return;
      await mongoose
        .model('Task')
        .updateOne(
          { _id: task._id },
          { $set: { embedding: vector, embeddingModel: EMBEDDING_MODEL, embeddedAt: new Date() } }
        );
    })
    .catch((err) => console.error(`[search] embedding failed for task ${task._id}:`, err.message));
};

// Best-effort, idempotent: create the Atlas Vector Search index in code so
// nobody has to click around the Atlas console. On non-Atlas MongoDB the
// command doesn't exist — that's fine, search falls back to in-memory cosine.
const ensureVectorIndex = async () => {
  try {
    const coll = mongoose.model('Task').collection;
    const existing = await coll.listSearchIndexes(VECTOR_INDEX).toArray();
    if (existing.length) return true;
    await coll.createSearchIndex({
      name: VECTOR_INDEX,
      type: 'vectorSearch',
      definition: {
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: EMBEDDING_DIMS, similarity: 'cosine' },
          { type: 'filter', path: 'project' },
          { type: 'filter', path: 'workspace' },
        ],
      },
    });
    console.log(`[search] created Atlas vector index "${VECTOR_INDEX}" (builds in ~1 min)`);
    return true;
  } catch (err) {
    console.log(`[search] no Atlas vector index (${err.codeName || err.message.split('\n')[0]}) — using in-memory fallback`);
    return false;
  }
};

const vectorQuery = async ({ scope, queryVector, k }) => {
  const rows = await mongoose.model('Task').aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(100, k * 10),
        limit: k,
        filter: scope,
      },
    },
    // Atlas reports cosine as (1+cos)/2 in [0,1]; convert back to raw cosine
    // so scores mean the same thing on both search paths.
    { $addFields: { score: { $subtract: [{ $multiply: [{ $meta: 'vectorSearchScore' }, 2] }, 1] } } },
    { $project: { embedding: 0 } },
  ]);
  return rows;
};

const memoryQuery = async ({ scope, queryVector, k }) => {
  const docs = await mongoose
    .model('Task')
    .find({ ...scope, embedding: { $exists: true, $not: { $size: 0 } } })
    .select('+embedding')
    .limit(2000)
    .lean();
  return docs
    .filter((d) => Array.isArray(d.embedding) && d.embedding.length === queryVector.length)
    .map(({ embedding, ...rest }) => ({ ...rest, score: cosine(queryVector, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
};

// Top-k semantically similar tasks within a project (or a whole workspace).
// Returns { results, method } where every result carries a cosine `score`.
const searchTasks = async ({ projectId, workspaceId, query, k = 8 }) => {
  const queryVector = await embedText(query);
  if (!queryVector) return { results: [], method: 'none' };

  const scope = projectId
    ? { project: new mongoose.Types.ObjectId(String(projectId)) }
    : { workspace: new mongoose.Types.ObjectId(String(workspaceId)) };

  if (Date.now() > vectorSearchBrokenUntil) {
    try {
      const results = await vectorQuery({ scope, queryVector, k });
      // An index that exists but is still building returns [] — let the
      // fallback double-check rather than showing an empty board.
      if (results.length) return { results, method: 'atlas' };
    } catch (err) {
      vectorSearchBrokenUntil = Date.now() + 10 * 60 * 1000;
      console.warn('[search] $vectorSearch unavailable, using in-memory cosine:', err.message.split('\n')[0]);
    }
  }
  return { results: await memoryQuery({ scope, queryVector, k }), method: 'memory' };
};

// Duplicate/related-task detection for the create flow. MiniLM cosine on task
// text: ≥0.8 is a near-duplicate, 0.6-0.8 is closely related.
const findSimilar = async ({ projectId, text, k = 3, minScore = 0.6 }) => {
  const { results } = await searchTasks({ projectId, query: text, k: k + 5 });
  return results.filter((r) => r.score >= minScore).slice(0, k);
};

module.exports = { ensureTaskEmbedding, ensureVectorIndex, searchTasks, findSimilar, VECTOR_INDEX };

// Local, in-process text embeddings via Transformers.js (ONNX runtime).
// No API key, no rate limits, no per-token cost — Groq has no embeddings
// endpoint, and task text shouldn't need a third-party service anyway.
//
// The model (all-MiniLM-L6-v2, ~23 MB, 384 dims) downloads to the HF cache on
// first use and lazy-loads so server boot stays fast. Vectors are mean-pooled
// and L2-normalized, so cosine similarity is just the dot product.

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMS = 384;

let pipelinePromise = null;

const getPipeline = () => {
  if (!pipelinePromise) {
    // Dynamic import: @huggingface/transformers is ESM-only, this app is CJS.
    pipelinePromise = import('@huggingface/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'q8' })
    );
    pipelinePromise.catch((err) => {
      console.error('[embeddings] model failed to load:', err.message);
      pipelinePromise = null; // allow a retry on the next call
    });
  }
  return pipelinePromise;
};

// Returns a plain number[] (L2-normalized), or null for empty input.
const embedText = async (text) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!clean) return null;
  const extractor = await getPipeline();
  const out = await extractor(clean, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
};

// Both vectors are L2-normalized, so the dot product IS the cosine similarity.
const cosine = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

module.exports = { embedText, cosine, EMBEDDING_MODEL, EMBEDDING_DIMS };

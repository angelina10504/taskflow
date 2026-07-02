const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Best-effort: create the semantic-search vector index (no-op off Atlas;
    // search falls back to in-memory cosine either way).
    require('../models/Task');
    require('../utils/taskSearch')
      .ensureVectorIndex()
      .catch(() => {});
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
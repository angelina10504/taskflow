const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
    },
    estimatedTime: {
      type: Number, // in minutes
    },
    labels: [
      {
        type: String,
      },
    ],
    position: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
    // Semantic search (RAG): MiniLM vector of title+description, maintained by
    // utils/taskSearch. select:false keeps the 384 floats out of every API
    // response — fetch explicitly with .select('+embedding') when needed.
    embedding: {
      type: [Number],
      select: false,
    },
    embeddingModel: {
      type: String,
      select: false,
    },
    embeddedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
taskSchema.index({ project: 1, status: 1, position: 1 });

// Auto-set completedAt when status changes to done
taskSchema.pre('save', function () {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'done') {
      this.completedAt = undefined;
    }
  }
});

// Keep the semantic-search vector in sync with the task's text. The flag is
// captured pre-save (modified paths are cleared after the write) and the
// embedding runs fire-and-forget post-save so requests are never slowed.
// taskSearch is required lazily to avoid a model↔util require cycle; its
// updateOne write bypasses these hooks, so this cannot loop.
taskSchema.pre('save', function () {
  this.$locals.embedStale = this.isNew || this.isModified('title') || this.isModified('description');
});

taskSchema.post('save', function (doc) {
  if (!doc.$locals.embedStale) return;
  require('../utils/taskSearch').ensureTaskEmbedding(doc);
});

taskSchema.post('findOneAndUpdate', function (doc) {
  if (!doc) return;
  const update = this.getUpdate() || {};
  const set = update.$set || update;
  if (set.title !== undefined || set.description !== undefined) {
    require('../utils/taskSearch').ensureTaskEmbedding(doc);
  }
});

module.exports = mongoose.model('Task', taskSchema);
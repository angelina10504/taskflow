const mongoose = require('mongoose');

// Immutable record of every board mutation an LLM made on a user's behalf.
//
// This is the counterpart to AiCall, and the distinction matters:
//
//   AiCall       — content-free by construction (tokens, latency, model,
//                  outcome). Safe to leave un-scoped because it can never
//                  carry board content. Answers "what did the AI layer cost
//                  and how often did it degrade?"
//
//   AgentAction  — deliberately DOES carry content: which task, what changed,
//                  what the model asked for versus what validation allowed.
//                  Because of that it is tenant-scoped like any other user
//                  data (multi-tenancy invariant 1), and /ops must never join
//                  the two into one un-scoped view.
//
// Why this exists at all: the command endpoint gives the model tools, one of
// which is delete_task. A deletion executed by a model with no record of who
// asked, what it was told, or what it removed is unauditable — the task is
// gone and nothing survives it. `taskTitle` is snapshotted for exactly that
// case: after a delete, this row is the only remaining evidence.
const agentActionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Tenant boundary. Present on every row so audit reads scope like any
    // other collection — never "fetch all, filter after".
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    feature: { type: String, required: true }, // 'command' today; room for future agentic surfaces
    tool: { type: String, required: true }, // create_task | update_task | delete_task
    outcome: { type: String, enum: ['applied', 'refused', 'error'], required: true },

    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    // Snapshotted, not populated: the referenced task may no longer exist.
    taskTitle: { type: String },

    // What the model asked for, after JSON parsing but BEFORE validation.
    requested: { type: mongoose.Schema.Types.Mixed },
    // Field-level diff of what was actually written: { status: { from, to } }.
    changes: { type: mongoose.Schema.Types.Mixed },

    // What validation stripped from `requested` before it reached the DB —
    // a non-member assignee, an out-of-enum status, a task in another project.
    // This is the hallucination signal: a model that keeps proposing assignees
    // who are not in the workspace shows up here as a rate, not an anecdote.
    rejected: [{ type: String }],

    // The natural-language instruction that produced this action, so an
    // audit row can be traced back to what the user actually asked for.
    prompt: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// Audit reads are "what happened in this workspace/project, newest first".
agentActionSchema.index({ workspace: 1, createdAt: -1 });
agentActionSchema.index({ project: 1, createdAt: -1 });
// Failure analysis: "show me everything the model proposed that we refused."
agentActionSchema.index({ workspace: 1, outcome: 1, createdAt: -1 });

// 90 days — longer than AiCall's 30, because an audit trail answering "who
// deleted this?" is worth little if it expires before anyone notices.
agentActionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('AgentAction', agentActionSchema);

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    color: {
      type: String,
      default: '#6366f1', // Default indigo color
    },
    icon: {
      type: String,
      default: '📊',
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
projectSchema.index({ workspace: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
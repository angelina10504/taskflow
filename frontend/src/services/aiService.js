import api from './api';

// Get velocity & estimate intelligence for a project
export const getVelocityInsights = async (projectId) => {
  try {
    const response = await api.get(`/api/ai/projects/${projectId}/velocity`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load velocity insights' };
  }
};

// Execute a natural-language command against a project's board
export const sendCommand = async (projectId, message) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/command`, { message });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Command failed' };
  }
};

// Get the latest Risk Radar health report for a project (report may be null)
export const getHealthReport = async (projectId) => {
  try {
    const response = await api.get(`/api/ai/projects/${projectId}/health`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load health report' };
  }
};

// Create a task from one line of natural language (AI Quick-Add)
export const quickAddTask = async (projectId, text) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/quick-add`, { text });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Quick add failed' };
  }
};

// Extract action items from pasted meeting notes (review-first: no tasks created yet)
export const extractTasksFromNotes = async (projectId, notes) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/extract-tasks`, { notes });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to extract tasks from notes' };
  }
};

// Break a high-level goal into board-ready subtasks (review-first: no tasks created yet)
export const decomposeProject = async (projectId, goal) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/decompose`, { goal });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to draft a plan' };
  }
};

// Bulk-create the approved tasks from the review step
export const bulkCreateTasks = async (projectId, items) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/bulk-create`, { items });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create tasks' };
  }
};

// Run a Risk Radar scan now
export const runHealthScan = async (projectId) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/health/scan`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Health scan failed' };
  }
};

// Semantic search across the project's tasks (matches meaning, not keywords)
export const semanticSearch = async (projectId, q) => {
  try {
    const response = await api.get(`/api/ai/projects/${projectId}/search`, { params: { q } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Search failed' };
  }
};

// Near-duplicate / related tasks for a draft title (used by the create flow)
export const findSimilarTasks = async (projectId, { title, description }) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/similar`, { title, description });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Similarity check failed' };
  }
};

// Ask a question about the board — answers are grounded in retrieved tasks with citations
export const askBoard = async (projectId, question) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/ask`, { question });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Ask failed' };
  }
};

// Semantic search across every board the user belongs to (global ⌘⇧K palette)
export const globalSearch = async (q, limit = 12) => {
  try {
    const response = await api.get('/api/ai/search', { params: { q, limit } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Search failed' };
  }
};

// Today's plan — cached per day server-side; refresh forces a replan
export const getTodayPlan = async (refresh = false) => {
  try {
    const response = await api.get('/api/ai/today', { params: refresh ? { refresh: 1 } : {} });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Could not load today’s plan' };
  }
};

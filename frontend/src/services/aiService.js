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

// Run a Risk Radar scan now
export const runHealthScan = async (projectId) => {
  try {
    const response = await api.post(`/api/ai/projects/${projectId}/health/scan`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Health scan failed' };
  }
};

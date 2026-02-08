import api from './api';

// Get all user's workspaces
export const getWorkspaces = async () => {
  try {
    const response = await api.get('/api/workspaces');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch workspaces' };
  }
};

// Get single workspace
export const getWorkspace = async (id) => {
  try {
    const response = await api.get(`/api/workspaces/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch workspace' };
  }
};

// Create new workspace
export const createWorkspace = async (workspaceData) => {
  try {
    const response = await api.post('/api/workspaces', workspaceData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create workspace' };
  }
};

// Update workspace
export const updateWorkspace = async (id, workspaceData) => {
  try {
    const response = await api.put(`/api/workspaces/${id}`, workspaceData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update workspace' };
  }
};

// Delete workspace
export const deleteWorkspace = async (id) => {
  try {
    const response = await api.delete(`/api/workspaces/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete workspace' };
  }
};

// Leave workspace
export const leaveWorkspace = async (id) => {
  try {
    const response = await api.post(`/api/workspaces/${id}/leave`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to leave workspace' };
  }
};

// Invite member to workspace
export const inviteMember = async (workspaceId, inviteData) => {
  try {
    const response = await api.post(`/api/workspaces/${workspaceId}/invite`, inviteData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to invite member' };
  }
};

// Remove member from workspace
export const removeMember = async (workspaceId, userId) => {
  try {
    const response = await api.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to remove member' };
  }
};
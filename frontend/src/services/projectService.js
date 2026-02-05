import api from './api';

// Get all projects in a workspace
export const getProjects = async (workspaceId) => {
  try {
    const response = await api.get(`/api/projects?workspace=${workspaceId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch projects' };
  }
};

// Get single project
export const getProject = async (id) => {
  try {
    const response = await api.get(`/api/projects/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch project' };
  }
};

// Create new project
export const createProject = async (projectData) => {
  try {
    const response = await api.post('/api/projects', projectData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create project' };
  }
};

// Update project
export const updateProject = async (id, projectData) => {
  try {
    const response = await api.put(`/api/projects/${id}`, projectData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update project' };
  }
};

// Delete project
export const deleteProject = async (id) => {
  try {
    const response = await api.delete(`/api/projects/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete project' };
  }
};

// Archive/unarchive project
export const toggleArchiveProject = async (id) => {
  try {
    const response = await api.patch(`/api/projects/${id}/archive`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to toggle archive' };
  }
};
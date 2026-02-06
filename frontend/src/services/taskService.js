import api from './api';

// Get all tasks in a project
export const getTasks = async (projectId) => {
  try {
    const response = await api.get(`/api/tasks?project=${projectId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch tasks' };
  }
};

// Get single task
export const getTask = async (id) => {
  try {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch task' };
  }
};

// Create new task
export const createTask = async (taskData) => {
  try {
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create task' };
  }
};

// Update task
export const updateTask = async (id, taskData) => {
  try {
    const response = await api.put(`/api/tasks/${id}`, taskData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update task' };
  }
};

// Update task status (for drag and drop)
export const updateTaskStatus = async (id, status, position) => {
  try {
    const response = await api.patch(`/api/tasks/${id}/status`, { status, position });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update task status' };
  }
};

// Delete task
export const deleteTask = async (id) => {
  try {
    const response = await api.delete(`/api/tasks/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete task' };
  }
};
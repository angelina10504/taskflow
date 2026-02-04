import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test function to check backend connection
export const testConnection = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

export default api;

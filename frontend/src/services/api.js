import axios from 'axios';
import { auth } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_URL });

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    // Get the fresh token from Firebase instead of localStorage
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email, password) =>
  api.post('/api/auth/login', { email, password }).then(r => r.data);

export const register = (email, password, name) =>
  api.post('/api/auth/register', { email, password, name }).then(r => r.data);

// Contacts
export const getContacts = () => api.get('/api/contacts').then(r => r.data);
export const addContact = (name, phone) =>
  api.post('/api/contacts', { name, phone }).then(r => r.data);
export const deleteContact = (id) =>
  api.delete(`/api/contacts/${id}`).then(r => r.data);

// Emergency
export const triggerEmergency = (latitude, longitude, sensor_data) =>
  api.post('/api/emergency/trigger', { latitude, longitude, sensor_data }).then(r => r.data);

// History
export const getHistory = () => api.get('/api/history').then(r => r.data);

// Health
export const getHealth = () => api.get('/api/health').then(r => r.data);

export default api;

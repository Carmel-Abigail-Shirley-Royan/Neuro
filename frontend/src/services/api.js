import axios from "axios";
import { auth } from "../firebase";

// Backend URL (from Netlify env variable)
const API_URL = (process.env.REACT_APP_API_URL || "https://neuro-82e7.onrender.com").replace(/\/$/, "");

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // helps with Render cold start
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Firebase JWT automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken(); // removed forced refresh
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("🔐 Auth Interceptor Error:", error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global API error logger
api.interceptors.request.use(
  async (config) => {
    try {
      // Small logic to wait for Firebase if it's still loading
      let user = auth.currentUser;
      
      // If user isn't found immediately, wait a split second
      if (!user) {
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((u) => {
            user = u;
            unsubscribe();
            resolve();
          });
        });
      }

      if (user) {
        const token = await user.getIdToken(); 
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("🔐 Auth Interceptor Error:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────
// AUTH
// ─────────────────────────────

export const login = (email, password) =>
  api.post("/api/auth/login", { email, password }).then((res) => res.data);

export const register = (email, password, name) =>
  api.post("/api/auth/register", { email, password, name }).then((res) => res.data);

// ─────────────────────────────
// CONTACTS
// ─────────────────────────────

export const getContacts = () =>
  api.get("/api/contacts").then((res) => res.data);

export const addContact = (name, phone) =>
  api.post("/api/contacts", { name, phone }).then((res) => res.data);

export const deleteContact = (id) =>
  api.delete(`/api/contacts/${id}`).then((res) => res.data);

// ─────────────────────────────
// EMERGENCY
// ─────────────────────────────

export const triggerEmergency = (latitude, longitude, sensor_data) =>
  api
    .post("/api/emergency/trigger", {
      latitude,
      longitude,
      sensor_data,
    })
    .then((res) => res.data);

// ─────────────────────────────
// HISTORY
// ─────────────────────────────

export const getHistory = () =>
  api.get("/api/history").then((res) => res.data);

// ─────────────────────────────
// HEALTH CHECK
// ─────────────────────────────

export const getHealth = () =>
  api.get("/api/health").then((res) => res.data);

export default api;
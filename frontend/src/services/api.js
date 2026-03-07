import axios from "axios";
import { auth } from "../firebase";

const API_URL = "https://neuro-82e7.onrender.com";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Firebase token
api.interceptors.request.use(
  async (config) => {
    try {
      let user = auth.currentUser;

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

// AUTH
export const login = (email, password) =>
  api.post("/api/auth/login", { email, password }).then((res) => res.data);

export const register = (email, password, name) =>
  api.post("/api/auth/register", { email, password, name }).then((res) => res.data);

// CONTACTS
export const getContacts = () =>
  api.get("/api/contacts").then((res) => res.data);

export const addContact = (name, phone) =>
  api.post("/api/contacts", { name, phone }).then((res) => res.data);

export const deleteContact = (id) =>
  api.delete(`/api/contacts/${id}`).then((res) => res.data);

// HISTORY
export const getHistory = () =>
  api.get("/api/history").then((res) => res.data);

// HEALTH
export const getHealth = () =>
  api.get("/api/health").then((res) => res.data);

export const triggerEmergency = (latitude, longitude) => {
  // 1. Get contacts from the browser's local storage
  const contacts = JSON.parse(localStorage.getItem("contacts")) || [];

  // 2. Extract just the email addresses
  const emails = contacts.map((c) => c.phone);

  // 3. Send them to your FastAPI backend
  return api.post("/api/emergency/trigger", {
    latitude,
    longitude,
    sensor_data: {
      emails: emails // This matches the backend 'get("emails")' logic
    }
  }).then((res) => res.data);
};
export default api;


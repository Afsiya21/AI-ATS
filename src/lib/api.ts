import axios from "axios";

export const API_BASE_URL = "http://localhost:5000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Attach token from localStorage on every request (client-only).
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export type UserRole = "candidate" | "recruiter";

export interface AuthUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  skills?: string[];
}

import axios from "axios";
import { store, selectAccessToken } from "../../app/store/session.store.js";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
});

apiClient.interceptors.request.use((config) => {
  const accessToken = selectAccessToken(store.getState());

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

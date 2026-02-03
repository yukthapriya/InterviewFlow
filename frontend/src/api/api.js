import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export function apiClient(token) {
  return axios.create({
    baseURL: API_BASE + '/api',
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
}

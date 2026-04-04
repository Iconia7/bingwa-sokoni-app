import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const portalAuth = {
  login: (phoneNumber, pin) => api.post('/portal-auth/login', { phoneNumber, pin }),
  setPin: (phoneNumber, pin) => api.post('/portal-auth/set-pin', { phoneNumber, pin }),
};

export const deviceApi = {
  getDeviceData: (userId) => api.get(`/remote-device/device-data/${userId}`), 
  issueCommand: (userId, type, payload) => api.post('/remote-device/issue-command', { userId, type, payload }),
};

export default api;

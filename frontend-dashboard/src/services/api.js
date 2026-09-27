import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

export const getDashboardStats = () => api.get('/admin/dashboard');
export const getRiskZones = () => api.get('/admin/risk-zones');
export const getTriggerEvents = () => api.get('/admin/trigger-events');
export const getFinancialSummary = () => api.get('/admin/financial-summary');
export const getAllPolicies = (params) => api.get('/policies', { params });
export const getAllClaims = (params) => api.get('/claims', { params });
export const simulateTrigger = (data) => api.post('/claims/simulate-trigger', data);

export default api;

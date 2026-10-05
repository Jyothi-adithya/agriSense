/**
 * AgriSense API Service
 * Central axios wrapper for all backend API calls.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Health ──────────────────────────────────────────────────────────────────
export const fetchHealth = () => api.get('/health')

// ── Dashboard ───────────────────────────────────────────────────────────────
export const fetchDashboard = () => api.get('/dashboard')

// ── Crops CRUD ───────────────────────────────────────────────────────────────
export const fetchCrops = (params = {}) => api.get('/crops', { params })
export const fetchCropById = (id) => api.get(`/crops/${id}`)
export const createCrop = (data) => api.post('/crops', data)
export const updateCrop = (id, data) => api.put(`/crops/${id}`, data)
export const deleteCrop = (id) => api.delete(`/crops/${id}`)

// ── Analytics ────────────────────────────────────────────────────────────────
export const fetchCropDistribution = () => api.get('/analytics/crop-distribution')
export const fetchSoilAnalytics = () => api.get('/analytics/soil')
export const fetchClimateAnalytics = () => api.get('/analytics/climate')
export const fetchCropProfile = (crop) => api.get(`/analytics/crop-profile/${crop}`)

// ── Recommendation ───────────────────────────────────────────────────────────
export const getRecommendation = (data) => api.post('/recommend', data)
export const fetchRecommendationHistory = () => api.get('/recommendation-history')

export default api

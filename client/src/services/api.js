import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
};

// User API calls
export const userAPI = {
  getAllUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
};

// Game API calls
export const gameAPI = {
  createGame: (opponentId) => api.post('/game/create', { opponentId }),
  createBotGame: () => api.post('/game/create-bot'),
  getGame: (gameId) => api.get(`/game/${gameId}`),
  makeMove: (gameId, move) => api.post(`/game/${gameId}/move`, { move }),
  makeBotMove: (gameId, move) => api.post(`/game/${gameId}/move-bot`, { move }),
  getMyGames: () => api.get('/game/my-games'),
  getActiveGames: () => api.get('/game/active'),
  resignGame: (gameId) => api.post(`/game/${gameId}/resign`),
  abortGame: (gameId) => api.post(`/game/${gameId}/abort`),  
};

export default api;
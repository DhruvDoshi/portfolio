import axios from 'axios';

// Configure axios for Netlify functions
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/.netlify/functions' : 'http://localhost:3000/.netlify/functions'
});

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth-login', { email, password }),
  register: (username, email, password) => api.post('/auth-register', { username, email, password }),
  getMe: () => api.get('/auth-me')
};

// Portfolios API
export const portfoliosAPI = {
  getAll: () => api.get('/portfolios'),
  create: (data) => api.post('/portfolios', data),
  getById: (id) => api.get(`/portfolios?id=${id}`),
  update: (id, data) => api.put(`/portfolios?id=${id}`, data),
  delete: (id) => api.delete(`/portfolios?id=${id}`),
  getSummary: (id) => api.get(`/portfolio-summary?id=${id}`),
  getTransactions: (id) => api.get(`/portfolio-transactions?id=${id}`),
  addTransaction: (id, data) => api.post(`/portfolio-transactions?id=${id}`, data)
};

// Stocks API
export const stocksAPI = {
  getQuote: (symbol, period = '1y') => api.get(`/stocks?action=quote&symbol=${symbol}&period=${period}`),
  search: (query) => api.get(`/stocks?action=search&q=${query}`),
  getMultipleQuotes: (symbols) => api.post('/stocks?action=quotes', { symbols }),
  getXIRR: (portfolioId) => api.get(`/portfolio-xirr?id=${portfolioId}`)
};

export default api;

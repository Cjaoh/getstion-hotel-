import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Ajoute automatiquement le token JWT sur chaque requête sortante
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si le token est invalide/expiré (401), on nettoie et on renvoie vers le login.
// On utilise window.location plutôt que le router ici pour éviter un import
// circulaire (router -> stores/auth -> services/api).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Authentification
export const authService = {
  login: (email, motDePasse) => api.post('/auth/login', { email, motDePasse }),
  me: () => api.get('/auth/me'),
};

// Chambres
export const chambreService = {
  getAll: (params) => api.get('/chambres', { params }),
  getOne: (id) => api.get(`/chambres/${id}`),
  create: (data) => api.post('/chambres', data),
  update: (id, data) => api.put(`/chambres/${id}`, data),
  updateStatut: (id, statut) => api.patch(`/chambres/${id}/statut`, { statut }),
  remove: (id) => api.delete(`/chambres/${id}`),
};

// Réservations
export const reservationService = {
  getAll: (params) => api.get('/reservations', { params }),
  getOne: (id) => api.get(`/reservations/${id}`),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  annuler: (id) => api.patch(`/reservations/${id}/annuler`),
  remove: (id) => api.delete(`/reservations/${id}`),
};

// Paiements
export const paiementService = {
  getAll: (params) => api.get('/paiements', { params }),
  create: (data) => api.post('/paiements', data),
  update: (id, data) => api.patch(`/paiements/${id}`, data),
  remove: (id) => api.delete(`/paiements/${id}`),
};

// Clients
export const clientService = {
  getAll: () => api.get('/clients'),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  remove: (id) => api.delete(`/clients/${id}`),
};

// Stats
export const statsService = {
  getMensuel: (mois, annee) => api.get('/stats/mensuel', { params: { mois, annee } }),
  getRepartitionChambres: () => api.get('/stats/chambres-statut'),
  getEvolutionCA: (mois) => api.get('/stats/ca-evolution', { params: { mois } }),
};

// Disponibilité
export const disponibiliteService = {
  get: (dateDebut, dateFin) => api.get('/disponibilite', { params: { dateDebut, dateFin } }),
};
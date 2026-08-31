import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

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

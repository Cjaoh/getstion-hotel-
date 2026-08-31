import { defineStore } from 'pinia';
import { chambreService } from '../services/api';

export const useChambresStore = defineStore('chambres', {
  state: () => ({
    chambres: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchChambres(params) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await chambreService.getAll(params);
        this.chambres = data.data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    },
    async createChambre(payload) {
      const { data } = await chambreService.create(payload);
      this.chambres.push(data.data);
      return data.data;
    },
    async updateChambre(id, payload) {
      const { data } = await chambreService.update(id, payload);
      const index = this.chambres.findIndex((c) => c._id === id);
      if (index !== -1) this.chambres[index] = data.data;
      return data.data;
    },
    async changerStatut(id, statut) {
      const { data } = await chambreService.updateStatut(id, statut);
      const index = this.chambres.findIndex((c) => c._id === id);
      if (index !== -1) this.chambres[index] = data.data;
      return data.data;
    },
    async supprimerChambre(id) {
      await chambreService.remove(id);
      this.chambres = this.chambres.filter((c) => c._id !== id);
    },
  },
});

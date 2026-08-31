import { defineStore } from 'pinia';
import { reservationService } from '../services/api';

export const useReservationsStore = defineStore('reservations', {
  state: () => ({
    reservations: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchReservations(params) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await reservationService.getAll(params);
        this.reservations = data.data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    },
    // Retourne { success, message } pour affichage direct côté formulaire
    async creerReservation(payload) {
      try {
        const { data } = await reservationService.create(payload);
        this.reservations.push(data.data);
        return { success: true, data: data.data };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },
    async modifierReservation(id, payload) {
      try {
        const { data } = await reservationService.update(id, payload);
        const index = this.reservations.findIndex((r) => r._id === id);
        if (index !== -1) this.reservations[index] = data.data;
        return { success: true, data: data.data };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },
    async annulerReservation(id) {
      const { data } = await reservationService.annuler(id);
      const index = this.reservations.findIndex((r) => r._id === id);
      if (index !== -1) this.reservations[index] = data.data;
    },
  },
});

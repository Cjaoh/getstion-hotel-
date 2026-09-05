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
    async creerReservation(payload) {
      try {
        const { data } = await reservationService.create(payload);
        this.reservations.push(data.data);
        return { success: true, data: data.data };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },
    async creerReservationGroupee(payload) {
      try {
        const { data } = await reservationService.creerGroupe(payload);
        this.reservations.push(...data.data);
        return { success: true, data: data.data, enAttenteValidation: data.enAttenteValidation };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },
    // NOUVEAU — confirme un groupe entier (sort du statut "en attente de validation")
    async validerGroupeReservation(groupeReservationId) {
      try {
        const { data } = await reservationService.validerGroupe(groupeReservationId);
        data.data.forEach((r) => {
          const index = this.reservations.findIndex((existante) => existante._id === r._id);
          if (index !== -1) this.reservations[index] = r;
        });
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
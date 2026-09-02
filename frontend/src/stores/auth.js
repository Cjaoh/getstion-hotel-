import { defineStore } from 'pinia';
import { authService } from '../services/api';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
        error: null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
        role: (state) => state.user?.role,
        estAdmin: (state) => state.user?.role === 'admin',
    },
    actions: {
        async login(email, motDePasse) {
            this.error = null;
            try {
                const { data } = await authService.login(email, motDePasse);
                this.token = data.token;
                this.user = { _id: data._id, nom: data.nom, email: data.email, role: data.role };
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                return { success: true };
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                return { success: false, message: this.error };
            }
        },
        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
});
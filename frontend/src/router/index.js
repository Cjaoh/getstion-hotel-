import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Dashboard from '../views/Dashboard.vue';
import Chambres from '../views/Chambres.vue';
import Reservations from '../views/Reservations.vue';
import Calendrier from '../views/Calendrier.vue';
import Paiements from '../views/Paiements.vue';
import Login from '../views/Login.vue';

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  // Le dashboard contient le CA et les stats — réservé aux admins.
  { path: '/', name: 'dashboard', component: Dashboard, meta: { adminOnly: true } },
  { path: '/chambres', name: 'chambres', component: Chambres },
  { path: '/reservations', name: 'reservations', component: Reservations },
  { path: '/calendrier', name: 'calendrier', component: Calendrier },
  { path: '/paiements', name: 'paiements', component: Paiements },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { name: 'login' };
  }
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: authStore.estAdmin ? 'dashboard' : 'reservations' };
  }
  if (to.meta.adminOnly && !authStore.estAdmin) {
    return { name: 'reservations' }; // l'accueil est renvoyé vers son écran principal
  }
});

export default router;
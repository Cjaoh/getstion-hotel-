import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Chambres from '../views/Chambres.vue';
import Reservations from '../views/Reservations.vue';
import Calendrier from '../views/Calendrier.vue';
import Paiements from '../views/Paiements.vue';

const routes = [
  { path: '/', name: 'dashboard', component: Dashboard },
  { path: '/chambres', name: 'chambres', component: Chambres },
  { path: '/reservations', name: 'reservations', component: Reservations },
  { path: '/calendrier', name: 'calendrier', component: Calendrier },
  { path: '/paiements', name: 'paiements', component: Paiements },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

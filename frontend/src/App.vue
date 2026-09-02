<template>
  <div>
    <nav v-if="authStore.isAuthenticated" class="navbar">
      <h1>🏨 Gestion Hôtelière</h1>
      <div class="nav-links">
        <router-link v-if="authStore.estAdmin" to="/">Dashboard</router-link>
        <router-link to="/chambres">Chambres</router-link>
        <router-link to="/reservations">Réservations</router-link>
        <router-link to="/calendrier">Calendrier</router-link>
        <router-link to="/paiements">Paiements</router-link>
      </div>
      <div class="nav-user">
        <span>{{ authStore.user?.nom }} · {{ authStore.estAdmin ? 'Admin' : 'Accueil' }}</span>
        <button @click="handleLogout">Déconnexion</button>
      </div>
    </nav>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.navbar {
  background: #1e293b;
  color: #fff;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
}

.nav-links a {
  color: #cbd5e1;
  text-decoration: none;
  font-weight: 500;
}

.nav-links a.router-link-exact-active {
  color: #fff;
  border-bottom: 2px solid #2563eb;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.nav-user button {
  background: transparent;
  border: 1px solid #475569;
  color: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.nav-user button:hover {
  background: #334155;
}
</style>
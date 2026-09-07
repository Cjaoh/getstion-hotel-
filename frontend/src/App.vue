<template>
  <div>
    <nav v-if="authStore.isAuthenticated" class="navbar">
      <div class="marque">
        <span class="marque-nom">Tsara Trace</span>
        <span class="marque-sous">Gestion hôtelière</span>
      </div>
      <div class="nav-links">
        <router-link v-if="authStore.estAdmin" to="/">Tableau de bord</router-link>
        <router-link to="/chambres">Chambres</router-link>
        <router-link to="/reservations">Réservations</router-link>
        <router-link to="/calendrier">Calendrier</router-link>
        <router-link to="/paiements">Paiements</router-link>
      </div>
      <div class="nav-user">
        <span class="nav-user-nom">{{ authStore.user?.nom }}</span>
        <span class="nav-user-role">{{ authStore.estAdmin ? 'Admin' : 'Accueil' }}</span>
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
  background: var(--brand-dark);
  color: #fff;
  padding: 1rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.marque {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.marque-nom {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}
.marque-sous {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: #a9c9c0;
  text-transform: uppercase;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: #cfe3dc;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  padding-bottom: 0.3rem;
  border-bottom: 2px solid transparent;
}

.nav-links a.router-link-exact-active {
  color: #fff;
  border-bottom-color: var(--brass);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: #cfe3dc;
}

.nav-user-nom {
  font-weight: 600;
  color: #fff;
}
.nav-user-role {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.72rem;
}

.nav-user button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.nav-user button:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 720px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
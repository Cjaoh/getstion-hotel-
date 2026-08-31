<template>
  <div>
    <nav class="navbar">
      <h1>🏨 Gestion Hôtelière</h1>
      <div class="nav-links">
        <router-link to="/">Dashboard</router-link>
        <router-link to="/chambres">Chambres</router-link>
        <router-link to="/reservations">Réservations</router-link>
        <router-link to="/calendrier">Calendrier</router-link>
        <router-link to="/paiements">Paiements</router-link>
      </div>
    </nav>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.navbar {
  background: #1e293b;
  color: #fff;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
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
</style>

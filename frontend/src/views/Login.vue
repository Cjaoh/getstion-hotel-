<template>
  <div class="ecran-login">
    <aside class="panneau-marque">
      <div class="panneau-marque-contenu">
        <p class="marque-nom marque-logo">Tsara Trace</p>
        <h1>Gestion hôtelière</h1>
        <p class="marque-baseline">
          Chambres, réservations, paiements et disponibilité — au même endroit,
          pour une équipe qui n'a pas de temps à perdre.
        </p>
      </div>
    </aside>

    <section class="panneau-formulaire">
      <form class="carte-login" @submit.prevent="handleSubmit">
        <h2>Connexion</h2>
        <p class="sous-titre">Accédez à votre espace de gestion.</p>

        <label>
          Email
          <input v-model="email" type="email" required autocomplete="username" placeholder="nom@tsaratrace.mg" />
        </label>
        <label>
          Mot de passe
          <input v-model="motDePasse" type="password" required autocomplete="current-password" />
        </label>

        <p v-if="authStore.error" class="erreur">{{ authStore.error }}</p>

        <button type="submit" class="btn-principal" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const email = ref('');
const motDePasse = ref('');
const loading = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleSubmit = async () => {
  loading.value = true;
  const result = await authStore.login(email.value, motDePasse.value);
  loading.value = false;
  if (result.success) {
    router.push('/');
  }
};
</script>

<style scoped>
.ecran-login {
  min-height: 100vh;
  margin: -1.5rem;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
}

.panneau-marque {
  background: var(--brand-dark);
  color: #fff;
  display: flex;
  align-items: center;
  padding: 3rem;
}
.panneau-marque-contenu {
  max-width: 380px;
}
.panneau-marque .marque-nom {
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brass);
  font-weight: 600;
  margin-bottom: 0.75rem;
}
.panneau-marque h1 {
  font-family: var(--font-serif);
  font-size: 2.4rem;
  color: #fff;
  margin-bottom: 1.25rem;
  line-height: 1.15;
}
.marque-baseline {
  color: #cfe3dc;
  font-size: 0.95rem;
  line-height: 1.6;
}

.panneau-formulaire {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--paper);
}

.carte-login {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.carte-login h2 {
  font-size: 1.6rem;
  margin-bottom: 0.15rem;
}
.sous-titre {
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.carte-login label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
}
.carte-login input {
  font-size: 1rem;
  padding: 0.65rem 0.8rem;
}
.carte-login button {
  margin-top: 0.5rem;
  padding: 0.7rem;
  font-size: 0.95rem;
}
.carte-login button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.erreur {
  color: var(--danger);
  font-size: 0.85rem;
}

@media (max-width: 800px) {
  .ecran-login {
    grid-template-columns: 1fr;
  }
  .panneau-marque {
    padding: 2rem;
    min-height: 220px;
  }
  .panneau-marque h1 {
    font-size: 1.8rem;
  }
}
</style>
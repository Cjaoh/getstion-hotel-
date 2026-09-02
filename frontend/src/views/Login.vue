<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="handleSubmit">
      <h2>🏨 Connexion</h2>
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="username" />
      </label>
      <label>
        Mot de passe
        <input v-model="motDePasse" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="authStore.error" class="error">{{ authStore.error }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>
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
.login-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 0.5rem;
}

.login-card label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #334155;
}

.login-card input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
}

.login-card button {
  margin-top: 0.5rem;
  padding: 0.65rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.login-card button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0;
}
</style>
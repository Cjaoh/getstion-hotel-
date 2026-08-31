<template>
  <div>
    <div class="header-row">
      <h2>Réservations</h2>
      <button class="btn btn-primary" @click="afficherFormulaire = !afficherFormulaire">
        + Nouvelle réservation
      </button>
    </div>

    <div class="card" v-if="afficherFormulaire">
      <form @submit.prevent="soumettre">
        <div class="form-row">
          <select v-model="form.client" required>
            <option disabled value="">-- Client --</option>
            <option v-for="c in clients" :key="c._id" :value="c._id">{{ c.nom }} {{ c.prenom }}</option>
          </select>
          <select v-model="form.chambre" required>
            <option disabled value="">-- Chambre --</option>
            <option v-for="c in chambresStore.chambres" :key="c._id" :value="c._id">
              {{ c.numero }} ({{ c.type }})
            </option>
          </select>
        </div>
        <div class="form-row">
          <input v-model="form.dateArrivee" type="date" required />
          <input v-model="form.dateDepart" type="date" required />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Réserver</button>
          <button class="btn" type="button" @click="afficherFormulaire = false">Annuler</button>
        </div>
        <p v-if="erreur" class="erreur">{{ erreur }}</p>
      </form>
    </div>

    <div class="card" style="margin-top: 1rem">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Chambre</th>
            <th>Arrivée</th>
            <th>Départ</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.reservations" :key="r._id">
            <td>{{ r.client?.nom }} {{ r.client?.prenom }}</td>
            <td>{{ r.chambre?.numero }}</td>
            <td>{{ formatDate(r.dateArrivee) }}</td>
            <td>{{ formatDate(r.dateDepart) }}</td>
            <td>{{ r.statut }}</td>
            <td>
              <button
                class="btn btn-danger"
                v-if="r.statut === 'Confirmée'"
                @click="store.annulerReservation(r._id)"
              >
                Annuler
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!store.reservations.length && !store.loading">Aucune réservation.</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useReservationsStore } from '../stores/reservations';
import { useChambresStore } from '../stores/chambres';
import { clientService } from '../services/api';

const store = useReservationsStore();
const chambresStore = useChambresStore();
const clients = ref([]);
const afficherFormulaire = ref(false);
const erreur = ref('');

const form = reactive({ client: '', chambre: '', dateArrivee: '', dateDepart: '' });

onMounted(async () => {
  store.fetchReservations();
  chambresStore.fetchChambres();
  const { data } = await clientService.getAll();
  clients.value = data.data;
});

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}

async function soumettre() {
  erreur.value = '';
  const resultat = await store.creerReservation({ ...form });
  if (resultat.success) {
    afficherFormulaire.value = false;
    form.client = '';
    form.chambre = '';
    form.dateArrivee = '';
    form.dateDepart = '';
  } else {
    // Ex: "Cette chambre est déjà réservée sur cette période" (contrôle des doublons)
    erreur.value = resultat.message;
  }
}
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.form-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.form-row input,
.form-row select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
}
.erreur {
  color: #dc2626;
  margin-top: 0.5rem;
}
</style>

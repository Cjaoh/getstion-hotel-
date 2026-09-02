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
              {{ c.numero }} — {{ c.typeLit }} ({{ c.gamme }})
            </option>
          </select>
        </div>

        <div class="form-row">
          <input v-model="form.dateArrivee" type="date" required />
          <input v-model="form.dateDepart" type="date" required />
        </div>

        <div class="form-row">
          <input v-model.number="form.nombreAdultes" type="number" min="1" placeholder="Adultes" required />
          <input v-model.number="form.nombreEnfants" type="number" min="0" placeholder="Enfants" />
          <input v-model.number="form.remise" type="number" min="0" placeholder="Remise (Ar, optionnel)" />
        </div>

        <textarea v-model="form.preferences" placeholder="Préférences client (ex: étage élevé...)" rows="2"></textarea>

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
            <th>Occupants</th>
            <th>Montant total</th>
            <th>Paiement</th>
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
            <td>{{ r.nombreAdultes }} ad. {{ r.nombreEnfants ? `+ ${r.nombreEnfants} enf.` : '' }}</td>
            <td>{{ r.montantTotal }} {{ r.devise || 'Ar' }}</td>
            <td>
              <span class="badge-paiement" :class="badgePaiementClass(r.statutPaiement)">
                {{ r.statutPaiement }}
              </span>
            </td>
            <td>{{ r.statut }}</td>
            <td class="actions-cell">
              <button
                class="btn"
                v-if="r.statutReservation === 'confirmee'"
                @click="changerCycle(r, 'check_in_fait')"
              >
                Check-in
              </button>
              <button
                class="btn"
                v-if="r.statutReservation === 'check_in_fait'"
                @click="changerCycle(r, 'check_out_fait')"
              >
                Check-out
              </button>
              <button
                class="btn btn-danger"
                v-if="['confirmee', 'en_attente_paiement'].includes(r.statutReservation)"
                @click="annuler(r)"
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

const form = reactive({
  client: '',
  chambre: '',
  dateArrivee: '',
  dateDepart: '',
  nombreAdultes: 1,
  nombreEnfants: 0,
  remise: 0,
  preferences: '',
});

onMounted(async () => {
  store.fetchReservations();
  chambresStore.fetchChambres();
  const { data } = await clientService.getAll();
  clients.value = data.data;
});

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}

function badgePaiementClass(statut) {
  return {
    'Non payé': 'badge-non-paye',
    Partiel: 'badge-partiel',
    Payé: 'badge-paye',
    Remboursé: 'badge-rembourse',
  }[statut];
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
    form.nombreAdultes = 1;
    form.nombreEnfants = 0;
    form.remise = 0;
    form.preferences = '';
  } else {
    // Ex: "Cette chambre est déjà réservée sur cette période" (contrôle des doublons)
    erreur.value = resultat.message;
  }
}

async function changerCycle(reservation, statutReservation) {
  await store.modifierReservation(reservation._id, { statutReservation });
}

async function annuler(reservation) {
  if (confirm('Annuler cette réservation ?')) {
    await store.annulerReservation(reservation._id);
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
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-family: inherit;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
}
.erreur {
  color: #dc2626;
  margin-top: 0.5rem;
}
.actions-cell {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.badge-paiement {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.badge-non-paye {
  background: #fee2e2;
  color: #b91c1c;
}
.badge-partiel {
  background: #fef3c7;
  color: #92400e;
}
.badge-paye {
  background: #dcfce7;
  color: #15803d;
}
.badge-rembourse {
  background: #e0e7ff;
  color: #4338ca;
}
</style>
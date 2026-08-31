<template>
  <div>
    <div class="header-row">
      <h2>Gestion des Chambres</h2>
      <button class="btn btn-primary" @click="ouvrirFormulaire()">+ Nouvelle chambre</button>
    </div>

    <div class="card" v-if="afficherFormulaire">
      <h3>{{ chambreEnEdition ? 'Modifier' : 'Ajouter' }} une chambre</h3>
      <form @submit.prevent="soumettre">
        <div class="form-row">
          <input v-model="form.numero" placeholder="Numéro (ex: 101)" required />
          <select v-model="form.type" required>
            <option value="Simple">Simple</option>
            <option value="Double">Double</option>
            <option value="Suite">Suite</option>
          </select>
          <input v-model.number="form.prixNuitee" type="number" min="0" placeholder="Prix/nuit" required />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Enregistrer</button>
          <button class="btn" type="button" @click="fermerFormulaire">Annuler</button>
        </div>
        <p v-if="erreur" class="erreur">{{ erreur }}</p>
      </form>
    </div>

    <div class="card" style="margin-top: 1rem">
      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Type</th>
            <th>Prix/nuit</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="chambre in store.chambres" :key="chambre._id">
            <td>{{ chambre.numero }}</td>
            <td>{{ chambre.type }}</td>
            <td>{{ chambre.prixNuitee }} Ar</td>
            <td>
              <select :value="chambre.statut" @change="changerStatut(chambre, $event.target.value)">
                <option>Disponible</option>
                <option>Occupée</option>
                <option>En cours de nettoyage</option>
                <option>Hors service</option>
              </select>
            </td>
            <td>
              <button class="btn" @click="ouvrirFormulaire(chambre)">Modifier</button>
              <button class="btn btn-danger" @click="supprimer(chambre._id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!store.chambres.length && !store.loading">Aucune chambre enregistrée.</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useChambresStore } from '../stores/chambres';

const store = useChambresStore();
const afficherFormulaire = ref(false);
const chambreEnEdition = ref(null);
const erreur = ref('');

const form = reactive({ numero: '', type: 'Simple', prixNuitee: null });

onMounted(() => store.fetchChambres());

function ouvrirFormulaire(chambre = null) {
  chambreEnEdition.value = chambre;
  if (chambre) {
    form.numero = chambre.numero;
    form.type = chambre.type;
    form.prixNuitee = chambre.prixNuitee;
  } else {
    form.numero = '';
    form.type = 'Simple';
    form.prixNuitee = null;
  }
  erreur.value = '';
  afficherFormulaire.value = true;
}

function fermerFormulaire() {
  afficherFormulaire.value = false;
  chambreEnEdition.value = null;
}

async function soumettre() {
  try {
    if (chambreEnEdition.value) {
      await store.updateChambre(chambreEnEdition.value._id, { ...form });
    } else {
      await store.createChambre({ ...form });
    }
    fermerFormulaire();
  } catch (err) {
    erreur.value = err.response?.data?.message || 'Erreur lors de l\'enregistrement';
  }
}

async function changerStatut(chambre, statut) {
  await store.changerStatut(chambre._id, statut);
}

async function supprimer(id) {
  if (confirm('Supprimer cette chambre ?')) {
    await store.supprimerChambre(id);
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

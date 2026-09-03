<template>
  <div>
    <div class="header-row">
      <h2>Gestion des Chambres</h2>
      <button v-if="authStore.estAdmin" class="btn btn-primary" @click="ouvrirFormulaire()">
        + Nouvelle chambre
      </button>
    </div>

    <div class="card" v-if="afficherFormulaire && authStore.estAdmin">
      <h3>{{ chambreEnEdition ? 'Modifier' : 'Ajouter' }} une chambre</h3>
      <form @submit.prevent="soumettre">
        <div class="form-row">
          <input v-model="form.numero" placeholder="Numéro (ex: 101)" required />
          <select v-model="form.typeLit" required @change="ajusterCapacite">
            <option value="Simple">Simple (1 lit simple)</option>
            <option value="Double">Double (1 grand lit)</option>
            <option value="Twin">Twin (2 lits simples)</option>
            <option value="Triple">Triple</option>
            <option value="Quadruple">Quadruple</option>
            <option value="Queen">Queen</option>
            <option value="King">King</option>
          </select>
          <input v-model.number="form.capaciteMax" type="number" min="1" placeholder="Capacité (pers.)" required />
        </div>

        <div class="form-row">
          <select v-model="form.gamme" required>
            <option value="Standard">Standard</option>
            <option value="Supérieure">Supérieure / Deluxe</option>
            <option value="Executive">Executive</option>
          </select>
          <select v-model="form.categorieSpeciale">
            <option value="Aucune">Aucune (chambre classique)</option>
            <option value="Suite">Suite</option>
            <option value="Communicante">Communicante</option>
            <option value="Studio">Studio / Appartement</option>
          </select>
          <select v-model="form.vue">
            <option value="Aucune">Vue non précisée</option>
            <option value="Cour">Cour</option>
            <option value="Parking">Parking</option>
            <option value="Rue">Rue</option>
            <option value="Jardin">Jardin</option>
            <option value="Mer">Mer</option>
            <option value="Ville">Ville</option>
          </select>
        </div>

        <div class="form-row">
          <input v-model.number="form.prixNuitee" type="number" min="0" placeholder="Prix/nuit (Ar)" required />
          <input v-model="form.equipements" placeholder="Équipements (séparés par des virgules)" />
        </div>

        <textarea v-model="form.description" placeholder="Description (optionnel)" rows="2"></textarea>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Enregistrer</button>
          <button class="btn" type="button" @click="fermerFormulaire">Annuler</button>
        </div>
        <p v-if="erreur" class="erreur">{{ erreur }}</p>
      </form>
    </div>

    <p v-if="!authStore.estAdmin" class="hint">
      Vue en lecture seule — la gestion des chambres est réservée aux administrateurs.
    </p>

    <!-- Onglets par catégorie -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: categorieActive === 'Toutes' }"
        @click="categorieActive = 'Toutes'"
      >
        Toutes ({{ store.chambres.length }})
      </button>
      <button
        v-for="cat in CATEGORIES"
        :key="cat"
        class="tab"
        :class="{ active: categorieActive === cat }"
        @click="categorieActive = cat"
      >
        {{ cat }} ({{ compteParCategorie[cat] || 0 }})
      </button>
    </div>

    <div class="card" style="margin-top: 1rem">
      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Type</th>
            <th>Gamme</th>
            <th>Spécial</th>
            <th>Capacité</th>
            <th>Prix/nuit</th>
            <th>Statut</th>
            <th v-if="authStore.estAdmin">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="chambre in chambresFiltrees" :key="chambre._id">
            <td>{{ chambre.numero }}</td>
            <td>{{ chambre.typeLit }}</td>
            <td>{{ chambre.gamme }}</td>
            <td>
              <span v-if="chambre.categorieSpeciale && chambre.categorieSpeciale !== 'Aucune'" class="badge-special">
                {{ chambre.categorieSpeciale }}
              </span>
              <span v-else>—</span>
            </td>
            <td>{{ chambre.capaciteMax }} pers.</td>
            <td>{{ chambre.prixNuitee }} Ar</td>
            <td>
              <select
                v-if="authStore.estAdmin"
                :value="chambre.statutActuel"
                @change="changerStatut(chambre, $event.target.value)"
              >
                <option value="disponible">Disponible</option>
                <option value="occupe">Occupée</option>
                <option value="en_nettoyage">En cours de nettoyage</option>
                <option value="maintenance">Hors service</option>
              </select>
              <span v-else>{{ chambre.statut }}</span>
            </td>
            <td v-if="authStore.estAdmin">
              <button class="btn" @click="ouvrirFormulaire(chambre)">Modifier</button>
              <button class="btn btn-danger" @click="supprimer(chambre._id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!chambresFiltrees.length && !store.loading">Aucune chambre dans cette catégorie.</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useChambresStore } from '../stores/chambres';
import { useAuthStore } from '../stores/auth';

const store = useChambresStore();
const authStore = useAuthStore();
const afficherFormulaire = ref(false);
const chambreEnEdition = ref(null);
const erreur = ref('');
const categorieActive = ref('Toutes');

const CATEGORIES = ['Simple', 'Double', 'Twin', 'Triple', 'Quadruple', 'Queen', 'King'];
const CAPACITES = { Simple: 1, Double: 2, Twin: 2, Queen: 2, King: 2, Triple: 3, Quadruple: 4 };

const form = reactive({
  numero: '',
  typeLit: 'Double',
  capaciteMax: 2,
  gamme: 'Standard',
  categorieSpeciale: 'Aucune',
  vue: 'Aucune',
  prixNuitee: null,
  equipements: '',
  description: '',
});

onMounted(() => store.fetchChambres());

const compteParCategorie = computed(() => {
  const compte = {};
  for (const c of store.chambres) {
    compte[c.typeLit] = (compte[c.typeLit] || 0) + 1;
  }
  return compte;
});

const chambresFiltrees = computed(() => {
  if (categorieActive.value === 'Toutes') return store.chambres;
  return store.chambres.filter((c) => c.typeLit === categorieActive.value);
});

function ajusterCapacite() {
  form.capaciteMax = CAPACITES[form.typeLit] || 2;
}

function ouvrirFormulaire(chambre = null) {
  if (!authStore.estAdmin) return;
  chambreEnEdition.value = chambre;
  if (chambre) {
    form.numero = chambre.numero;
    form.typeLit = chambre.typeLit;
    form.capaciteMax = chambre.capaciteMax;
    form.gamme = chambre.gamme;
    form.categorieSpeciale = chambre.categorieSpeciale || 'Aucune';
    form.vue = chambre.vue || 'Aucune';
    form.prixNuitee = chambre.prixNuitee;
    form.equipements = (chambre.equipements || []).join(', ');
    form.description = chambre.description || '';
  } else {
    form.numero = '';
    form.typeLit = categorieActive.value !== 'Toutes' ? categorieActive.value : 'Double';
    form.capaciteMax = CAPACITES[form.typeLit] || 2;
    form.gamme = 'Standard';
    form.categorieSpeciale = 'Aucune';
    form.vue = 'Aucune';
    form.prixNuitee = null;
    form.equipements = '';
    form.description = '';
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
    const payload = {
      ...form,
      equipements: form.equipements
        ? form.equipements.split(',').map((e) => e.trim()).filter(Boolean)
        : [],
    };

    if (chambreEnEdition.value) {
      await store.updateChambre(chambreEnEdition.value._id, payload);
    } else {
      await store.createChambre(payload);
    }
    fermerFormulaire();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Erreur lors de l'enregistrement";
  }
}

async function changerStatut(chambre, statutActuel) {
  await store.changerStatut(chambre._id, statutActuel);
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
.hint {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
.badge-special {
  background: #ede9fe;
  color: #6d28d9;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.tabs {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.tab {
  padding: 0.4rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  font-size: 0.85rem;
}
.tab.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  font-weight: 600;
}
</style>
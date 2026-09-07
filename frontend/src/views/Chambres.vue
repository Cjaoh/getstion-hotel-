<template>
  <div class="page-chambres">
    <!-- ── En-tête ────────────────────────────────────────────── -->
    <header class="entete">
      <div class="entete-titre">
        <p class="entete-marque">Tsara Trace</p>
        <h1>Chambres</h1>
      </div>
      <button v-if="authStore.estAdmin" class="btn-principal" @click="ouvrirFormulaire()">
        + Nouvelle chambre
      </button>
    </header>

    <p v-if="!authStore.estAdmin" class="mention-lecture-seule">
      Vue en lecture seule — la gestion des chambres est réservée aux administrateurs.
    </p>

    <!-- ── Formulaire ajout/édition ──────────────────────────────── -->
    <div class="panneau-formulaire" v-if="afficherFormulaire && authStore.estAdmin">
      <h2>{{ chambreEnEdition ? 'Modifier la chambre' : 'Ajouter une chambre' }}</h2>
      <form @submit.prevent="soumettre">
        <div class="ligne-champs">
          <div class="champ">
            <label>Numéro</label>
            <input v-model="form.numero" placeholder="ex : 101" required />
          </div>
          <div class="champ">
            <label>Type de lit</label>
            <select v-model="form.typeLit" required @change="ajusterCapacite">
              <option value="Simple">Simple (1 lit simple)</option>
              <option value="Double">Double (1 grand lit)</option>
              <option value="Twin">Twin (2 lits simples)</option>
              <option value="Triple">Triple</option>
              <option value="Quadruple">Quadruple</option>
              <option value="Queen">Queen</option>
              <option value="King">King</option>
            </select>
          </div>
          <div class="champ champ-etroit">
            <label>Capacité</label>
            <input v-model.number="form.capaciteMax" type="number" min="1" required />
          </div>
        </div>

        <div class="ligne-champs">
          <div class="champ">
            <label>Gamme</label>
            <select v-model="form.gamme" required>
              <option value="Standard">Standard</option>
              <option value="Supérieure">Supérieure / Deluxe</option>
              <option value="Executive">Executive</option>
            </select>
          </div>
          <div class="champ">
            <label>Catégorie spéciale</label>
            <select v-model="form.categorieSpeciale">
              <option value="Aucune">Aucune (chambre classique)</option>
              <option value="Suite">Suite</option>
              <option value="Communicante">Communicante</option>
              <option value="Studio">Studio / Appartement</option>
            </select>
          </div>
          <div class="champ">
            <label>Vue</label>
            <select v-model="form.vue">
              <option value="Aucune">Non précisée</option>
              <option value="Cour">Cour</option>
              <option value="Parking">Parking</option>
              <option value="Rue">Rue</option>
              <option value="Jardin">Jardin</option>
              <option value="Mer">Mer</option>
              <option value="Ville">Ville</option>
            </select>
          </div>
        </div>

        <div class="ligne-champs">
          <div class="champ">
            <label>Prix par nuit (Ar)</label>
            <input v-model.number="form.prixNuitee" type="number" min="0" required />
          </div>
          <div class="champ champ-large">
            <label>Équipements</label>
            <input v-model="form.equipements" placeholder="ex : Wifi, Climatisation, Coffre-fort" />
          </div>
        </div>

        <div class="champ">
          <label>Description</label>
          <textarea v-model="form.description" rows="2" placeholder="Optionnel"></textarea>
        </div>

        <div class="actions-formulaire">
          <button class="btn-principal" type="submit">Enregistrer</button>
          <button class="btn-discret" type="button" @click="fermerFormulaire">Annuler</button>
        </div>
        <p v-if="erreur" class="message-erreur">{{ erreur }}</p>
      </form>
    </div>

    <!-- ── Filtres ────────────────────────────────────────────── -->
    <div class="barre-filtres">
      <div class="pastilles-categories">
        <button
          class="pastille"
          :class="{ active: categorieActive === 'Toutes' }"
          @click="categorieActive = 'Toutes'"
        >
          Toutes <span class="compteur">{{ store.chambres.length }}</span>
        </button>
        <button
          v-for="cat in CATEGORIES"
          :key="cat"
          class="pastille"
          :class="{ active: categorieActive === cat }"
          @click="categorieActive = cat"
        >
          {{ cat }} <span class="compteur">{{ compteParCategorie[cat] || 0 }}</span>
        </button>
      </div>
      <input
        v-model="recherche"
        type="search"
        class="champ-recherche"
        placeholder="Rechercher un numéro de chambre..."
      />
    </div>

    <!-- ── Grille de cartes ───────────────────────────────────── -->
    <div class="grille-chambres" v-if="chambresFiltrees.length">
      <article
        v-for="chambre in chambresFiltrees"
        :key="chambre._id"
        class="carte-chambre"
        :class="`statut-${chambre.statutActuel}`"
      >
        <div class="carte-entete">
          <span class="carte-numero">{{ chambre.numero }}</span>
          <span class="pastille-statut" :class="`pastille-${chambre.statutActuel}`">
            <i class="point-statut"></i>
            {{ libellesStatut[chambre.statutActuel] }}
          </span>
        </div>

        <p class="carte-type">
          {{ chambre.typeLit }} · {{ chambre.gamme }}
          <span v-if="chambre.categorieSpeciale && chambre.categorieSpeciale !== 'Aucune'" class="badge-special">
            {{ chambre.categorieSpeciale }}
          </span>
        </p>

        <div class="carte-details">
          <span>{{ chambre.capaciteMax }} pers.</span>
          <span class="carte-prix">{{ chambre.prixNuitee.toLocaleString('fr-FR') }} Ar<small>/nuit</small></span>
        </div>

        <!-- ── NOUVEAU : détails d'occupation ────────────────────── -->
        <div v-if="chambre.statutActuel === 'occupe'" class="bloc-occupation">
          <template v-if="occupationParChambre[chambre._id]">
            <p class="occupation-client">{{ occupationParChambre[chambre._id].client }}</p>
            <p class="occupation-dates">
              {{ formatDate(occupationParChambre[chambre._id].dateArrivee) }}
              →
              {{ formatDate(occupationParChambre[chambre._id].dateDepart) }}
            </p>
          </template>
          <p v-else class="occupation-inconnue">
            Occupée manuellement — aucune réservation active liée
          </p>
        </div>

        <div class="carte-pied" v-if="authStore.estAdmin">
          <select
            class="select-statut"
            :value="chambre.statutActuel"
            @change="changerStatut(chambre, $event.target.value)"
          >
            <option value="disponible">Disponible</option>
            <option value="occupe">Occupée</option>
            <option value="en_nettoyage">En nettoyage</option>
            <option value="maintenance">Hors service</option>
          </select>
          <div class="carte-actions">
            <button class="btn-icone" title="Modifier" @click="ouvrirFormulaire(chambre)">✎</button>
            <button class="btn-icone btn-icone-danger" title="Supprimer" @click="supprimer(chambre._id)">✕</button>
          </div>
        </div>
      </article>
    </div>

    <p v-else-if="!store.loading" class="etat-vide">
      Aucune chambre ne correspond à cette recherche.
    </p>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useChambresStore } from '../stores/chambres';
import { useAuthStore } from '../stores/auth';
import { useReservationsStore } from '../stores/reservations';

const store = useChambresStore();
const authStore = useAuthStore();
const reservationsStore = useReservationsStore(); // NOUVEAU
const afficherFormulaire = ref(false);
const chambreEnEdition = ref(null);
const erreur = ref('');
const categorieActive = ref('Toutes');
const recherche = ref('');

const CATEGORIES = ['Simple', 'Double', 'Twin', 'Triple', 'Quadruple', 'Queen', 'King'];
const CAPACITES = { Simple: 1, Double: 2, Twin: 2, Queen: 2, King: 2, Triple: 3, Quadruple: 4 };

const libellesStatut = {
  disponible: 'Disponible',
  occupe: 'Occupée',
  en_nettoyage: 'En nettoyage',
  maintenance: 'Hors service',
};

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

onMounted(() => {
  store.fetchChambres();
  reservationsStore.fetchReservations(); // NOUVEAU
});

const compteParCategorie = computed(() => {
  const compte = {};
  for (const c of store.chambres) {
    compte[c.typeLit] = (compte[c.typeLit] || 0) + 1;
  }
  return compte;
});

const chambresFiltrees = computed(() => {
  let liste = store.chambres;
  if (categorieActive.value !== 'Toutes') {
    liste = liste.filter((c) => c.typeLit === categorieActive.value);
  }
  if (recherche.value.trim()) {
    const terme = recherche.value.trim().toLowerCase();
    liste = liste.filter((c) => c.numero.toLowerCase().includes(terme));
  }
  return liste;
});

// NOUVEAU — associe chaque chambre._id à sa réservation active (check-in effectué),
// c'est le seul statutReservation qui correspond réellement à statutActuel === 'occupe'.
const occupationParChambre = computed(() => {
  const map = {};
  for (const r of reservationsStore.reservations) {
    if (r.statutReservation !== 'check_in_fait') continue;
    const chambreId = r.chambre?._id || r.chambre;
    if (!chambreId) continue;
    map[chambreId] = {
      client: [r.client?.nom, r.client?.prenom].filter(Boolean).join(' ') || 'Client inconnu',
      dateArrivee: r.dateArrivee,
      dateDepart: r.dateDepart,
    };
  }
  return map;
});

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}

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
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;700&display=swap');

.page-chambres {
  --ink: #1c1b1a;
  --paper: #f7f4ef;
  --brand: #0f5c4e;
  --brand-dark: #0a4238;
  --brass: #a9762f;
  --ligne: #e4e0d6;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}

/* ── En-tête ─────────────────────────────────────────────── */
.entete {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--ligne);
}
.entete-marque {
  margin: 0 0 0.15rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--brand);
}
.entete-titre h1 {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-size: 2rem;
  font-weight: 600;
  color: var(--ink);
}
.mention-lecture-seule {
  margin: -0.75rem 0 1.5rem;
  font-size: 0.9rem;
  color: #8a8578;
}

/* ── Boutons ─────────────────────────────────────────────── */
.btn-principal {
  padding: 0.6rem 1.15rem;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-principal:hover {
  background: var(--brand-dark);
}
.btn-discret {
  padding: 0.6rem 1.15rem;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--ligne);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

/* ── Formulaire ──────────────────────────────────────────── */
.panneau-formulaire {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.75rem;
}
.panneau-formulaire h2 {
  margin: 0 0 1.25rem;
  font-family: 'Fraunces', serif;
  font-size: 1.3rem;
  font-weight: 600;
}
.ligne-champs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.champ {
  flex: 1;
  margin-bottom: 1rem;
}
.ligne-champs .champ {
  margin-bottom: 0;
}
.champ-etroit {
  flex: 0 0 110px;
}
.champ-large {
  flex: 2;
}
.champ label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b6656;
}
.champ input,
.champ select,
.champ textarea {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--ligne);
  border-radius: 7px;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  color: var(--ink);
}
.champ input:focus,
.champ select:focus,
.champ textarea:focus {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
}
.actions-formulaire {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}
.message-erreur {
  margin-top: 0.75rem;
  color: #b5502f;
  font-size: 0.85rem;
}

/* ── Filtres ─────────────────────────────────────────────── */
.barre-filtres {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.pastilles-categories {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.pastille {
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--ligne);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  font-size: 0.82rem;
  font-family: inherit;
  transition: all 0.15s ease;
}
.pastille .compteur {
  color: #9c9788;
  font-variant-numeric: tabular-nums;
}
.pastille.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.pastille.active .compteur {
  color: #d6ece7;
}
.champ-recherche {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  min-width: 240px;
  background: #fff;
}
.champ-recherche:focus {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
}

/* ── Grille de cartes ────────────────────────────────────── */
.grille-chambres {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.9rem;
}
.carte-chambre {
  background: #fff;
  border: 1px solid var(--ligne);
  border-left: 3px solid transparent;
  border-radius: 10px;
  padding: 1rem 1.1rem;
}
.carte-chambre.statut-disponible {
  border-left-color: #1f8a5f;
}
.carte-chambre.statut-occupe {
  border-left-color: #b5502f;
}
.carte-chambre.statut-en_nettoyage {
  border-left-color: #b8860b;
}
.carte-chambre.statut-maintenance {
  border-left-color: #8a8578;
}

.carte-entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.carte-numero {
  font-family: 'Fraunces', serif;
  font-size: 1.4rem;
  font-weight: 600;
}

.pastille-statut {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.point-statut {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.pastille-disponible {
  background: #e4f5ec;
  color: #157a4f;
}
.pastille-disponible .point-statut {
  background: #1f8a5f;
}
.pastille-occupe {
  background: #fbeae2;
  color: #a04324;
}
.pastille-occupe .point-statut {
  background: #b5502f;
}
.pastille-en_nettoyage {
  background: #fdf3d9;
  color: #8a6a08;
}
.pastille-en_nettoyage .point-statut {
  background: #b8860b;
}
.pastille-maintenance {
  background: #eeece5;
  color: #6b6656;
}
.pastille-maintenance .point-statut {
  background: #8a8578;
}

.carte-type {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: #6b6656;
}
.badge-special {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #f1e9f9;
  color: #6d28d9;
}

.carte-details {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 0.6rem;
  border-top: 1px solid var(--ligne);
  font-size: 0.85rem;
  color: #6b6656;
}
.carte-prix {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 1rem;
  color: var(--brass);
}
.carte-prix small {
  font-weight: 500;
  font-size: 0.7rem;
  color: #9c9788;
}

/* ── NOUVEAU : bloc occupation ─────────────────────────────── */
.bloc-occupation {
  margin-top: 0.6rem;
  padding: 0.55rem 0.65rem;
  background: #fbeae2;
  border-radius: 7px;
  border-left: 2px solid #b5502f;
}
.occupation-client {
  margin: 0 0 0.15rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #7a3319;
}
.occupation-dates {
  margin: 0;
  font-size: 0.78rem;
  color: #a0532f;
  font-variant-numeric: tabular-nums;
}
.occupation-inconnue {
  margin: 0;
  font-size: 0.78rem;
  font-style: italic;
  color: #a0532f;
}

.carte-pied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ligne);
}
.select-statut {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--ligne);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.78rem;
  background: #fff;
  color: var(--ink);
}
.carte-actions {
  display: flex;
  gap: 0.3rem;
}
.btn-icone {
  width: 28px;
  height: 28px;
  border: 1px solid var(--ligne);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-icone:hover {
  background: #f2f0ea;
}
.btn-icone-danger:hover {
  background: #fbeae2;
  border-color: #b5502f;
  color: #b5502f;
}

.etat-vide {
  padding: 2.5rem 0;
  text-align: center;
  color: #9c9788;
}

@media (max-width: 640px) {
  .entete {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .barre-filtres {
    flex-direction: column;
    align-items: stretch;
  }
  .champ-recherche {
    min-width: 0;
  }
  .ligne-champs {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
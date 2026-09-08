<template>
  <div class="page-calendrier">
    <!-- ── En-tête ────────────────────────────────────────────── -->
    <header class="entete">
      <div class="entete-titre">
        <p class="entete-marque">Tsara Trace</p>
        <h1>Calendrier de disponibilité</h1>
      </div>
      <div class="navigation-mois">
        <button class="btn-discret" type="button" @click="allerAujourdhui">Aujourd'hui</button>
        <button class="btn-icone" type="button" @click="moisPrecedent" aria-label="Mois précédent">‹</button>
        <input
          class="champ-mois"
          type="month"
          :value="valeurInputMois"
          @change="onChangeMois($event.target.value)"
        />
        <button class="btn-icone" type="button" @click="moisSuivant" aria-label="Mois suivant">›</button>
      </div>
    </header>

    <!-- ── Filtres + légende ──────────────────────────────────── -->
    <div class="barre-filtres">
      <div class="pastilles-categories">
        <button
          class="pastille"
          :class="{ active: categorieActive === 'Toutes' }"
          @click="categorieActive = 'Toutes'"
        >
          Toutes <span class="compteur">{{ chambres.length }}</span>
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

      <div class="legende">
        <span class="legende-item"><i class="pastille-legende cellule-disponible"></i> Disponible</span>
        <span class="legende-item"><i class="pastille-legende cellule-reservee"></i> Confirmée</span>
        <span class="legende-item"><i class="pastille-legende cellule-attente"></i> Paiement en attente</span>
        <span class="legende-item"><i class="pastille-legende cellule-occupee"></i> En cours de séjour</span>
        <span class="legende-item"><i class="pastille-legende cellule-verrou"></i> Bloquée (panier)</span>
        <span class="legende-item"><i class="pastille-legende cellule-hors_service"></i> Hors service</span>
      </div>
    </div>

    <p class="astuce">Cliquez sur une case libre, ou cliquez-glissez sur plusieurs jours, pour créer une réservation directement depuis la grille.</p>

    <!-- ── États de chargement / erreur ───────────────────────── -->
    <p v-if="loading" class="hint">Chargement du calendrier…</p>
    <p v-else-if="erreur" class="message-erreur">{{ erreur }}</p>

    <!-- ── Grille chambres × jours ─────────────────────────────── -->
    <div v-else class="grille-scroll">
      <table class="grille-calendrier" @mouseleave="dragging = false">
        <thead>
          <tr>
            <th class="colonne-chambre">Chambre</th>
            <th
              v-for="(jour, idx) in jours"
              :key="idx"
              :class="{ 'colonne-weekend': estWeekend(jour), 'colonne-aujourdhui': estAujourdhui(jour) }"
            >
              <span class="jour-num">{{ jour.getDate() }}</span>
              <span class="jour-dow">{{ nomJourCourt(jour) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="chambre in chambresFiltrees" :key="chambre._id">
            <td class="colonne-chambre">
              <strong>{{ chambre.numero }}</strong>
              <span class="type-chambre">{{ chambre.typeLit }}</span>
            </td>
            <td
              v-for="(jour, idx) in jours"
              :key="idx"
              class="cellule"
              :class="classesCellule(chambre, idx)"
              :title="titreCellule(chambre, idx)"
              @mousedown.prevent="demarrerSelection(chambre, idx)"
              @mouseenter="etendreSelection(chambre, idx)"
              @click="cliquerCellule(chambre, idx)"
            ></td>
          </tr>
          <tr v-if="!chambresFiltrees.length">
            <td :colspan="jours.length + 1" class="aucune-chambre">Aucune chambre dans cette catégorie.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Panneau détail (clic sur une case occupée / bloquée) ─── -->
    <div class="panneau-detail" v-if="detail">
      <button class="bouton-fermer" type="button" @click="detail = null" aria-label="Fermer">✕</button>
      <h3>Chambre {{ detail.chambre.numero }} — {{ formatDate(detail.jour) }}</h3>
      <p>{{ detail.texte }}</p>
    </div>

    <!-- ── Modale de création rapide de réservation ────────────── -->
    <div class="voile-calendrier" v-if="modaleOuverte" @click.self="fermerModale">
      <div class="panneau-quick-reservation">
        <header class="entete-modale">
          <h3>Nouvelle réservation — Chambre {{ chambreSelectionnee?.numero }}</h3>
          <button class="bouton-fermer" type="button" @click="fermerModale" aria-label="Fermer">✕</button>
        </header>

        <div class="ligne-champs">
          <div class="champ">
            <label>Date d'arrivée</label>
            <input v-model="formReservation.dateArrivee" type="date" required />
          </div>
          <div class="champ">
            <label>Date de départ</label>
            <input v-model="formReservation.dateDepart" type="date" required />
          </div>
        </div>

        <fieldset class="section">
          <legend>Client</legend>

          <div class="bascule-client">
            <button
              type="button"
              class="pastille"
              :class="{ active: !modeNouveauClient }"
              @click="modeNouveauClient = false"
            >
              Client existant
            </button>
            <button
              type="button"
              class="pastille"
              :class="{ active: modeNouveauClient }"
              @click="modeNouveauClient = true"
            >
              + Nouveau client
            </button>
          </div>

          <div v-if="!modeNouveauClient">
            <input
              v-model.trim="rechercheClient"
              type="text"
              class="champ-recherche champ-pleine-largeur"
              placeholder="Rechercher par nom, téléphone ou CIN…"
            />
            <p v-if="chargementClients" class="hint">Chargement des clients…</p>
            <ul v-else class="liste-clients">
              <li
                v-for="c in clientsFiltres"
                :key="c._id"
                class="ligne-client"
                :class="{ selectionne: clientSelectionneId === c._id }"
                @click="clientSelectionneId = c._id"
              >
                <span>{{ c.prenom ? c.prenom + ' ' : '' }}{{ c.nom }}</span>
                <span class="hint">{{ c.telephone }}</span>
              </li>
              <li v-if="!clientsFiltres.length" class="hint aucun-resultat">Aucun client trouvé.</li>
            </ul>
          </div>

          <div v-else class="ligne-champs">
            <div class="champ">
              <label>Nom complet</label>
              <input v-model.trim="nouveauClient.nom" type="text" required />
            </div>
            <div class="champ">
              <label>Téléphone</label>
              <input v-model.trim="nouveauClient.telephone" type="tel" required />
            </div>
            <div class="champ">
              <label>CIN (optionnel)</label>
              <input v-model.trim="nouveauClient.cin" type="text" />
            </div>
          </div>
        </fieldset>

        <div class="ligne-champs">
          <div class="champ champ-etroit">
            <label>Adultes</label>
            <input v-model.number="formReservation.nombreAdultes" type="number" min="1" required />
          </div>
          <div class="champ champ-etroit">
            <label>Enfants</label>
            <input v-model.number="formReservation.nombreEnfants" type="number" min="0" />
          </div>
          <div class="champ champ-large">
            <label>Préférences (optionnel)</label>
            <input v-model.trim="formReservation.preferences" type="text" placeholder="Ex : étage élevé" />
          </div>
        </div>

        <p v-if="erreurModale" class="message-erreur">{{ erreurModale }}</p>

        <div class="actions-formulaire">
          <button class="btn-principal" type="button" :disabled="soumissionEnCours" @click="soumettreReservation">
            {{ soumissionEnCours ? 'Création…' : 'Créer la réservation' }}
          </button>
          <button class="btn-discret" type="button" @click="fermerModale">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { chambreService, clientService, disponibiliteService } from '../services/api';
import { useReservationsStore } from '../stores/reservations';

const CATEGORIES = ['Simple', 'Double', 'Twin', 'Triple', 'Quadruple', 'Queen', 'King'];
const PRECEDENCE = { hors_service: 5, occupee: 4, reservee: 3, attente: 2, verrou: 1, disponible: 0 };
const STATUT_RESA_VERS_CELLULE = { check_in_fait: 'occupee', confirmee: 'reservee', en_attente_paiement: 'attente' };

const reservationsStore = useReservationsStore();

// ── État général ───────────────────────────────────────────────
const monthDate = ref(debutDuMois(new Date()));
const categorieActive = ref('Toutes');
const chambres = ref([]);
const disponibilite = ref([]);
const loading = ref(true);
const erreur = ref('');

// ── Sélection au clic-glisser ───────────────────────────────────
const dragging = ref(false);
const dragChambreId = ref(null);
const dragStartIdx = ref(null);
const dragEndIdx = ref(null);
const confirmedSelection = ref(null); // { chambreId, startIdx, endIdx } — reste affichée pendant la modale

// ── Panneau détail (case occupée/bloquée) ───────────────────────
const detail = ref(null);

// ── Modale de création rapide ────────────────────────────────────
const modaleOuverte = ref(false);
const chambreSelectionnee = ref(null);
const formReservation = reactive({ dateArrivee: '', dateDepart: '', nombreAdultes: 1, nombreEnfants: 0, preferences: '' });
const clients = ref([]);
const clientsCharges = ref(false);
const chargementClients = ref(false);
const rechercheClient = ref('');
const clientSelectionneId = ref('');
const modeNouveauClient = ref(false);
const nouveauClient = reactive({ nom: '', telephone: '', cin: '' });
const soumissionEnCours = ref(false);
const erreurModale = ref('');

// ── Helpers dates ────────────────────────────────────────────────
function debutDuMois(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function pad(n) {
  return String(n).padStart(2, '0');
}
function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function dansPeriode(jour, debut, fin) {
  const j = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate()).getTime();
  const dt = new Date(debut);
  const ft = new Date(fin);
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const f = new Date(ft.getFullYear(), ft.getMonth(), ft.getDate()).getTime();
  return j >= d && j < f;
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}

// ── Colonnes du mois affiché ─────────────────────────────────────
const jours = computed(() => {
  const y = monthDate.value.getFullYear();
  const m = monthDate.value.getMonth();
  const nbJours = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: nbJours }, (_, i) => new Date(y, m, i + 1));
});

const valeurInputMois = computed(() => `${monthDate.value.getFullYear()}-${pad(monthDate.value.getMonth() + 1)}`);

function moisPrecedent() {
  monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() - 1, 1);
}
function moisSuivant() {
  monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + 1, 1);
}
function allerAujourdhui() {
  monthDate.value = debutDuMois(new Date());
}
function onChangeMois(valeur) {
  const [y, m] = valeur.split('-').map(Number);
  if (y && m) monthDate.value = new Date(y, m - 1, 1);
}
function estWeekend(jour) {
  const j = jour.getDay();
  return j === 0 || j === 6;
}
function estAujourdhui(jour) {
  const now = new Date();
  return jour.getFullYear() === now.getFullYear() && jour.getMonth() === now.getMonth() && jour.getDate() === now.getDate();
}
function nomJourCourt(jour) {
  return jour.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2);
}

// ── Chambres filtrées + compteur par catégorie (comme Chambres.vue) ─
const compteParCategorie = computed(() => {
  const compte = {};
  chambres.value.forEach((c) => {
    compte[c.typeLit] = (compte[c.typeLit] || 0) + 1;
  });
  return compte;
});
const chambresFiltrees = computed(() => {
  if (categorieActive.value === 'Toutes') return chambres.value;
  return chambres.value.filter((c) => c.typeLit === categorieActive.value);
});

// ── Construction de la grille de statuts (chambreId -> [{statut, info}]) ─
const grille = computed(() => {
  const map = new Map();
  const totalJours = jours.value.length;

  chambres.value.forEach((c) => {
    map.set(c._id, Array.from({ length: totalJours }, () => ({ statut: 'disponible', info: null })));
  });

  // Hors service (issu directement du catalogue des chambres)
  chambres.value.forEach((c) => {
    const arr = map.get(c._id);
    (c.datesHorsService || []).forEach((periode) => {
      jours.value.forEach((jour, idx) => {
        if (dansPeriode(jour, periode.dateDebut, periode.dateFin)) {
          arr[idx] = { statut: 'hors_service', info: { raison: periode.raison } };
        }
      });
    });
  });

  // Réservations et verrous (issus de /api/disponibilite)
  disponibilite.value.forEach((item) => {
    const arr = map.get(item.chambre._id);
    if (!arr) return;

    (item.verrousActifs || []).forEach((v) => {
      jours.value.forEach((jour, idx) => {
        if (dansPeriode(jour, v.dateArrivee, v.dateDepart) && PRECEDENCE.verrou >= PRECEDENCE[arr[idx].statut]) {
          arr[idx] = { statut: 'verrou', info: { expireAt: v.expireAt } };
        }
      });
    });

    (item.periodesOccupees || []).forEach((p) => {
      const statutCellule = STATUT_RESA_VERS_CELLULE[p.statutReservation] || 'reservee';
      jours.value.forEach((jour, idx) => {
        if (dansPeriode(jour, p.dateArrivee, p.dateDepart) && PRECEDENCE[statutCellule] >= PRECEDENCE[arr[idx].statut]) {
          arr[idx] = { statut: statutCellule, info: { client: p.client, statutReservation: p.statutReservation } };
        }
      });
    });
  });

  return map;
});

function infoCellule(chambre, idx) {
  return grille.value.get(chambre._id)?.[idx] || { statut: 'disponible', info: null };
}

function classesCellule(chambre, idx) {
  const { statut } = infoCellule(chambre, idx);
  const classes = [`cellule-${statut}`];

  const enCoursDeGlisse = dragging.value && dragChambreId.value === chambre._id;
  const selectionConfirmee = confirmedSelection.value && confirmedSelection.value.chambreId === chambre._id;

  if (enCoursDeGlisse) {
    const [min, max] = [Math.min(dragStartIdx.value, dragEndIdx.value), Math.max(dragStartIdx.value, dragEndIdx.value)];
    if (idx >= min && idx <= max) classes.push('cellule-selection');
  } else if (selectionConfirmee) {
    const { startIdx, endIdx } = confirmedSelection.value;
    if (idx >= startIdx && idx <= endIdx) classes.push('cellule-selection');
  }
  return classes;
}

const LIBELLE_STATUT_RESA = {
  check_in_fait: 'en cours de séjour',
  confirmee: 'confirmée',
  en_attente_paiement: 'paiement en attente',
};

function titreCellule(chambre, idx) {
  const { statut, info } = infoCellule(chambre, idx);
  if (statut === 'disponible') return 'Disponible — cliquer ou glisser pour réserver';
  if (statut === 'hors_service') return `Hors service — ${info.raison}`;
  if (statut === 'verrou') return 'Bloquée temporairement — une autre réservation est en cours de finalisation';
  return `${info.client} — ${LIBELLE_STATUT_RESA[info.statutReservation] || info.statutReservation}`;
}

// ── Sélection au clic / glisser ──────────────────────────────────
function demarrerSelection(chambre, idx) {
  const { statut } = infoCellule(chambre, idx);
  if (statut !== 'disponible') return;
  dragging.value = true;
  dragChambreId.value = chambre._id;
  dragStartIdx.value = idx;
  dragEndIdx.value = idx;
}

function etendreSelection(chambre, idx) {
  if (!dragging.value || dragChambreId.value !== chambre._id) return;
  const min = Math.min(dragStartIdx.value, idx);
  const max = Math.max(dragStartIdx.value, idx);
  for (let i = min; i <= max; i++) {
    if (infoCellule(chambre, i).statut !== 'disponible') return; // n'étend pas sur une case déjà occupée
  }
  dragEndIdx.value = idx;
}

function terminerSelection() {
  if (!dragging.value) return;
  dragging.value = false;
  const chambreId = dragChambreId.value;
  const startIdx = Math.min(dragStartIdx.value, dragEndIdx.value);
  const endIdx = Math.max(dragStartIdx.value, dragEndIdx.value);
  dragChambreId.value = null;
  dragStartIdx.value = null;
  dragEndIdx.value = null;

  const chambre = chambres.value.find((c) => c._id === chambreId);
  if (!chambre) return;

  confirmedSelection.value = { chambreId, startIdx, endIdx };
  ouvrirModaleCreation(chambre, startIdx, endIdx);
}

function cliquerCellule(chambre, idx) {
  const { statut, info } = infoCellule(chambre, idx);
  if (statut === 'disponible') return; // déjà géré par mousedown/mouseup
  const jour = jours.value[idx];
  let texte;
  if (statut === 'hors_service') texte = `Hors service — ${info.raison}`;
  else if (statut === 'verrou') texte = 'Chambre bloquée temporairement pendant qu\'un autre client finalise sa réservation.';
  else texte = `${info.client} — statut : ${LIBELLE_STATUT_RESA[info.statutReservation] || info.statutReservation}`;
  detail.value = { chambre, jour, texte };
}

function ouvrirModaleCreation(chambre, startIdx, endIdx) {
  chambreSelectionnee.value = chambre;
  const nuits = endIdx - startIdx + 1;
  formReservation.dateArrivee = isoDate(jours.value[startIdx]);
  formReservation.dateDepart = isoDate(addDays(jours.value[startIdx], nuits));
  formReservation.nombreAdultes = 1;
  formReservation.nombreEnfants = 0;
  formReservation.preferences = '';
  rechercheClient.value = '';
  clientSelectionneId.value = '';
  modeNouveauClient.value = clients.value.length === 0;
  nouveauClient.nom = '';
  nouveauClient.telephone = '';
  nouveauClient.cin = '';
  erreurModale.value = '';
  modaleOuverte.value = true;
  if (!clientsCharges.value) chargerClients();
}

function fermerModale() {
  modaleOuverte.value = false;
  confirmedSelection.value = null;
  chambreSelectionnee.value = null;
}

// ── Clients ────────────────────────────────────────────────────
async function chargerClients() {
  chargementClients.value = true;
  try {
    const { data } = await clientService.getAll();
    clients.value = data.data;
    clientsCharges.value = true;
  } catch (err) {
    erreurModale.value = err.response?.data?.message || err.message;
  } finally {
    chargementClients.value = false;
  }
}
const clientsFiltres = computed(() => {
  const q = rechercheClient.value.toLowerCase();
  if (!q) return clients.value;
  return clients.value.filter((c) =>
    `${c.nom} ${c.prenom || ''} ${c.telephone} ${c.cin || ''}`.toLowerCase().includes(q)
  );
});

// ── Soumission de la réservation ─────────────────────────────────
async function soumettreReservation() {
  erreurModale.value = '';

  let clientId = clientSelectionneId.value;
  if (modeNouveauClient.value) {
    if (!nouveauClient.nom || !nouveauClient.telephone) {
      erreurModale.value = 'Nom complet et téléphone requis pour créer un client.';
      return;
    }
    try {
      const { data } = await clientService.create({ ...nouveauClient });
      clientId = data.data._id;
    } catch (err) {
      erreurModale.value = err.response?.data?.message || err.message;
      return;
    }
  } else if (!clientId) {
    erreurModale.value = 'Sélectionnez un client existant ou créez-en un nouveau.';
    return;
  }

  soumissionEnCours.value = true;
  const resultat = await reservationsStore.creerReservation({
    client: clientId,
    chambre: chambreSelectionnee.value._id,
    dateArrivee: formReservation.dateArrivee,
    dateDepart: formReservation.dateDepart,
    nombreAdultes: formReservation.nombreAdultes,
    nombreEnfants: formReservation.nombreEnfants,
    preferences: formReservation.preferences,
    statutReservation: 'confirmee',
  });
  soumissionEnCours.value = false;

  if (!resultat.success) {
    erreurModale.value = resultat.message;
    return;
  }
  fermerModale();
  await chargerDonnees();
}

// ── Chargement des données ────────────────────────────────────────
async function chargerDonnees() {
  loading.value = true;
  erreur.value = '';
  try {
    const debut = jours.value[0] || new Date(monthDate.value.getFullYear(), monthDate.value.getMonth(), 1);
    const fin = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + 1, 0);
    const [reponseChambres, reponseDispo] = await Promise.all([
      chambreService.getAll(),
      disponibiliteService.get(isoDate(debut), isoDate(fin)),
    ]);
    chambres.value = reponseChambres.data.data;
    disponibilite.value = reponseDispo.data.data;
  } catch (err) {
    erreur.value = err.response?.data?.message || err.message;
  } finally {
    loading.value = false;
  }
}

watch(monthDate, chargerDonnees);

onMounted(() => {
  chargerDonnees();
  window.addEventListener('mouseup', terminerSelection);
});
onUnmounted(() => {
  window.removeEventListener('mouseup', terminerSelection);
});
</script>

<style scoped>
.page-calendrier {
  font-family: var(--font-sans);
  color: var(--ink);
}

/* ── En-tête ─────────────────────────────────────────────── */
.entete {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--ligne);
  flex-wrap: wrap;
  gap: 1rem;
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
  font-size: 1.8rem;
  font-weight: 600;
}
.navigation-mois {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-icone {
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid var(--ligne);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}
.btn-icone:hover {
  background: var(--brand-light);
}
.champ-mois {
  padding: 0.5rem 0.7rem;
}

/* ── Filtres + légende ──────────────────────────────────────── */
.barre-filtres {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
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
.legende {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  font-size: 0.78rem;
  color: var(--muted);
}
.legende-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.pastille-legende {
  display: inline-block;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 3px;
  border: 1px solid var(--ligne);
}
.astuce {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.hint {
  color: var(--muted);
  font-size: 0.9rem;
}
.message-erreur {
  color: var(--danger);
  font-size: 0.9rem;
}

/* ── Grille ──────────────────────────────────────────────── */
.grille-scroll {
  overflow: auto;
  max-height: 70vh;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  background: #fff;
  user-select: none;
}
.grille-calendrier {
  border-collapse: collapse;
  font-size: 0.76rem;
  width: max-content;
}
.grille-calendrier th,
.grille-calendrier td {
  border-right: 1px solid var(--ligne);
  border-bottom: 1px solid var(--ligne);
}
thead th {
  position: sticky;
  top: 0;
  background: var(--paper);
  z-index: 2;
  padding: 0.3rem 0.1rem;
  font-weight: 600;
  min-width: 36px;
  text-align: center;
}
.jour-num {
  display: block;
  font-size: 0.82rem;
}
.jour-dow {
  display: block;
  font-size: 0.62rem;
  color: var(--muted);
  text-transform: uppercase;
}
.colonne-weekend {
  background: #f2efe6;
}
.colonne-aujourdhui {
  box-shadow: inset 0 -2px 0 var(--brass);
}
.colonne-chambre {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 3;
  text-align: left;
  padding: 0.4rem 0.75rem;
  min-width: 130px;
  border-right: 1px solid var(--ligne) !important;
}
thead th.colonne-chambre {
  z-index: 4;
  background: var(--paper);
}
.type-chambre {
  display: block;
  font-size: 0.72rem;
  color: var(--muted);
}
.cellule {
  height: 32px;
  min-width: 36px;
  cursor: pointer;
}
.cellule-disponible {
  background: #fff;
}
.cellule-disponible:hover {
  background: var(--brand-light);
}
.cellule-occupee {
  background: var(--danger-bg);
}
.cellule-reservee {
  background: var(--brass-light);
}
.cellule-attente {
  background: repeating-linear-gradient(45deg, #fdf3da, #fdf3da 5px, #f7ecd4 5px, #f7ecd4 10px);
}
.cellule-hors_service {
  background: repeating-linear-gradient(45deg, #ece9e0, #ece9e0 5px, #e3ded1 5px, #e3ded1 10px);
  cursor: not-allowed;
}
.cellule-verrou {
  background: repeating-linear-gradient(45deg, #fff, #fff 4px, #e8d9b5 4px, #e8d9b5 8px);
  opacity: 0.85;
}
.cellule-selection {
  outline: 2px solid var(--brand);
  outline-offset: -2px;
  background: var(--brand-light) !important;
}
.aucune-chambre {
  padding: 1.5rem;
  text-align: center;
  color: var(--muted);
}

/* ── Panneau détail ──────────────────────────────────────── */
.panneau-detail {
  position: relative;
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
}
.panneau-detail h3 {
  font-family: 'Fraunces', serif;
  font-size: 1rem;
  margin-bottom: 0.35rem;
}

/* ── Modale de création rapide ──────────────────────────────── */
.voile-calendrier {
  position: fixed;
  inset: 0;
  background: rgba(30, 31, 25, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}
.panneau-quick-reservation {
  background: #fff;
  border-radius: 14px;
  padding: 1.5rem;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
}
.entete-modale {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.1rem;
}
.entete-modale h3 {
  font-family: 'Fraunces', serif;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}
.bouton-fermer {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--muted);
}
.section {
  border: none;
  padding: 0;
  margin: 0 0 1rem;
}
.section legend {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding: 0;
}
.bascule-client {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.champ-recherche {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  background: #fff;
}
.champ-pleine-largeur {
  width: 100%;
  margin-bottom: 0.6rem;
}
.liste-clients {
  list-style: none;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--ligne);
  border-radius: 8px;
}
.ligne-client {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--ligne);
  font-size: 0.85rem;
}
.ligne-client:last-child {
  border-bottom: none;
}
.ligne-client:hover {
  background: var(--brand-light);
}
.ligne-client.selectionne {
  background: var(--brass-light);
}
.aucun-resultat {
  padding: 0.75rem;
  text-align: center;
}
.ligne-champs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.champ {
  flex: 1;
  min-width: 130px;
  margin-bottom: 0;
}
.champ label {
  display: block;
  font-size: 0.78rem;
  color: var(--muted);
  margin-bottom: 0.3rem;
}
.champ input {
  width: 100%;
}
.champ-etroit {
  flex: 0 0 90px;
}
.champ-large {
  flex: 2;
}
.actions-formulaire {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
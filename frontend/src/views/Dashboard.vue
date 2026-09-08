<template>
  <div class="page-dashboard">
    <header class="entete">
      <div>
        <p class="entete-marque">Tsara Trace</p>
        <h1>Tableau de bord</h1>
      </div>
      <div class="navigation-mois">
        <button class="btn-discret" type="button" @click="allerAujourdhui">Mois actuel</button>
        <button class="btn-icone" type="button" @click="moisPrecedent" aria-label="Mois précédent">‹</button>
        <input class="champ-mois" type="month" :value="valeurInputMois" @change="onChangeMois($event.target.value)" />
        <button class="btn-icone" type="button" @click="moisSuivant" aria-label="Mois suivant">›</button>
      </div>
    </header>

    <p v-if="erreur" class="message-erreur">{{ erreur }}</p>

    <div class="stats-grid">
      <div class="carte-stat" v-for="i in 4" :key="i" v-if="loading">
        <p class="stat-label">Chargement…</p>
        <p class="stat-value">—</p>
      </div>
      <template v-else>
        <div class="carte-stat">
          <p class="stat-label">Taux d'occupation</p>
          <p class="stat-value">{{ stats.tauxOccupation ?? '—' }}%</p>
        </div>
        <div class="carte-stat">
          <p class="stat-label">Chiffre d'affaires</p>
          <p class="stat-value">{{ (stats.chiffreAffaires ?? 0).toLocaleString('fr-FR') }} Ar</p>
        </div>
        <div class="carte-stat">
          <p class="stat-label">Réservations</p>
          <p class="stat-value">{{ stats.nombreReservations ?? 0 }}</p>
        </div>
        <div class="carte-stat">
          <p class="stat-label">Chambres au total</p>
          <p class="stat-value">{{ stats.totalChambres ?? 0 }}</p>
        </div>
      </template>
    </div>

    <!-- ── Arrivées / départs du jour ─────────────────────────── -->
    <div class="grille-mouvements">
      <div class="carte">
        <h3>Arrivées aujourd'hui</h3>
        <p class="carte-sous-titre">{{ formatDateDuJour }}</p>
        <p v-if="chargementMouvements" class="hint">Chargement…</p>
        <ul v-else-if="arriveesDuJour.length" class="liste-mouvements">
          <li v-for="r in arriveesDuJour" :key="r._id">
            <span class="chambre-mouvement">Ch. {{ r.chambre?.numero }}</span>
            <span class="client-mouvement">{{ nomClient(r.client) }}</span>
            <span class="badge" :class="badgeStatutReservation(r.statutReservation)">{{ r.statut }}</span>
          </li>
        </ul>
        <p v-else class="hint">Aucune arrivée prévue aujourd'hui.</p>
      </div>

      <div class="carte">
        <h3>Départs aujourd'hui</h3>
        <p class="carte-sous-titre">{{ formatDateDuJour }}</p>
        <p v-if="chargementMouvements" class="hint">Chargement…</p>
        <ul v-else-if="departsDuJour.length" class="liste-mouvements">
          <li v-for="r in departsDuJour" :key="r._id">
            <span class="chambre-mouvement">Ch. {{ r.chambre?.numero }}</span>
            <span class="client-mouvement">{{ nomClient(r.client) }}</span>
            <span class="badge" :class="r.statutReservation === 'check_out_fait' ? 'badge-disponible' : 'badge-nettoyage'">
              {{ r.statutReservation === 'check_out_fait' ? 'Parti' : 'À faire' }}
            </span>
          </li>
        </ul>
        <p v-else class="hint">Aucun départ prévu aujourd'hui.</p>
      </div>
    </div>

    <div class="grille-graphiques">
      <div class="carte">
        <h3>Évolution du chiffre d'affaires</h3>
        <p class="carte-sous-titre">6 derniers mois</p>
        <Line v-if="chartData" :data="chartData" :options="lineOptions" />
      </div>

      <div class="carte">
        <h3>Répartition des chambres</h3>
        <p class="carte-sous-titre">État actuel du parc</p>
        <Doughnut v-if="repartitionData" :data="repartitionData" :options="doughnutOptions" />
        <ul v-if="repartition.length" class="legende-repartition">
          <li v-for="(item, i) in repartition" :key="item._id">
            <span class="pastille-legende" :style="{ background: COULEURS_CHAMBRES[i % COULEURS_CHAMBRES.length] }"></span>
            {{ item._id }} <strong>{{ item.total }}</strong>
          </li>
        </ul>
      </div>

      <div class="carte">
        <h3>Statut des paiements</h3>
        <p class="carte-sous-titre">Réservations du mois affiché</p>
        <Doughnut v-if="paiementsData" :data="paiementsData" :options="doughnutOptions" />
        <ul v-if="paiements.length" class="legende-repartition">
          <li v-for="(item, i) in paiements" :key="item.statut">
            <span class="pastille-legende" :style="{ background: COULEURS_PAIEMENTS[item.statut] || '#8a8578' }"></span>
            {{ item.statut }} <strong>{{ item.total }}</strong>
            <span v-if="item.soldeRestant > 0" class="solde-restant">
              ({{ item.soldeRestant.toLocaleString('fr-FR') }} Ar restants)
            </span>
          </li>
        </ul>
        <p v-else-if="!loading" class="hint">Aucune réservation ce mois-ci.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { Line, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { statsService, reservationService } from '../services/api';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale
);

const COULEURS_CHAMBRES = ['#0f5c4e', '#a9762f', '#b5502f', '#8a8578'];
const COULEURS_PAIEMENTS = { 'Non payé': '#a23b2e', Partiel: '#b8923f', Payé: '#0f5c4e', Remboursé: '#8a8578' };

// ── Mois consulté ────────────────────────────────────────────────
function debutDuMois(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function pad(n) {
  return String(n).padStart(2, '0');
}
const monthDate = ref(debutDuMois(new Date()));
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

// ── États ──────────────────────────────────────────────────────
const loading = ref(true);
const erreur = ref('');
const stats = ref({});
const evolution = ref([]);
const repartition = ref([]);
const paiements = ref([]);

const chargementMouvements = ref(true);
const arriveesDuJour = ref([]);
const departsDuJour = ref([]);

const formatDateDuJour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

function nomClient(client) {
  if (!client) return 'N/A';
  return `${client.prenom ? client.prenom + ' ' : ''}${client.nom}`;
}
function badgeStatutReservation(statutReservation) {
  return { check_in_fait: 'badge-occupee', confirmee: 'badge-disponible', en_attente_paiement: 'badge-nettoyage' }[
    statutReservation
  ];
}

// ── Graphiques ─────────────────────────────────────────────────
const chartData = computed(() => {
  if (!evolution.value.length) return null;
  return {
    labels: evolution.value.map((e) => `${e.mois}/${e.annee}`),
    datasets: [
      {
        label: "Chiffre d'affaires (Ar)",
        data: evolution.value.map((e) => e.chiffreAffaires),
        borderColor: '#0f5c4e',
        backgroundColor: 'rgba(15, 92, 78, 0.12)',
        tension: 0.3,
        fill: true,
      },
    ],
  };
});

const repartitionData = computed(() => {
  if (!repartition.value.length) return null;
  return {
    labels: repartition.value.map((r) => r._id),
    datasets: [{ data: repartition.value.map((r) => r.total), backgroundColor: COULEURS_CHAMBRES, borderWidth: 0 }],
  };
});

const paiementsData = computed(() => {
  if (!paiements.value.length) return null;
  return {
    labels: paiements.value.map((p) => p.statut),
    datasets: [
      {
        data: paiements.value.map((p) => p.total),
        backgroundColor: paiements.value.map((p) => COULEURS_PAIEMENTS[p.statut] || '#8a8578'),
        borderWidth: 0,
      },
    ],
  };
});

const lineOptions = { responsive: true, plugins: { legend: { display: false } } };
const doughnutOptions = { responsive: true, plugins: { legend: { display: false } }, cutout: '65%' };

// ── Chargement des données du mois sélectionné ──────────────────
async function chargerStatsMois() {
  loading.value = true;
  erreur.value = '';
  try {
    const mois = monthDate.value.getMonth() + 1;
    const annee = monthDate.value.getFullYear();

    const [statsRes, repartitionRes, paiementsRes] = await Promise.all([
      statsService.getMensuel(mois, annee),
      statsService.getRepartitionChambres(),
      statsService.getRepartitionPaiements(mois, annee),
    ]);
    stats.value = statsRes.data.data;
    repartition.value = repartitionRes.data.data;
    paiements.value = paiementsRes.data.data;
  } catch (err) {
    erreur.value = err.response?.data?.message || err.message;
  } finally {
    loading.value = false;
  }
}

async function chargerMouvementsDuJour() {
  chargementMouvements.value = true;
  try {
    const { data } = await reservationService.getAll();
    const toutes = data.data;
    const aujourdhui = new Date();
    const estAujourdhui = (d) => {
      const dt = new Date(d);
      return (
        dt.getFullYear() === aujourdhui.getFullYear() &&
        dt.getMonth() === aujourdhui.getMonth() &&
        dt.getDate() === aujourdhui.getDate()
      );
    };
    arriveesDuJour.value = toutes.filter((r) => r.statutReservation !== 'annulee' && estAujourdhui(r.dateArrivee));
    departsDuJour.value = toutes.filter((r) => r.statutReservation !== 'annulee' && estAujourdhui(r.dateDepart));
  } catch (err) {
    // Widget secondaire : on n'écrase pas le message d'erreur principal des stats
  } finally {
    chargementMouvements.value = false;
  }
}

watch(monthDate, chargerStatsMois);

onMounted(async () => {
  chargerStatsMois();
  chargerMouvementsDuJour();
  const { data: evoRes } = await statsService.getEvolutionCA(6);
  evolution.value = evoRes.data;
});
</script>

<style scoped>
.page-dashboard {
  font-family: var(--font-sans);
}

.entete {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
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
.entete h1 {
  margin: 0;
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
.hint {
  color: var(--muted);
  font-size: 0.9rem;
}
.message-erreur {
  color: var(--danger);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.carte-stat {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
}
.stat-label {
  color: var(--muted);
  font-size: 0.85rem;
}
.stat-value {
  font-family: var(--font-serif);
  font-size: 1.9rem;
  font-weight: 600;
  margin-top: 0.25rem;
  color: var(--ink);
}

/* ── Arrivées / départs ──────────────────────────────────── */
.grille-mouvements {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}
.liste-mouvements {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.liste-mouvements li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.88rem;
}
.chambre-mouvement {
  font-weight: 600;
  min-width: 60px;
}
.client-mouvement {
  flex: 1;
  color: var(--ink);
}

.grille-graphiques {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 1.25rem;
}
.carte {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  padding: 1.25rem;
}
.carte h3 {
  font-size: 1.05rem;
  margin-bottom: 0.15rem;
}
.carte-sous-titre {
  color: var(--muted);
  font-size: 0.82rem;
  margin-bottom: 1rem;
  text-transform: capitalize;
}

.legende-repartition {
  list-style: none;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.legende-repartition li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.legende-repartition strong {
  margin-left: auto;
}
.solde-restant {
  width: 100%;
  margin-left: 1.35rem;
  color: var(--muted);
  font-size: 0.78rem;
}
.pastille-legende {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .grille-graphiques {
    grid-template-columns: 1fr;
  }
  .grille-mouvements {
    grid-template-columns: 1fr;
  }
}
</style>
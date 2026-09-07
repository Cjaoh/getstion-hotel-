<template>
  <div class="page-dashboard">
    <header class="entete">
      <p class="entete-marque">Tsara Trace</p>
      <h1>Tableau de bord</h1>
    </header>

    <div class="stats-grid">
      <div class="carte-stat">
        <p class="stat-label">Taux d'occupation (mois)</p>
        <p class="stat-value">{{ stats.tauxOccupation ?? '—' }}%</p>
      </div>
      <div class="carte-stat">
        <p class="stat-label">Chiffre d'affaires (mois)</p>
        <p class="stat-value">{{ (stats.chiffreAffaires ?? 0).toLocaleString('fr-FR') }} Ar</p>
      </div>
      <div class="carte-stat">
        <p class="stat-label">Réservations (mois)</p>
        <p class="stat-value">{{ stats.nombreReservations ?? 0 }}</p>
      </div>
      <div class="carte-stat">
        <p class="stat-label">Chambres au total</p>
        <p class="stat-value">{{ stats.totalChambres ?? 0 }}</p>
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
            <span class="pastille-legende" :style="{ background: COULEURS[i % COULEURS.length] }"></span>
            {{ item._id }} <strong>{{ item.total }}</strong>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
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
import { statsService } from '../services/api';

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

const COULEURS = ['#0f5c4e', '#a9762f', '#b5502f', '#8a8578'];

const stats = ref({});
const evolution = ref([]);
const repartition = ref([]);

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
    datasets: [
      {
        data: repartition.value.map((r) => r.total),
        backgroundColor: COULEURS,
        borderWidth: 0,
      },
    ],
  };
});

const lineOptions = { responsive: true, plugins: { legend: { display: false } } };
const doughnutOptions = { responsive: true, plugins: { legend: { display: false } }, cutout: '65%' };

onMounted(async () => {
  const { data: statsRes } = await statsService.getMensuel();
  stats.value = statsRes.data;

  const { data: evoRes } = await statsService.getEvolutionCA(6);
  evolution.value = evoRes.data;

  const { data: repRes } = await statsService.getRepartitionChambres();
  repartition.value = repRes.data;
});
</script>

<style scoped>
.page-dashboard {
  font-family: var(--font-sans);
}

.entete {
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

.grille-graphiques {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
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
}
.legende-repartition strong {
  margin-left: auto;
}
.pastille-legende {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

@media (max-width: 800px) {
  .grille-graphiques {
    grid-template-columns: 1fr;
  }
}
</style>
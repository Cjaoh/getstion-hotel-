<template>
  <div>
    <h2>Tableau de bord</h2>

    <div class="stats-grid">
      <div class="card stat-card">
        <p class="stat-label">Taux d'occupation (mois)</p>
        <p class="stat-value">{{ stats.tauxOccupation ?? '—' }}%</p>
      </div>
      <div class="card stat-card">
        <p class="stat-label">Chiffre d'affaires (mois)</p>
        <p class="stat-value">{{ stats.chiffreAffaires ?? 0 }} Ar</p>
      </div>
      <div class="card stat-card">
        <p class="stat-label">Réservations (mois)</p>
        <p class="stat-value">{{ stats.nombreReservations ?? 0 }}</p>
      </div>
      <div class="card stat-card">
        <p class="stat-label">Chambres au total</p>
        <p class="stat-value">{{ stats.totalChambres ?? 0 }}</p>
      </div>
    </div>

    <div class="card" style="margin-top: 1.5rem">
      <h3>Évolution du chiffre d'affaires (6 derniers mois)</h3>
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { statsService } from '../services/api';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale);

const stats = ref({});
const evolution = ref([]);

const chartData = computed(() => {
  if (!evolution.value.length) return null;
  return {
    labels: evolution.value.map((e) => `${e.mois}/${e.annee}`),
    datasets: [
      {
        label: "Chiffre d'affaires (Ar)",
        data: evolution.value.map((e) => e.chiffreAffaires),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        tension: 0.3,
        fill: true,
      },
    ],
  };
});

const chartOptions = { responsive: true, plugins: { legend: { display: false } } };

onMounted(async () => {
  const { data: statsRes } = await statsService.getMensuel();
  stats.value = statsRes.data;

  const { data: evoRes } = await statsService.getEvolutionCA(6);
  evolution.value = evoRes.data;
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.stat-label {
  color: #6b7280;
  font-size: 0.9rem;
}
.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  margin-top: 0.25rem;
}
</style>

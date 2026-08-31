<template>
  <div>
    <h2>Calendrier de disponibilité</h2>
    <p class="hint">
      Vue simplifiée par chambre. Pour un calendrier visuel plus riche (grille par jour), tu peux
      intégrer une librairie comme <code>v-calendar</code> ou <code>@fullcalendar/vue3</code> et
      consommer les mêmes données de l'API <code>/api/disponibilite</code>.
    </p>

    <div class="card" v-for="item in disponibilite" :key="item.chambre._id" style="margin-top: 1rem">
      <div class="chambre-header">
        <strong>Chambre {{ item.chambre.numero }}</strong> ({{ item.chambre.type }})
        <span class="badge" :class="badgeClass(item.chambre.statut)">{{ item.chambre.statut }}</span>
      </div>
      <ul v-if="item.periodesOccupees.length">
        <li v-for="p in item.periodesOccupees" :key="p.reservationId">
          {{ formatDate(p.dateArrivee) }} → {{ formatDate(p.dateDepart) }} — {{ p.client }}
        </li>
      </ul>
      <p v-else class="hint">Aucune réservation ce mois-ci.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { disponibiliteService } from '../services/api';

const disponibilite = ref([]);

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}

function badgeClass(statut) {
  return {
    Disponible: 'badge-disponible',
    Occupée: 'badge-occupee',
    'En cours de nettoyage': 'badge-nettoyage',
    'Hors service': 'badge-horsservice',
  }[statut];
}

onMounted(async () => {
  const { data } = await disponibiliteService.get();
  disponibilite.value = data.data;
});
</script>

<style scoped>
.chambre-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.hint {
  color: #6b7280;
  font-size: 0.9rem;
}
ul {
  padding-left: 1.25rem;
}
</style>

<template>
  <div>
    <h2>Paiements</h2>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Chambre</th>
            <th>Montant</th>
            <th>Mode</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paiements" :key="p._id">
            <td>{{ p.reservation?.client?.nom }}</td>
            <td>{{ p.reservation?.chambre?.numero }}</td>
            <td>{{ p.montant }} Ar</td>
            <td>{{ p.modePaiement }}</td>
            <td>{{ p.statut }}</td>
            <td>
              <button v-if="p.statut === 'En attente'" class="btn btn-primary" @click="marquerPaye(p)">
                Marquer payé
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!paiements.length">Aucun paiement enregistré.</p>
    </div>

    <p class="hint">
      Astuce: un paiement se crée depuis une réservation confirmée — le montant est calculé
      automatiquement (nombre de nuits × prix de la chambre) côté API.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { paiementService } from '../services/api';

const paiements = ref([]);

async function charger() {
  const { data } = await paiementService.getAll();
  paiements.value = data.data;
}

async function marquerPaye(p) {
  await paiementService.update(p._id, { statut: 'Payé' });
  await charger();
}

onMounted(charger);
</script>

<style scoped>
.hint {
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style>

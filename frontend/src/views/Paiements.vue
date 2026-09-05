<template>
  <div>
    <div class="header-row">
      <h2>Paiements</h2>
      <button class="btn btn-primary" @click="afficherFormulaire = !afficherFormulaire">
        + Enregistrer un paiement
      </button>
    </div>

    <div class="card" v-if="afficherFormulaire">
      <form @submit.prevent="demarrerSoumission">
        <div class="champ">
          <label for="reservation">Réservation</label>
          <select id="reservation" v-model="form.reservation" required @change="onReservationChange">
            <option disabled value="">-- Choisir une réservation --</option>
            <option v-for="r in reservationsAvecSolde" :key="r._id" :value="r._id">
              {{ r.client?.nom }} — ch. {{ r.chambre?.numero }} — solde :
              {{ r.montantTotal - r.montantPaye }} {{ r.devise || 'Ar' }}
            </option>
          </select>
        </div>

        <div class="form-row" v-if="reservationSelectionnee">
          <div class="champ">
            <label for="montant">Montant</label>
            <input id="montant" v-model.number="form.montant" type="number" min="1" step="1" required />
            <p class="aide">
              Solde restant : <strong>{{ soldeRestantSelection }} {{ reservationSelectionnee.devise || 'Ar' }}</strong>
              (proposé par défaut — modifiez pour enregistrer un acompte, une confirmation vous sera demandée)
            </p>
          </div>

          <div class="champ">
            <label for="modePaiement">Mode de paiement</label>
            <select id="modePaiement" v-model="form.modePaiement" required>
              <option>Espèces</option>
              <option>Carte</option>
              <option>En ligne</option>
              <option>Virement</option>
            </select>
          </div>

          <div class="champ">
            <label for="statut">Statut</label>
            <select id="statut" v-model="form.statut" required>
              <option value="En attente">En attente</option>
              <option value="Payé">Payé (encaissé immédiatement)</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit" :disabled="envoiEnCours || !reservationSelectionnee">
            {{ envoiEnCours ? 'Enregistrement...' : 'Enregistrer le paiement' }}
          </button>
          <button class="btn" type="button" @click="fermerFormulaire">Annuler</button>
        </div>
        <p v-if="erreur" class="erreur">{{ erreur }}</p>
      </form>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Chambre</th>
            <th>Montant payé</th>
            <th>Mode</th>
            <th>Statut</th>
            <th>Reste à payer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paiements" :key="p._id">
            <td>{{ p.reservation?.client?.nom }}</td>
            <td>{{ p.reservation?.chambre?.numero }}</td>
            <td>{{ p.montant }} {{ p.reservation?.devise || 'Ar' }}</td>
            <td>{{ p.modePaiement }}</td>
            <td>{{ p.statut }}</td>
            <td>
              <span v-if="resteAPayer(p.reservation) > 0" class="badge-reste">
                {{ resteAPayer(p.reservation) }} {{ p.reservation?.devise || 'Ar' }} restant
              </span>
              <span v-else class="badge-solde">Soldé</span>
            </td>
            <td class="actions-cell">
              <button v-if="p.statut === 'En attente'" class="btn btn-primary" @click="marquerPaye(p)">
                Marquer payé
              </button>
              <button v-if="p.statut === 'Payé'" class="btn btn-danger" @click="rembourser(p)">
                Rembourser
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!paiements.length">Aucun paiement enregistré.</p>
    </div>

    <p class="hint">
      Astuce : le montant proposé correspond au solde restant de la réservation choisie ;
      modifiez-le pour enregistrer un acompte partiel (confirmation demandée dans ce cas).
    </p>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { paiementService, reservationService } from '../services/api';

const paiements = ref([]);
const reservations = ref([]);
const afficherFormulaire = ref(false);
const erreur = ref('');
const envoiEnCours = ref(false);

// Montant proposé par défaut au moment où la réservation a été choisie —
// sert de référence pour savoir si l'utilisateur l'a modifié manuellement.
const montantPropose = ref(null);

const form = reactive({
  reservation: '',
  montant: null,
  modePaiement: 'Espèces',
  statut: 'En attente',
});

const reservationsAvecSolde = computed(() =>
  reservations.value.filter(
    (r) =>
      ['confirmee', 'en_attente_paiement', 'check_in_fait'].includes(r.statutReservation) &&
      r.montantTotal - r.montantPaye > 0
  )
);

const reservationSelectionnee = computed(() =>
  reservations.value.find((r) => r._id === form.reservation)
);

const soldeRestantSelection = computed(() => {
  if (!reservationSelectionnee.value) return 0;
  return reservationSelectionnee.value.montantTotal - reservationSelectionnee.value.montantPaye;
});

// Reste à payer pour n'importe quelle réservation peuplée (utilisé dans le tableau)
function resteAPayer(reservation) {
  if (!reservation) return 0;
  return Math.max(0, (reservation.montantTotal || 0) - (reservation.montantPaye || 0));
}

function onReservationChange() {
  form.montant = soldeRestantSelection.value;
  montantPropose.value = soldeRestantSelection.value;
}

async function charger() {
  const { data } = await paiementService.getAll();
  paiements.value = data.data;
}

async function chargerReservations() {
  const { data } = await reservationService.getAll();
  reservations.value = data.data;
}

function fermerFormulaire() {
  afficherFormulaire.value = false;
  erreur.value = '';
  montantPropose.value = null;
  Object.assign(form, { reservation: '', montant: null, modePaiement: 'Espèces', statut: 'En attente' });
}

// NOUVEAU — vérifie si le montant a été modifié par rapport au solde proposé,
// et demande confirmation avant d'envoyer la requête si c'est le cas.
function demarrerSoumission() {
  erreur.value = '';

  const montantModifie = Number(form.montant) !== Number(montantPropose.value);

  if (montantModifie) {
    const confirme = confirm(
      `Le montant saisi (${form.montant} ${reservationSelectionnee.value?.devise || 'Ar'}) ` +
        `diffère du solde complet (${montantPropose.value} ${reservationSelectionnee.value?.devise || 'Ar'}).\n\n` +
        `Ce sera enregistré comme un paiement partiel (acompte). Confirmer ?`
    );
    if (!confirme) return;
  }

  soumettre();
}

async function soumettre() {
  envoiEnCours.value = true;
  try {
    await paiementService.create({
      reservation: form.reservation,
      montant: form.montant,
      modePaiement: form.modePaiement,
      statut: form.statut,
    });
    await Promise.all([charger(), chargerReservations()]);
    fermerFormulaire();
  } catch (err) {
    erreur.value = err.response?.data?.message || err.message;
  } finally {
    envoiEnCours.value = false;
  }
}

async function marquerPaye(p) {
  await paiementService.update(p._id, { statut: 'Payé' });
  await Promise.all([charger(), chargerReservations()]);
}

async function rembourser(p) {
  if (confirm('Confirmer le remboursement de ce paiement ?')) {
    await paiementService.update(p._id, { statut: 'Remboursé' });
    await Promise.all([charger(), chargerReservations()]);
  }
}

onMounted(() => {
  charger();
  chargerReservations();
});
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.champ {
  margin-bottom: 1rem;
}
.champ label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}
.champ input,
.champ select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.aide {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}
.form-row {
  display: flex;
  gap: 0.75rem;
}
.form-row .champ {
  flex: 1;
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
}
.badge-reste {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #fef3c7;
  color: #92400e;
}
.badge-solde {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #dcfce7;
  color: #15803d;
}
.hint {
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style>
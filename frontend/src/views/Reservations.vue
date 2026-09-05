<template>
  <div>
    <div class="header-row">
      <h2>Réservations</h2>
      <button class="btn btn-primary" @click="afficherFormulaire = !afficherFormulaire">
        + Nouvelle réservation
      </button>
    </div>

    <div class="card formulaire-resa" v-if="afficherFormulaire">
      <form @submit.prevent="soumettre">
        <div class="entete-hotel">
          <h1>TSARA TRACE</h1>
        </div>

        <fieldset class="section">
          <legend>Informations du client</legend>

          <div class="champ">
            <label for="nomComplet">Nom complet</label>
            <input id="nomComplet" v-model.trim="form.nomComplet" type="text" required />
          </div>

          <div class="champ">
            <label for="cin">CIN</label>
            <input id="cin" v-model.trim="form.cin" type="text" required />
          </div>

          <div class="champ">
            <label for="telephone">Numéro de téléphone</label>
            <input id="telephone" v-model.trim="form.telephone" type="tel" required />
          </div>

          <div class="champ">
            <label for="email">Adresse e-mail</label>
            <input id="email" v-model.trim="form.email" type="email" />
          </div>
        </fieldset>

        <fieldset class="section">
          <legend>Détails de la réservation</legend>

          <div class="champ">
            <label for="dateArrivee">Date d'arrivée</label>
            <input id="dateArrivee" v-model="form.dateArrivee" type="date" required />
          </div>

          <div class="champ">
            <label for="dateDepart">Date de départ</label>
            <input id="dateDepart" v-model="form.dateDepart" type="date" required />
          </div>

          <div class="champ">
            <label for="nombrePersonnes">Nombre de personnes</label>
            <input
              id="nombrePersonnes"
              v-model.number="form.nombrePersonnes"
              type="number"
              min="1"
              required
            />
          </div>

          <div class="champ">
            <label>Nombre de chambres</label>
            <input :value="nombreDeChambresTotal" type="number" disabled />
            <p class="aide">Calculé automatiquement à partir des types cochés ci-dessous.</p>
          </div>

          <div class="champ champ-pleine-largeur">
            <label>Type de chambre</label>
            <div class="checklist-types">
              <label v-for="type in typesChambreDisponibles" :key="type" class="ligne-type">
                <input
                  type="checkbox"
                  :checked="form.typesCoches[type] !== undefined"
                  @change="basculerType(type, $event.target.checked)"
                />
                <span class="nom-type">{{ type }}</span>
                <input
                  v-if="form.typesCoches[type] !== undefined"
                  v-model.number="form.typesCoches[type]"
                  type="number"
                  min="1"
                  class="input-quantite"
                  @click.stop
                />
              </label>
            </div>
          </div>

          <div class="champ champ-pleine-largeur">
            <label for="demandeSpeciale">Demande spéciale (facultatif)</label>
            <textarea
              id="demandeSpeciale"
              v-model="form.demandeSpeciale"
              rows="2"
              placeholder="Ex: étage élevé, chambre communicante..."
            ></textarea>
          </div>
        </fieldset>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit" :disabled="envoiEnCours">
            {{ envoiEnCours ? 'Réservation en cours...' : 'Réserver' }}
          </button>
          <button class="btn" type="button" @click="fermerFormulaire">Annuler</button>
        </div>

        <p v-if="erreur" class="erreur">{{ erreur }}</p>
        <p v-if="messageSucces" class="succes">{{ messageSucces }}</p>
      </form>
    </div>

    <!-- ── NOUVEAU : groupes en attente de validation ────────────── -->
    <div class="card carte-attente" v-if="groupesEnAttente.length" style="margin-top: 1rem">
      <h3>Réservations en attente de validation ({{ groupesEnAttente.length }})</h3>

      <div v-for="groupe in groupesEnAttente" :key="groupe.groupeReservationId" class="groupe-attente">
        <div class="groupe-entete">
          <div>
            <strong>{{ groupe.client?.nom }}</strong>
            — {{ formatDate(groupe.dateArrivee) }} → {{ formatDate(groupe.dateDepart) }}
          </div>
          <div class="demande-speciale">
            <em>Demande spéciale :</em> {{ groupe.demandeSpeciale }}
          </div>
        </div>

        <table class="table-groupe">
          <thead>
            <tr>
              <th>Chambre assignée</th>
              <th>Réassigner à</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in groupe.reservations" :key="r._id">
              <td>{{ r.chambre?.numero }} — {{ r.chambre?.typeLit }}</td>
              <td>
                <select v-model="selectionsReassignation[r._id]">
                  <option :value="r.chambre?._id">
                    (garder) {{ r.chambre?.numero }} — {{ r.chambre?.typeLit }}
                  </option>
                  <option
                    v-for="c in chambresMemeTypeDisponibles(r.chambre?.typeLit, r.chambre?._id)"
                    :key="c._id"
                    :value="c._id"
                  >
                    {{ c.numero }} — {{ c.typeLit }} ({{ c.statut }})
                  </option>
                </select>
              </td>
              <td>
                <button
                  class="btn"
                  :disabled="selectionsReassignation[r._id] === r.chambre?._id"
                  @click="reassignerChambre(r)"
                >
                  Changer
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="groupe-actions">
          <button class="btn btn-primary" @click="validerGroupe(groupe.groupeReservationId)">
            Valider le groupe
          </button>
        </div>
        <p v-if="erreurGroupe[groupe.groupeReservationId]" class="erreur">
          {{ erreurGroupe[groupe.groupeReservationId] }}
        </p>
      </div>
    </div>

    <div class="card" style="margin-top: 1rem">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Chambre</th>
            <th>Arrivée</th>
            <th>Départ</th>
            <th>Occupants</th>
            <th>Montant total</th>
            <th>Paiement</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.reservations" :key="r._id">
            <td>{{ r.client?.nom }} {{ r.client?.prenom }}</td>
            <td>
              {{ r.chambre?.numero }}
              <span v-if="r.enAttenteValidation" class="badge-attente">à valider</span>
            </td>
            <td>{{ formatDate(r.dateArrivee) }}</td>
            <td>{{ formatDate(r.dateDepart) }}</td>
            <td>{{ r.nombreAdultes }} ad. {{ r.nombreEnfants ? `+ ${r.nombreEnfants} enf.` : '' }}</td>
            <td>{{ r.montantTotal }} {{ r.devise || 'Ar' }}</td>
            <td>
              <span class="badge-paiement" :class="badgePaiementClass(r.statutPaiement)">
                {{ r.statutPaiement }}
              </span>
            </td>
            <td>{{ r.statut }}</td>
            <td class="actions-cell">
              <button
                class="btn"
                v-if="r.statutReservation === 'confirmee'"
                @click="changerCycle(r, 'check_in_fait')"
              >
                Check-in
              </button>
              <button
                class="btn"
                v-if="r.statutReservation === 'check_in_fait'"
                @click="changerCycle(r, 'check_out_fait')"
              >
                Check-out
              </button>
              <button
                class="btn btn-danger"
                v-if="['confirmee', 'en_attente_paiement'].includes(r.statutReservation)"
                @click="annuler(r)"
              >
                Annuler
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!store.reservations.length && !store.loading">Aucune réservation.</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useReservationsStore } from '../stores/reservations';
import { useChambresStore } from '../stores/chambres';

const store = useReservationsStore();
const chambresStore = useChambresStore();
const afficherFormulaire = ref(false);
const erreur = ref('');
const messageSucces = ref('');
const envoiEnCours = ref(false);

// Sélections en cours dans les menus déroulants de réassignation : { [reservationId]: chambreId }
const selectionsReassignation = reactive({});
// Messages d'erreur par groupe (réassignation ou validation)
const erreurGroupe = reactive({});

const typesChambreDisponibles = ['Simple', 'Double', 'Twin', 'Triple', 'Quadruple', 'Queen', 'King'];

function formulaireVide() {
  return {
    nomComplet: '',
    cin: '',
    telephone: '',
    email: '',
    dateArrivee: '',
    dateDepart: '',
    nombrePersonnes: 1,
    typesCoches: {},
    demandeSpeciale: '',
  };
}

const form = reactive(formulaireVide());

const nombreDeChambresTotal = computed(() =>
  Object.values(form.typesCoches).reduce((total, quantite) => total + (Number(quantite) || 0), 0)
);

function basculerType(type, coche) {
  if (coche) {
    form.typesCoches[type] = 1;
  } else {
    delete form.typesCoches[type];
  }
}

// Regroupe les réservations en attente par groupeReservationId, pour l'affichage
const groupesEnAttente = computed(() => {
  const enAttente = store.reservations.filter((r) => r.enAttenteValidation);
  const groupes = new Map();

  for (const r of enAttente) {
    const id = r.groupeReservationId;
    if (!groupes.has(id)) {
      groupes.set(id, {
        groupeReservationId: id,
        client: r.client,
        dateArrivee: r.dateArrivee,
        dateDepart: r.dateDepart,
        demandeSpeciale: r.preferences,
        reservations: [],
      });
    }
    groupes.get(id).reservations.push(r);

    // Initialise la sélection de réassignation sur la chambre actuelle si pas déjà fait
    if (selectionsReassignation[r._id] === undefined) {
      selectionsReassignation[r._id] = r.chambre?._id;
    }
  }

  return Array.from(groupes.values());
});

function chambresMemeTypeDisponibles(typeLit, chambreActuelleId) {
  return chambresStore.chambres.filter(
    (c) => c.typeLit === typeLit && c._id !== chambreActuelleId
  );
}

async function reassignerChambre(reservation) {
  const nouvelleChambreId = selectionsReassignation[reservation._id];
  const groupeId = reservation.groupeReservationId;
  erreurGroupe[groupeId] = '';

  const resultat = await store.modifierReservation(reservation._id, { chambre: nouvelleChambreId });
  if (!resultat.success) {
    erreurGroupe[groupeId] = resultat.message;
    // Revert la sélection sur la chambre réellement en base
    selectionsReassignation[reservation._id] = reservation.chambre?._id;
  }
}

async function validerGroupe(groupeReservationId) {
  erreurGroupe[groupeReservationId] = '';
  const resultat = await store.validerGroupeReservation(groupeReservationId);
  if (!resultat.success) {
    erreurGroupe[groupeReservationId] = resultat.message;
  }
}

onMounted(() => {
  store.fetchReservations();
  chambresStore.fetchChambres();
});

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}

function badgePaiementClass(statut) {
  return {
    'Non payé': 'badge-non-paye',
    Partiel: 'badge-partiel',
    Payé: 'badge-paye',
    Remboursé: 'badge-rembourse',
  }[statut];
}

function fermerFormulaire() {
  afficherFormulaire.value = false;
  erreur.value = '';
  messageSucces.value = '';
  Object.assign(form, formulaireVide());
}

async function soumettre() {
  erreur.value = '';
  messageSucces.value = '';

  if (nombreDeChambresTotal.value < 1) {
    erreur.value = 'Sélectionnez au moins un type de chambre avec une quantité.';
    return;
  }

  const chambres = Object.entries(form.typesCoches).map(([type, quantite]) => ({
    type,
    quantite: Number(quantite) || 0,
  }));

  envoiEnCours.value = true;
  const resultat = await store.creerReservationGroupee({
    nomComplet: form.nomComplet,
    cin: form.cin,
    telephone: form.telephone,
    email: form.email,
    dateArrivee: form.dateArrivee,
    dateDepart: form.dateDepart,
    nombrePersonnes: form.nombrePersonnes,
    chambres,
    demandeSpeciale: form.demandeSpeciale,
  });
  envoiEnCours.value = false;

  if (resultat.success) {
    messageSucces.value = resultat.enAttenteValidation
      ? 'Réservation enregistrée — en attente de validation (demande spéciale à traiter).'
      : 'Réservation confirmée avec succès.';
    Object.assign(form, formulaireVide());
    setTimeout(() => {
      afficherFormulaire.value = false;
      messageSucces.value = '';
    }, 2000);
  } else {
    erreur.value = resultat.message;
  }
}

async function changerCycle(reservation, statutReservation) {
  await store.modifierReservation(reservation._id, { statutReservation });
}

async function annuler(reservation) {
  if (confirm('Annuler cette réservation ?')) {
    await store.annulerReservation(reservation._id);
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

.formulaire-resa {
  max-width: 640px;
}

.entete-hotel {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #1d4ed8;
}
.entete-hotel h1 {
  margin: 0;
  letter-spacing: 0.1em;
  color: #1d4ed8;
}

.section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem 1.25rem 1.25rem;
  margin-bottom: 1.25rem;
}
.section legend {
  padding: 0 0.5rem;
  font-weight: 600;
  color: #374151;
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
.champ textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  box-sizing: border-box;
}
.champ input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}
.aide {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.checklist-types {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ligne-type {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
}
.ligne-type input[type='checkbox'] {
  width: auto;
}
.nom-type {
  flex: 1;
}
.input-quantite {
  width: 70px !important;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}
.erreur {
  color: #dc2626;
  margin-top: 0.5rem;
}
.succes {
  color: #15803d;
  margin-top: 0.5rem;
}

.carte-attente {
  border: 1px solid #fbbf24;
  background: #fffbeb;
}
.carte-attente h3 {
  margin-top: 0;
  color: #92400e;
}
.groupe-attente {
  border-top: 1px solid #fde68a;
  padding: 1rem 0;
}
.groupe-attente:first-of-type {
  border-top: none;
  padding-top: 0.5rem;
}
.groupe-entete {
  margin-bottom: 0.75rem;
}
.demande-speciale {
  font-size: 0.9rem;
  color: #78350f;
}
.table-groupe {
  width: 100%;
  margin-bottom: 0.75rem;
}
.table-groupe select {
  padding: 0.3rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
}
.groupe-actions {
  display: flex;
  justify-content: flex-end;
}

.actions-cell {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.badge-attente {
  display: inline-block;
  margin-left: 0.3rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #fef3c7;
  color: #92400e;
}
.badge-paiement {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.badge-non-paye {
  background: #fee2e2;
  color: #b91c1c;
}
.badge-partiel {
  background: #fef3c7;
  color: #92400e;
}
.badge-paye {
  background: #dcfce7;
  color: #15803d;
}
.badge-rembourse {
  background: #e0e7ff;
  color: #4338ca;
}
</style>
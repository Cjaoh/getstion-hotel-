<template>
  <div class="page-paiements">
    <header class="entete">
      <div class="entete-titre">
        <p class="entete-marque">Tsara Trace</p>
        <h1>Paiements</h1>
      </div>
      <button class="btn-principal" @click="ouvrirSelectionReservation">+ Nouveau paiement</button>
    </header>

    <!-- ── Statistiques rapides ───────────────────────────────── -->
    <div class="stats-rapides">
      <div class="carte-stat">
        <p class="stat-label">Encaissé (payé)</p>
        <p class="stat-value">{{ totalPaye.toLocaleString('fr-FR') }} <small>Ar</small></p>
      </div>
      <div class="carte-stat">
        <p class="stat-label">En attente</p>
        <p class="stat-value">{{ totalEnAttente.toLocaleString('fr-FR') }} <small>Ar</small></p>
      </div>
      <div class="carte-stat">
        <p class="stat-label">Remboursé</p>
        <p class="stat-value">{{ totalRembourse.toLocaleString('fr-FR') }} <small>Ar</small></p>
      </div>
      <div class="carte-stat">
        <p class="stat-label">Transactions</p>
        <p class="stat-value">{{ paiements.length }}</p>
      </div>
    </div>

    <!-- ── Sélection d'une réservation à régler ───────────────── -->
    <div class="panneau-selection" v-if="afficherSelection">
      <h2>Choisir une réservation à régler</h2>
      <input
        v-model="rechercheReservation"
        type="search"
        class="champ-recherche"
        placeholder="Rechercher un client ou un numéro de chambre..."
      />
      <div class="liste-selection">
        <button
          v-for="r in reservationsAvecSolde"
          :key="r._id"
          class="ligne-selection"
          type="button"
          @click="demarrerPaiementPour(r)"
        >
          <span>
            <strong>{{ r.client?.nom }}</strong> — ch. {{ r.chambre?.numero }}
          </span>
          <span class="ligne-selection-solde">
            {{ (r.montantTotal - r.montantPaye).toLocaleString('fr-FR') }} {{ r.devise || 'Ar' }} restant
          </span>
        </button>
        <p v-if="!reservationsAvecSolde.length" class="etat-vide">Aucune réservation avec un solde restant.</p>
      </div>
      <button class="btn-discret" type="button" @click="afficherSelection = false">Annuler</button>
    </div>

    <!-- ── Filtres ────────────────────────────────────────────── -->
    <div class="barre-filtres">
      <div class="pastilles-categories">
        <button
          v-for="s in STATUTS_FILTRE"
          :key="s.valeur"
          class="pastille"
          :class="{ active: statutActif === s.valeur }"
          @click="statutActif = s.valeur"
        >
          {{ s.libelle }}
        </button>
      </div>
    </div>

    <!-- ── Liste des paiements ────────────────────────────────── -->
    <div class="liste-paiements" v-if="paiementsFiltres.length">
      <article v-for="p in paiementsFiltres" :key="p._id" class="ligne-paiement">
        <span class="icone-methode-liste">
          <svg v-if="p.modePaiement === 'Carte'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <svg v-else-if="p.modePaiement === 'Virement'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9"/><path d="M3 21h18"/></svg>
          <svg v-else-if="p.modePaiement === 'En ligne'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
        </span>

        <div class="ligne-paiement-infos">
          <p class="ligne-paiement-client">{{ p.reservation?.client?.nom }}</p>
          <p class="ligne-paiement-details">
            Ch. {{ p.reservation?.chambre?.numero }} · {{ p.modePaiement }} ·
            {{ new Date(p.createdAt).toLocaleDateString('fr-FR') }}
          </p>
        </div>

        <div class="ligne-paiement-montant">
          <strong>{{ p.montant.toLocaleString('fr-FR') }} {{ p.reservation?.devise || 'Ar' }}</strong>
          <span v-if="resteAPayer(p.reservation) > 0" class="etiquette-solde">
            {{ resteAPayer(p.reservation).toLocaleString('fr-FR') }} restant
          </span>
        </div>

        <span class="badge-statut-paiement" :class="classeStatut(p.statut)">{{ p.statut }}</span>

        <div class="ligne-paiement-actions">
          <button v-if="p.statut === 'En attente'" class="btn-discret btn-petit" @click="marquerPaye(p)">
            Marquer payé
          </button>
          <button v-if="p.statut === 'Payé'" class="btn-discret btn-petit" @click="rembourser(p)">
            Rembourser
          </button>
        </div>
      </article>
    </div>
    <p v-else class="etat-vide">Aucun paiement pour ce filtre.</p>

    <!-- ── Tunnel de paiement sécurisé ────────────────────────── -->
    <PaiementSecurise
      v-if="reservationCiblee"
      :lignes="[ligneCiblee]"
      titre="Encaisser un paiement"
      @fermer="reservationCiblee = null"
      @succes="surSucces"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { paiementService, reservationService } from '../services/api';
import PaiementSecurise from '../components/PaiementSecurise.vue';

const paiements = ref([]);
const reservationsToutes = ref([]);
const statutActif = ref('Toutes');
const afficherSelection = ref(false);
const rechercheReservation = ref('');
const reservationCiblee = ref(null);

const STATUTS_FILTRE = [
  { valeur: 'Toutes', libelle: 'Toutes' },
  { valeur: 'Payé', libelle: 'Payés' },
  { valeur: 'En attente', libelle: 'En attente' },
  { valeur: 'Remboursé', libelle: 'Remboursés' },
];

async function charger() {
  const { data } = await paiementService.getAll();
  paiements.value = data.data;
}

async function chargerReservations() {
  const { data } = await reservationService.getAll();
  reservationsToutes.value = data.data;
}

const reservationsAvecSolde = computed(() => {
  let liste = reservationsToutes.value.filter(
    (r) => r.montantTotal - r.montantPaye > 0 && r.statutReservation !== 'annulee'
  );
  if (rechercheReservation.value.trim()) {
    const terme = rechercheReservation.value.trim().toLowerCase();
    liste = liste.filter(
      (r) =>
        r.client?.nom?.toLowerCase().includes(terme) || r.chambre?.numero?.toLowerCase().includes(terme)
    );
  }
  return liste;
});

const ligneCiblee = computed(() => {
  if (!reservationCiblee.value) return null;
  const r = reservationCiblee.value;
  return {
    reservationId: r._id,
    label: `${r.client?.nom} — chambre ${r.chambre?.numero}`,
    montant: r.montantTotal - r.montantPaye,
    devise: r.devise || 'Ar',
  };
});

const paiementsFiltres = computed(() => {
  if (statutActif.value === 'Toutes') return paiements.value;
  return paiements.value.filter((p) => p.statut === statutActif.value);
});

const totalPaye = computed(() =>
  paiements.value.filter((p) => p.statut === 'Payé').reduce((s, p) => s + p.montant, 0)
);
const totalEnAttente = computed(() =>
  paiements.value.filter((p) => p.statut === 'En attente').reduce((s, p) => s + p.montant, 0)
);
const totalRembourse = computed(() =>
  paiements.value.filter((p) => p.statut === 'Remboursé').reduce((s, p) => s + p.montant, 0)
);

function resteAPayer(reservation) {
  if (!reservation) return 0;
  return Math.max(0, reservation.montantTotal - reservation.montantPaye);
}

function classeStatut(statut) {
  return {
    Payé: 'badge-paye',
    'En attente': 'badge-attente',
    Remboursé: 'badge-rembourse',
  }[statut];
}

function ouvrirSelectionReservation() {
  afficherSelection.value = true;
  rechercheReservation.value = '';
}

function demarrerPaiementPour(reservation) {
  reservationCiblee.value = reservation;
  afficherSelection.value = false;
}

async function surSucces() {
  await Promise.all([charger(), chargerReservations()]);
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
.page-paiements {
  font-family: var(--font-sans);
}

.entete {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid var(--ligne);
}
.entete-marque {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--brand);
  margin-bottom: 0.15rem;
}

.stats-rapides {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.9rem;
  margin-bottom: 1.5rem;
}
.carte-stat {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  padding: 1rem 1.15rem;
}
.stat-label {
  font-size: 0.8rem;
  color: var(--muted);
}
.stat-value {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 0.2rem;
}
.stat-value small {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--muted);
}

/* ── Sélection réservation ──────────────────────────────────── */
.panneau-selection {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}
.panneau-selection h2 {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}
.champ-recherche {
  width: 100%;
  margin-bottom: 0.75rem;
}
.liste-selection {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 0.9rem;
}
.ligne-selection {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--ink);
}
.ligne-selection:hover {
  background: var(--paper);
}
.ligne-selection-solde {
  color: var(--brass);
  font-weight: 600;
  font-size: 0.8rem;
}

/* ── Filtres ─────────────────────────────────────────────────── */
.barre-filtres {
  margin-bottom: 1.25rem;
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
}
.pastille.active {
  background: var(--brand-dark);
  border-color: var(--brand-dark);
  color: #fff;
}

/* ── Liste des paiements ─────────────────────────────────────── */
.liste-paiements {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.ligne-paiement {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.icone-methode-liste {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ligne-paiement-infos {
  flex: 1;
  min-width: 0;
}
.ligne-paiement-client {
  font-weight: 600;
  font-size: 0.9rem;
}
.ligne-paiement-details {
  font-size: 0.78rem;
  color: var(--muted);
}
.ligne-paiement-montant {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.95rem;
}
.etiquette-solde {
  font-size: 0.7rem;
  color: var(--danger);
}
.badge-statut-paiement {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}
.badge-paye {
  background: var(--brand-light);
  color: #157a4f;
}
.badge-attente {
  background: #fdf3d9;
  color: #8a6a08;
}
.badge-rembourse {
  background: var(--danger-bg);
  color: var(--danger);
}
.ligne-paiement-actions {
  display: flex;
  gap: 0.4rem;
}
.btn-petit {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
}

.etat-vide {
  padding: 2rem 0;
  text-align: center;
  color: var(--muted);
}
</style>
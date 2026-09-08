<template>
  <div class="panneau-paiement">
    <!-- ── Résumé de la réservation ─────────────────────────────── -->
    <div class="resume-reservation">
      <div class="resume-identite">
        <p class="resume-client">{{ nomClient }}</p>
        <p class="resume-sejour">
          Chambre {{ reservation.chambre?.numero }} · {{ reservation.chambre?.typeLit }}
          <span class="resume-dates">{{ formatDate(reservation.dateArrivee) }} → {{ formatDate(reservation.dateDepart) }}</span>
        </p>
      </div>
      <div class="resume-montants">
        <div class="ligne-montant">
          <span>Total du séjour</span>
          <strong>{{ formatMontant(reservation.montantTotal) }}</strong>
        </div>
        <div class="ligne-montant" v-if="reservation.montantPaye > 0">
          <span>Déjà réglé</span>
          <strong>{{ formatMontant(reservation.montantPaye) }}</strong>
        </div>
        <div class="ligne-montant ligne-solde">
          <span>Solde à encaisser</span>
          <strong>{{ formatMontant(solde) }}</strong>
        </div>
      </div>
    </div>

    <!-- ── Étape 1 : montant + mode ─────────────────────────────── -->
    <template v-if="etape === 'methode'">
      <p class="etiquette-etape">Montant à encaisser aujourd'hui</p>
      <div class="choix-montant">
        <button
          type="button"
          class="option-montant"
          :class="{ active: montantChoisi === 'solde' }"
          @click="montantChoisi = 'solde'"
        >
          Solde total
        </button>
        <button
          type="button"
          class="option-montant"
          :class="{ active: montantChoisi === 'personnalise' }"
          @click="montantChoisi = 'personnalise'"
        >
          Acompte / montant libre
        </button>
      </div>
      <input
        v-if="montantChoisi === 'personnalise'"
        v-model.number="montantPersonnalise"
        type="number"
        min="1"
        :max="solde"
        class="champ-montant-libre"
        :placeholder="`Max ${formatMontant(solde)}`"
      />

      <p class="etiquette-etape">Mode de paiement</p>
      <div class="grille-modes">
        <button
          v-for="m in MODES"
          :key="m.valeur"
          type="button"
          class="tuile-mode"
          :class="{ active: modeChoisi === m.valeur }"
          @click="modeChoisi = m.valeur"
        >
          <span class="tuile-icone" v-html="m.icone"></span>
          <span class="tuile-libelle">{{ m.libelle }}</span>
        </button>
      </div>

      <p v-if="erreurMontant" class="message-erreur">{{ erreurMontant }}</p>

      <div class="actions-panneau">
        <button class="btn-principal btn-pleine-largeur" :disabled="!peutContinuer" @click="passerAuxDetails">
          Continuer
        </button>
        <button class="btn-discret btn-pleine-largeur" type="button" @click="$emit('annuler')">
          Annuler
        </button>
      </div>
    </template>

    <!-- ── Étape 2 : détails selon le mode ──────────────────────── -->
    <template v-if="etape === 'details'">
      <p class="etiquette-etape">
        {{ libelleModeActif }} · {{ formatMontant(montantAEncaisser) }}
      </p>

      <div v-if="modeChoisi === 'Espèces'" class="bloc-mode">
        <p class="texte-mode">
          Confirmez avoir reçu <strong>{{ formatMontant(montantAEncaisser) }}</strong> en espèces des mains du client.
        </p>
      </div>

      <div v-else-if="modeChoisi === 'Carte'" class="bloc-mode">
        <p class="texte-mode">
          Faites passer la carte sur le terminal de paiement (TPE). Une fois la transaction approuvée,
          reportez ici les 4 derniers chiffres affichés sur le ticket du terminal — aucune autre donnée
          de carte ne transite par cette application.
        </p>
        <label class="champ-label">4 derniers chiffres de la carte</label>
        <input
          v-model="carteDerniersChiffres"
          type="text"
          inputmode="numeric"
          maxlength="4"
          placeholder="1234"
          class="champ-carte"
        />
      </div>

      <div v-else-if="modeChoisi === 'Virement'" class="bloc-mode">
        <p class="texte-mode">
          Une référence interne sera générée pour le rapprochement bancaire. Vérifiez la réception du
          virement sur le relevé avant de marquer ce paiement comme confirmé.
        </p>
      </div>

      <div v-else-if="modeChoisi === 'En ligne'" class="bloc-mode">
        <template v-if="!lienGenere">
          <p class="texte-mode">
            Un lien de paiement sécurisé sera généré pour ce montant, à transmettre au client par email
            ou SMS. Le règlement est traité par le prestataire de paiement — cette application n'a à
            aucun moment accès aux coordonnées bancaires du client.
          </p>
        </template>
        <template v-else>
          <p class="texte-mode">Lien envoyé au client :</p>
          <div class="lien-genere">
            <span>{{ lienGenere }}</span>
            <button type="button" class="btn-discret btn-petit" @click="copierLien">
              {{ lienCopie ? 'Copié' : 'Copier' }}
            </button>
          </div>
          <p class="texte-mode texte-attente">En attente de la confirmation du paiement par le client...</p>
        </template>
      </div>

      <div class="bandeau-securite">
        <span class="icone-cadenas" v-html="ICONE_CADENAS"></span>
        Connexion chiffrée · aucune donnée bancaire complète n'est stockée sur ce serveur
      </div>

      <p v-if="erreur" class="message-erreur">{{ erreur }}</p>

      <div class="actions-panneau">
        <template v-if="modeChoisi === 'En ligne' && !lienGenere">
          <button class="btn-principal btn-pleine-largeur" :disabled="envoiEnCours" @click="genererLien">
            Générer le lien de paiement
          </button>
        </template>
        <template v-else-if="modeChoisi === 'En ligne' && lienGenere">
          <button class="btn-principal btn-pleine-largeur" :disabled="envoiEnCours" @click="confirmer('Payé')">
            Confirmer le paiement reçu
          </button>
          <button class="btn-discret btn-pleine-largeur" :disabled="envoiEnCours" @click="confirmer('En attente')">
            Enregistrer en attente
          </button>
        </template>
        <template v-else>
          <button
            class="btn-principal btn-pleine-largeur"
            :disabled="envoiEnCours || (modeChoisi === 'Carte' && carteDerniersChiffres.length !== 4)"
            @click="confirmer('Payé')"
          >
            {{ envoiEnCours ? 'Enregistrement...' : `Confirmer ${formatMontant(montantAEncaisser)}` }}
          </button>
        </template>
        <button class="btn-discret btn-pleine-largeur" type="button" @click="etape = 'methode'">
          Retour
        </button>
      </div>
    </template>

    <!-- ── Étape 3 : reçu ────────────────────────────────────────── -->
    <template v-if="etape === 'recu'">
      <div class="recu">
        <div class="recu-check" v-html="ICONE_CHECK"></div>
        <h3>{{ paiementCree.statut === 'Payé' ? 'Paiement enregistré' : 'Paiement en attente enregistré' }}</h3>
        <p class="recu-montant">{{ formatMontant(paiementCree.montant) }}</p>
        <p class="recu-reference">Référence {{ paiementCree.reference }}</p>

        <table class="recu-details">
          <tbody>
            <tr>
              <td>Client</td>
              <td>{{ nomClient }}</td>
            </tr>
            <tr>
              <td>Chambre</td>
              <td>{{ reservation.chambre?.numero }}</td>
            </tr>
            <tr>
              <td>Mode</td>
              <td>{{ paiementCree.modePaiement }}</td>
            </tr>
            <tr v-if="paiementCree.carteMasquee">
              <td>Carte</td>
              <td>{{ paiementCree.carteMasquee }}</td>
            </tr>
            <tr>
              <td>Date</td>
              <td>{{ formatDateHeure(paiementCree.createdAt) }}</td>
            </tr>
          </tbody>
        </table>

        <button class="btn-principal btn-pleine-largeur" @click="$emit('termine', paiementCree)">
          Terminer
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { paiementService } from '../services/api';

const props = defineProps({
  reservation: { type: Object, required: true },
});
const emit = defineEmits(['termine', 'annuler']);

const ICONE_CADENAS =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const ICONE_CHECK =
  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>';

const MODES = [
  {
    valeur: 'Espèces',
    libelle: 'Espèces',
    icone:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  },
  {
    valeur: 'Carte',
    libelle: 'Carte (TPE)',
    icone:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  },
  {
    valeur: 'Virement',
    libelle: 'Virement',
    icone:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>',
  },
  {
    valeur: 'En ligne',
    libelle: 'Lien en ligne',
    icone:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  },
];

const etape = ref('methode');
const montantChoisi = ref('solde');
const montantPersonnalise = ref(null);
const modeChoisi = ref('');
const erreurMontant = ref('');
const erreur = ref('');
const envoiEnCours = ref(false);
const carteDerniersChiffres = ref('');
const lienGenere = ref('');
const lienCopie = ref(false);
const paiementCree = ref(null);

const solde = computed(() =>
  Math.max(0, (props.reservation.montantTotal || 0) - (props.reservation.montantPaye || 0))
);

const nomClient = computed(() =>
  [props.reservation.client?.nom, props.reservation.client?.prenom].filter(Boolean).join(' ')
);

const montantAEncaisser = computed(() => {
  if (montantChoisi.value === 'solde') return solde.value;
  return Number(montantPersonnalise.value) || 0;
});

const libelleModeActif = computed(() => MODES.find((m) => m.valeur === modeChoisi.value)?.libelle || '');

const peutContinuer = computed(() => {
  if (!modeChoisi.value) return false;
  if (montantAEncaisser.value <= 0 || montantAEncaisser.value > solde.value) return false;
  return true;
});

function formatMontant(m) {
  return `${Math.round(m || 0).toLocaleString('fr-FR')} ${props.reservation.devise || 'Ar'}`;
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR');
}
function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR');
}

function passerAuxDetails() {
  erreurMontant.value = '';
  if (montantAEncaisser.value <= 0) {
    erreurMontant.value = 'Indiquez un montant supérieur à 0.';
    return;
  }
  if (montantAEncaisser.value > solde.value) {
    erreurMontant.value = `Le montant dépasse le solde restant (${formatMontant(solde.value)}).`;
    return;
  }
  etape.value = 'details';
}

function genererLien() {
  // Simulation d'un lien de paiement hébergé par un prestataire externe
  // (Stripe Checkout, PayPal, ou un agrégateur mobile money local selon le marché).
  const jeton = Math.random().toString(36).slice(2, 10);
  lienGenere.value = `https://paiement.tsaratrace.mg/c/${jeton}`;
}

async function copierLien() {
  try {
    await navigator.clipboard.writeText(lienGenere.value);
    lienCopie.value = true;
    setTimeout(() => (lienCopie.value = false), 1500);
  } catch {
    // Le presse-papier peut être indisponible (contexte non sécurisé) — pas bloquant.
  }
}

async function confirmer(statutSouhaite) {
  erreur.value = '';
  envoiEnCours.value = true;
  try {
    const { data } = await paiementService.create({
      reservation: props.reservation._id,
      montant: montantAEncaisser.value,
      modePaiement: modeChoisi.value,
      statut: statutSouhaite,
      carteMasquee: modeChoisi.value === 'Carte' ? `•••• ${carteDerniersChiffres.value}` : null,
    });
    paiementCree.value = data.data;
    etape.value = 'recu';
  } catch (err) {
    erreur.value = err.response?.data?.message || err.response?.data?.raison || err.message;
  } finally {
    envoiEnCours.value = false;
  }
}
</script>

<style scoped>
.panneau-paiement {
  font-family: var(--font-sans);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Résumé ──────────────────────────────────────────────── */
.resume-reservation {
  background: var(--brand-light);
  border-radius: 10px;
  padding: 1rem 1.15rem;
}
.resume-client {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 600;
}
.resume-sejour {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.15rem;
}
.resume-dates {
  margin-left: 0.4rem;
}
.resume-montants {
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(38, 43, 34, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.ligne-montant {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--muted);
}
.ligne-montant strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.ligne-solde {
  margin-top: 0.2rem;
  font-size: 0.95rem;
}
.ligne-solde span {
  font-weight: 600;
  color: var(--ink);
}
.ligne-solde strong {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--brass-dark);
}

/* ── Étapes ──────────────────────────────────────────────── */
.etiquette-etape {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.choix-montant {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.option-montant {
  flex: 1;
  padding: 0.6rem;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}
.option-montant.active {
  border-color: var(--brand);
  background: var(--brand-light);
}
.champ-montant-libre {
  width: 100%;
  margin-bottom: 0.5rem;
}

.grille-modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}
.tuile-mode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--ligne);
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.tuile-mode:hover {
  border-color: var(--brand);
}
.tuile-mode.active {
  border-color: var(--brand);
  background: var(--brand-light);
}
.tuile-icone {
  display: flex;
  color: var(--brand);
  flex-shrink: 0;
}

.bloc-mode {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 9px;
  padding: 0.9rem 1rem;
}
.texte-mode {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.55;
}
.texte-attente {
  margin-top: 0.5rem;
  font-style: italic;
}
.champ-label {
  display: block;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink);
}
.champ-carte {
  width: 120px;
  letter-spacing: 0.15em;
  font-variant-numeric: tabular-nums;
}

.lien-genere {
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--paper);
  border: 1px dashed var(--ligne);
  border-radius: 7px;
  padding: 0.5rem 0.7rem;
  font-size: 0.8rem;
  word-break: break-all;
}

.bandeau-securite {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--muted);
  padding: 0.6rem 0.75rem;
  background: var(--paper);
  border-radius: 7px;
}
.icone-cadenas {
  color: var(--brass-dark);
  flex-shrink: 0;
  display: flex;
}

.actions-panneau {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.btn-pleine-largeur {
  width: 100%;
  justify-content: center;
}
.btn-petit {
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  flex-shrink: 0;
}

.message-erreur {
  color: var(--danger);
  font-size: 0.85rem;
}

/* ── Reçu ────────────────────────────────────────────────── */
.recu {
  text-align: center;
  padding: 0.5rem 0 0.25rem;
}
.recu-check {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.85rem;
}
.recu h3 {
  font-size: 1.2rem;
}
.recu-montant {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  font-weight: 600;
  margin-top: 0.5rem;
}
.recu-reference {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.15rem;
  font-variant-numeric: tabular-nums;
}
.recu-details {
  margin: 1.25rem 0 1.5rem;
  text-align: left;
}
.recu-details td {
  padding: 0.4rem 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--ligne);
}
.recu-details td:first-child {
  color: var(--muted);
}
.recu-details td:last-child {
  text-align: right;
  font-weight: 600;
}
</style>
<template>
  <div class="voile-paiement" @click.self="tenterFermeture">
    <div class="panneau-paiement">
      <header class="entete-paiement">
        <div class="entete-titre-paiement">
          <span class="icone-cadenas">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <div>
            <p class="paiement-titre">{{ titre }}</p>
            <p class="paiement-soustitre">Transaction chiffrée · Aucune donnée de carte conservée</p>
          </div>
        </div>
        <button class="bouton-fermer" @click="tenterFermeture" aria-label="Fermer" type="button">✕</button>
      </header>

      <div class="rail-etapes">
        <span :class="{ active: etape === 1, fait: etape > 1 }">1 · Récapitulatif</span>
        <span class="trait"></span>
        <span :class="{ active: etape === 2, fait: etape > 2 }">2 · Paiement</span>
        <span class="trait"></span>
        <span :class="{ active: etape >= 3, fait: etape === 4 }">3 · Confirmation</span>
      </div>

      <!-- ── ÉTAPE 1 : récapitulatif + choix du montant + méthode ── -->
      <div v-if="etape === 1" class="corps-etape">
        <div class="recap-lignes">
          <div v-for="l in lignes" :key="l.reservationId" class="ligne-recap">
            <span>{{ l.label }}</span>
            <strong v-if="lignes.length > 1">{{ l.montant.toLocaleString('fr-FR') }} {{ devise }}</strong>
          </div>

          <div v-if="lignes.length === 1" class="champ champ-montant">
            <label>Montant à encaisser</label>
            <div class="ligne-montant-input">
              <input
                v-model.number="montantUnique"
                type="number"
                min="1"
                :max="lignes[0].montant"
                step="1"
              />
              <span class="devise-suffixe">{{ devise }}</span>
            </div>
            <p class="aide-montant" v-if="montantUnique < lignes[0].montant">
              Acompte partiel — solde restant après encaissement :
              <strong>{{ (lignes[0].montant - montantUnique).toLocaleString('fr-FR') }} {{ devise }}</strong>
            </p>
          </div>
        </div>

        <div class="ligne-total">
          <span>Total à encaisser</span>
          <strong>{{ montantTotalCalcule.toLocaleString('fr-FR') }} {{ devise }}</strong>
        </div>

        <p class="etiquette-section">Méthode de paiement</p>
        <div class="grille-methodes">
          <button
            v-for="m in METHODES"
            :key="m.valeur"
            type="button"
            class="carte-methode"
            :class="{ active: modePaiement === m.valeur }"
            @click="choisirMethode(m.valeur)"
          >
            <span class="icone-methode" v-html="m.icone"></span>
            {{ m.libelle }}
          </button>
        </div>

        <p v-if="erreur" class="message-erreur-paiement">{{ erreur }}</p>

        <div class="actions-etape">
          <button class="btn-discret" type="button" @click="tenterFermeture">Annuler</button>
          <button class="btn-principal" type="button" :disabled="!modePaiement" @click="passerAuxDetails">
            Continuer
          </button>
        </div>
      </div>

      <!-- ── ÉTAPE 2 : détails de paiement selon la méthode ────────── -->
      <div v-else-if="etape === 2" class="corps-etape">
        <template v-if="modePaiement === 'Carte'">
          <div class="visuel-carte">
            <div class="visuel-carte-haut">
              <svg viewBox="0 0 32 24" width="34" height="24" class="puce-carte">
                <rect x="1" y="1" width="30" height="22" rx="3" fill="#d9c47a" />
                <line x1="1" y1="8" x2="31" y2="8" stroke="#b8912f" stroke-width="1" />
                <line x1="1" y1="16" x2="31" y2="16" stroke="#b8912f" stroke-width="1" />
              </svg>
              <span class="marque-carte">{{ marqueCarte }}</span>
            </div>
            <p class="visuel-carte-numero">{{ numeroCarteAffiche }}</p>
            <div class="visuel-carte-bas">
              <div>
                <span class="visuel-carte-etiquette">Titulaire</span>
                <p>{{ carte.nom || 'NOM DU TITULAIRE' }}</p>
              </div>
              <div>
                <span class="visuel-carte-etiquette">Expire</span>
                <p>{{ carte.expiration || 'MM/AA' }}</p>
              </div>
            </div>
          </div>

          <div class="champ">
            <label>Numéro de carte</label>
            <input
              :value="numeroCarteAffiche"
              @input="onSaisieNumero"
              type="text"
              inputmode="numeric"
              placeholder="0000 0000 0000 0000"
              maxlength="19"
            />
          </div>
          <div class="ligne-champs">
            <div class="champ">
              <label>Titulaire de la carte</label>
              <input v-model="carte.nom" type="text" placeholder="Ex : RAKOTO Jean" style="text-transform: uppercase" />
            </div>
            <div class="champ champ-etroit">
              <label>Expiration</label>
              <input v-model="carte.expiration" @input="formaterExpiration" type="text" placeholder="MM/AA" maxlength="5" />
            </div>
            <div class="champ champ-etroit">
              <label>CVV</label>
              <input v-model="carte.cvv" type="password" inputmode="numeric" placeholder="•••" maxlength="3" />
            </div>
          </div>
        </template>

        <template v-else-if="modePaiement === 'Virement'">
          <div class="bloc-info-methode">
            <p class="bloc-info-titre">Coordonnées bancaires de l'hôtel</p>
            <p>Communiquez ces coordonnées au client pour l'exécution du virement.</p>
            <div class="rib">
              <span>IBAN</span><strong>MG46 0000 1234 5678 9012 345</strong>
              <span>BIC</span><strong>TSRTMGMG</strong>
            </div>
          </div>
          <div class="champ">
            <label>Référence du virement (facultatif)</label>
            <input v-model="reference" type="text" placeholder="Ex : numéro de transaction bancaire" />
          </div>
        </template>

        <template v-else-if="modePaiement === 'En ligne'">
          <div class="bloc-info-methode">
            <p class="bloc-info-titre">Lien de paiement en ligne</p>
            <p>Un lien de paiement sécurisé peut être envoyé au client par SMS ou e-mail.</p>
          </div>
          <div class="champ">
            <label>Envoyer le lien à</label>
            <input v-model="reference" type="text" placeholder="Numéro ou e-mail du client" />
          </div>
        </template>

        <template v-else>
          <div class="bloc-info-methode">
            <p class="bloc-info-titre">Paiement en espèces</p>
            <p>Le client remet le montant directement à la réception.</p>
          </div>
        </template>

        <p class="etiquette-section">Statut de l'encaissement</p>
        <div class="choix-statut">
          <label :class="{ active: statutChoisi === 'Payé' }">
            <input type="radio" value="Payé" v-model="statutChoisi" />
            Encaissé maintenant
          </label>
          <label :class="{ active: statutChoisi === 'En attente' }">
            <input type="radio" value="En attente" v-model="statutChoisi" />
            En attente de confirmation
          </label>
        </div>

        <p v-if="erreur" class="message-erreur-paiement">{{ erreur }}</p>

        <div class="actions-etape">
          <button class="btn-discret" type="button" @click="etape = 1">Retour</button>
          <button class="btn-principal" type="button" @click="validerEtConfirmer">
            Confirmer le paiement de {{ montantTotalCalcule.toLocaleString('fr-FR') }} {{ devise }}
          </button>
        </div>
      </div>

      <!-- ── ÉTAPE 3 : traitement ──────────────────────────────────── -->
      <div v-else-if="etape === 3" class="corps-etape corps-traitement">
        <span class="rond-chargement"></span>
        <p class="traitement-titre">Traitement sécurisé en cours…</p>
        <p class="traitement-sous">Chiffrement et validation de la transaction</p>
      </div>

      <!-- ── ÉTAPE 4 : confirmation ────────────────────────────────── -->
      <div v-else class="corps-etape corps-confirmation">
        <span class="rond-succes">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.4">
            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <p class="confirmation-titre">
          {{ statutChoisi === 'Payé' ? 'Paiement encaissé' : 'Paiement enregistré, en attente' }}
        </p>
        <p class="confirmation-montant">{{ montantTotalCalcule.toLocaleString('fr-FR') }} {{ devise }}</p>

        <div class="recu">
          <div v-for="p in paiementsCrees" :key="p._id" class="recu-ligne">
            <span>{{ referenceCourte(p._id) }}</span>
            <span>{{ p.modePaiement }}</span>
            <strong>{{ p.montant.toLocaleString('fr-FR') }} {{ devise }}</strong>
          </div>
        </div>

        <button class="btn-principal" type="button" @click="terminer">Terminer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { paiementService } from '../services/api';

const props = defineProps({
  lignes: { type: Array, required: true }, // [{ reservationId, label, montant, devise }]
  titre: { type: String, default: 'Encaisser un paiement' },
});
const emit = defineEmits(['fermer', 'succes']);

const ICONE_CARTE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
const ICONE_ESPECES =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>';
const ICONE_VIREMENT =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9"/><path d="M3 21h18"/></svg>';
const ICONE_EN_LIGNE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>';

const METHODES = [
  { valeur: 'Espèces', libelle: 'Espèces', icone: ICONE_ESPECES },
  { valeur: 'Carte', libelle: 'Carte bancaire', icone: ICONE_CARTE },
  { valeur: 'Virement', libelle: 'Virement', icone: ICONE_VIREMENT },
  { valeur: 'En ligne', libelle: 'En ligne', icone: ICONE_EN_LIGNE },
];

const etape = ref(1);
const modePaiement = ref(null);
const statutChoisi = ref('Payé');
const erreur = ref('');
const reference = ref('');
const paiementsCrees = ref([]);

const carte = reactive({ numero: '', nom: '', expiration: '', cvv: '' });

const montantUnique = ref(props.lignes[0]?.montant || 0);
const devise = computed(() => props.lignes[0]?.devise || 'Ar');

const montantTotalCalcule = computed(() => {
  if (props.lignes.length === 1) return Number(montantUnique.value) || 0;
  return props.lignes.reduce((somme, l) => somme + l.montant, 0);
});

const numeroCarteAffiche = computed(() =>
  carte.numero.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
);

const marqueCarte = computed(() => {
  const premier = carte.numero.charAt(0);
  if (premier === '4') return 'VISA';
  if (premier === '5') return 'MASTERCARD';
  return '';
});

function onSaisieNumero(e) {
  carte.numero = e.target.value.replace(/\D/g, '').slice(0, 16);
}

function formaterExpiration(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
  carte.expiration = v;
}

function choisirMethode(valeur) {
  modePaiement.value = valeur;
  // Par défaut : encaissement immédiat pour espèces/carte, en attente pour virement/en ligne
  statutChoisi.value = valeur === 'Virement' || valeur === 'En ligne' ? 'En attente' : 'Payé';
}

function passerAuxDetails() {
  erreur.value = '';
  if (props.lignes.length === 1) {
    if (!montantUnique.value || montantUnique.value <= 0) {
      erreur.value = 'Le montant doit être supérieur à 0.';
      return;
    }
    if (montantUnique.value > props.lignes[0].montant) {
      erreur.value = 'Le montant dépasse le solde restant.';
      return;
    }
  }
  etape.value = 2;
}

function validerCarte() {
  if (carte.numero.replace(/\D/g, '').length !== 16) return 'Numéro de carte invalide (16 chiffres attendus).';
  if (!carte.nom.trim()) return 'Le nom du titulaire est requis.';
  if (!/^\d{2}\/\d{2}$/.test(carte.expiration)) return "Date d'expiration invalide (format MM/AA).";
  if (!/^\d{3}$/.test(carte.cvv)) return 'CVV invalide (3 chiffres attendus).';
  return '';
}

async function validerEtConfirmer() {
  erreur.value = '';
  if (modePaiement.value === 'Carte') {
    const messageErreur = validerCarte();
    if (messageErreur) {
      erreur.value = messageErreur;
      return;
    }
  }
  etape.value = 3;

  await new Promise((resolve) => setTimeout(resolve, 1100));

  try {
    const lignesAEncaisser =
      props.lignes.length === 1
        ? [{ ...props.lignes[0], montant: Number(montantUnique.value) }]
        : props.lignes;

    const resultats = [];
    for (const ligne of lignesAEncaisser) {
      const { data } = await paiementService.create({
        reservation: ligne.reservationId,
        montant: ligne.montant,
        modePaiement: modePaiement.value,
        statut: statutChoisi.value,
      });
      resultats.push(data.data);
    }
    paiementsCrees.value = resultats;
    etape.value = 4;
    emit('succes', resultats);
  } catch (err) {
    erreur.value = err.response?.data?.message || err.message;
    etape.value = 2;
  }
}

function referenceCourte(id) {
  return `REF-${String(id).slice(-6).toUpperCase()}`;
}

function tenterFermeture() {
  if (etape.value === 3) return; // ne pas interrompre un traitement en cours
  emit('fermer');
}

function terminer() {
  emit('fermer');
}
</script>

<style scoped>
.voile-paiement {
  position: fixed;
  inset: 0;
  background: rgba(24, 23, 15, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1000;
}

.panneau-paiement {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  font-family: var(--font-sans);
  color: var(--ink);
}

.entete-paiement {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.1rem;
}
.entete-titre-paiement {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}
.icone-cadenas {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand-dark);
  display: flex;
  align-items: center;
  justify-content: center;
}
.paiement-titre {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 600;
}
.paiement-soustitre {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.1rem;
}
.bouton-fermer {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: var(--muted);
}

.rail-etapes {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  font-size: 0.72rem;
  color: var(--muted);
}
.rail-etapes .trait {
  flex: 1;
  height: 1px;
  background: var(--ligne);
}
.rail-etapes .active {
  color: var(--brand-dark);
  font-weight: 600;
}
.rail-etapes .fait {
  color: var(--brass);
}

.corps-etape {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.recap-lignes {
  background: var(--paper);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ligne-recap {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
}
.champ-montant label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 0.3rem;
}
.ligne-montant-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  padding: 0 0.7rem;
}
.ligne-montant-input input {
  border: none;
  padding: 0.5rem 0;
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
}
.ligne-montant-input input:focus {
  outline: none;
}
.devise-suffixe {
  font-size: 0.8rem;
  color: var(--muted);
}
.aide-montant {
  font-size: 0.75rem;
  color: var(--brass);
  margin-top: 0.4rem;
}

.ligne-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.95rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--ligne);
}
.ligne-total strong {
  font-family: var(--font-serif);
  font-size: 1.3rem;
}

.etiquette-section {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.grille-methodes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}
.carte-methode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--ligne);
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  font-family: inherit;
}
.carte-methode.active {
  border-color: var(--brand-dark);
  background: var(--brand-light);
}
.icone-methode {
  display: flex;
  color: var(--brand-dark);
}

.message-erreur-paiement {
  font-size: 0.82rem;
  color: var(--danger);
  background: var(--danger-bg);
  border-radius: 7px;
  padding: 0.5rem 0.7rem;
}

.actions-etape {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

/* ── Visuel carte bancaire ──────────────────────────────────── */
.visuel-carte {
  background: linear-gradient(135deg, var(--brand-dark), var(--brand));
  color: #f3efe4;
  border-radius: 12px;
  padding: 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.visuel-carte-haut {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.marque-carte {
  font-weight: 700;
  letter-spacing: 0.04em;
  font-size: 0.85rem;
}
.visuel-carte-numero {
  font-family: 'Courier New', monospace;
  font-size: 1.15rem;
  letter-spacing: 0.08em;
}
.visuel-carte-bas {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}
.visuel-carte-etiquette {
  display: block;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brass-light);
  margin-bottom: 0.15rem;
}

.bloc-info-methode {
  background: var(--paper);
  border-radius: 10px;
  padding: 0.9rem 1rem;
  font-size: 0.85rem;
}
.bloc-info-titre {
  font-weight: 600;
  margin-bottom: 0.3rem;
}
.rib {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.75rem;
  margin-top: 0.6rem;
  font-size: 0.82rem;
}
.rib span {
  color: var(--muted);
}

.choix-statut {
  display: flex;
  gap: 0.6rem;
}
.choix-statut label {
  flex: 1;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}
.choix-statut label.active {
  border-color: var(--brand-dark);
  background: var(--brand-light);
}

/* ── Traitement / confirmation ──────────────────────────────── */
.corps-traitement,
.corps-confirmation {
  align-items: center;
  text-align: center;
  padding: 1.5rem 0;
}

.rond-chargement {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid var(--ligne);
  border-top-color: var(--brand-dark);
  animation: tourner 0.8s linear infinite;
}
@keyframes tourner {
  to {
    transform: rotate(360deg);
  }
}
.traitement-titre {
  font-weight: 600;
  margin-top: 1rem;
}
.traitement-sous {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.2rem;
}

.rond-succes {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand-dark);
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirmation-titre {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 600;
  margin-top: 0.9rem;
}
.confirmation-montant {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-dark);
  margin-top: 0.2rem;
}
.recu {
  width: 100%;
  background: var(--paper);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin: 1.1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.recu-ligne {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
}
.corps-confirmation .btn-principal {
  width: 100%;
}
</style>
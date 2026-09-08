<template>
  <div class="page-reservations">
    <!-- ── En-tête ────────────────────────────────────────────── -->
    <header class="entete">
      <div class="entete-titre">
        <p class="entete-marque">Tsara Trace</p>
        <h1>Réservations</h1>
      </div>
      <button class="btn-principal" @click="afficherFormulaire = !afficherFormulaire">
        + Nouvelle réservation
      </button>
    </header>

    <!-- ── Formulaire de création ─────────────────────────────── -->
    <div class="panneau-formulaire" v-if="afficherFormulaire && !resultatCreation">
      <form @submit.prevent="soumettre">
        <fieldset class="section">
          <legend>Informations du client</legend>
          <div class="ligne-champs">
            <div class="champ">
              <label>Nom complet</label>
              <input v-model.trim="form.nomComplet" type="text" required />
            </div>
            <div class="champ">
              <label>CIN</label>
              <input v-model.trim="form.cin" type="text" required />
            </div>
          </div>
          <div class="ligne-champs">
            <div class="champ">
              <label>Numéro de téléphone</label>
              <input v-model.trim="form.telephone" type="tel" required />
            </div>
            <div class="champ">
              <label>Adresse e-mail</label>
              <input v-model.trim="form.email" type="email" />
            </div>
          </div>
        </fieldset>

        <fieldset class="section">
          <legend>Détails de la réservation</legend>
          <div class="ligne-champs">
            <div class="champ">
              <label>Date d'arrivée</label>
              <input v-model="form.dateArrivee" type="date" required />
            </div>
            <div class="champ">
              <label>Date de départ</label>
              <input v-model="form.dateDepart" type="date" required />
            </div>
            <div class="champ champ-etroit">
              <label>Personnes</label>
              <input v-model.number="form.nombrePersonnes" type="number" min="1" required />
            </div>
            <div class="champ champ-etroit">
              <label>Chambres</label>
              <input :value="nombreDeChambresTotal" type="number" disabled />
            </div>
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
            <label>Demande spéciale (facultatif)</label>
            <textarea
              v-model="form.demandeSpeciale"
              rows="2"
              placeholder="Ex : étage élevé, chambre communicante..."
            ></textarea>
          </div>
        </fieldset>

        <div class="actions-formulaire">
          <button class="btn-principal" type="submit" :disabled="envoiEnCours">
            {{ envoiEnCours ? 'Réservation en cours...' : 'Réserver' }}
          </button>
          <button class="btn-discret" type="button" @click="fermerFormulaire">Annuler</button>
        </div>

        <p v-if="erreur" class="message-erreur">{{ erreur }}</p>
        <p v-if="messageSucces" class="message-succes">{{ messageSucces }}</p>
      </form>
    </div>

    <!-- ── Réservation créée : passage au paiement ───────────────── -->
    <div class="panneau-formulaire panneau-post-creation" v-if="resultatCreation">
      <div class="post-creation-entete">
        <span class="post-creation-icone">✓</span>
        <div>
          <h2>Réservation enregistrée</h2>
          <p class="post-creation-sous-titre" v-if="resultatCreation[0]?.enAttenteValidation">
            En attente de validation (demande spéciale à traiter) — le paiement peut néanmoins être
            encaissé dès maintenant.
          </p>
          <p class="post-creation-sous-titre" v-else>
            Vous pouvez encaisser un acompte ou le solde total dès maintenant, ou le faire plus tard
            depuis l'écran Paiements.
          </p>
        </div>
      </div>

      <div class="liste-post-creation">
        <div v-for="r in resultatCreation" :key="r._id" class="ligne-post-creation">
          <span>
            {{ r.client?.nom }} — Chambre {{ r.chambre?.numero }} ({{ r.chambre?.typeLit }})
          </span>
          <strong>{{ (r.montantTotal - r.montantPaye).toLocaleString('fr-FR') }} {{ r.devise || 'Ar' }}</strong>
        </div>
      </div>

      <div class="actions-formulaire">
        <button class="btn-principal" type="button" @click="afficherPaiementApresCreation = true">
          Encaisser maintenant
        </button>
        <button class="btn-discret" type="button" @click="terminerSansEncaisser">
          Terminer sans encaisser
        </button>
      </div>
    </div>

    <PaiementSecurise
      v-if="afficherPaiementApresCreation"
      :lignes="lignesPaiementCreation"
      titre="Encaisser cette réservation"
      @fermer="afficherPaiementApresCreation = false"
      @succes="surPaiementApresCreation"
    />

    <!-- ── Groupes en attente de validation ───────────────────── -->
    <div class="panneau-attente" v-if="groupesEnAttente.length">
      <h2>Réservations en attente de validation ({{ groupesEnAttente.length }})</h2>

      <div v-for="groupe in groupesEnAttente" :key="groupe.groupeReservationId" class="groupe-attente">
        <div class="groupe-entete">
          <div>
            <strong>{{ groupe.client?.nom }}</strong>
            — {{ formatDate(groupe.dateArrivee) }} → {{ formatDate(groupe.dateDepart) }}
          </div>
          <div class="demande-speciale"><em>Demande spéciale :</em> {{ groupe.demandeSpeciale }}</div>
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
                  class="btn-discret btn-petit"
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
          <button class="btn-principal" @click="validerGroupe(groupe.groupeReservationId)">
            Valider le groupe
          </button>
        </div>
        <p v-if="erreurGroupe[groupe.groupeReservationId]" class="message-erreur">
          {{ erreurGroupe[groupe.groupeReservationId] }}
        </p>
      </div>
    </div>

    <!-- ── Filtres ────────────────────────────────────────────── -->
    <div class="barre-filtres">
      <div class="pastilles-categories">
        <button
          class="pastille"
          :class="{ active: statutActif === 'Toutes' }"
          @click="statutActif = 'Toutes'"
        >
          Toutes <span class="compteur">{{ store.reservations.length }}</span>
        </button>
        <button
          v-for="s in STATUTS_FILTRE"
          :key="s.valeur"
          class="pastille"
          :class="{ active: statutActif === s.valeur }"
          @click="statutActif = s.valeur"
        >
          {{ s.libelle }} <span class="compteur">{{ compteParStatut[s.valeur] || 0 }}</span>
        </button>
      </div>
      <div class="champ-recherche-conteneur">
        <span class="icone-recherche">🔍</span>
        <input
          v-model="recherche"
          type="text"
          class="champ-recherche"
          placeholder="Rechercher un client ou une chambre..."
          autocomplete="off"
        />
      </div>
    </div>

    <!-- ── Grille de cartes (triée par numéro de chambre croissant) ─ -->
    <div class="grille-reservations" v-if="reservationsFiltrees.length">
      <article
        v-for="r in reservationsFiltrees"
        :key="r._id"
        class="carte-reservation"
        :class="`statut-${r.statutReservation}`"
      >
        <div class="carte-entete">
          <div>
            <p class="carte-client">{{ r.client?.nom }} {{ r.client?.prenom }}</p>
            <p class="carte-chambre-num">Chambre {{ r.chambre?.numero }} · {{ r.chambre?.typeLit }}</p>
          </div>
          <span class="pastille-statut" :class="`pastille-${r.statutReservation}`">
            <i class="point-statut"></i>{{ r.statut }}
          </span>
        </div>

        <div class="carte-dates">
          <div>
            <span class="etiquette">Arrivée</span>
            <strong>{{ formatDate(r.dateArrivee) }}</strong>
          </div>
          <div class="fleche-dates">→</div>
          <div>
            <span class="etiquette">Départ</span>
            <strong>{{ formatDate(r.dateDepart) }}</strong>
          </div>
        </div>

        <div class="carte-infos-secondaires">
          <span>{{ r.nombreAdultes }} ad.{{ r.nombreEnfants ? ` + ${r.nombreEnfants} enf.` : '' }}</span>
          <span v-if="r.client?.telephone">📞 {{ r.client.telephone }}</span>
          <span v-if="r.client?.cin">CIN {{ r.client.cin }}</span>
        </div>

        <p v-if="r.preferences" class="carte-demande-speciale">
          <span class="etiquette">Demande spéciale</span>
          {{ r.preferences }}
        </p>

        <div class="carte-montant">
          <span class="carte-total">
            {{ r.montantTotal.toLocaleString('fr-FR') }} {{ r.devise || 'Ar' }}
          </span>
          <span class="pastille-paiement" :class="badgePaiementClass(r.statutPaiement)">
            {{ r.statutPaiement }}
          </span>
        </div>

        <p class="carte-date-creation">Créée le {{ formatDate(r.createdAt) }}</p>

        <div class="carte-actions">
          <button
            v-if="r.statutReservation === 'confirmee'"
            class="btn-discret btn-petit"
            @click="changerCycle(r, 'check_in_fait')"
          >
            Check-in
          </button>
          <button
            v-if="r.statutReservation === 'check_in_fait'"
            class="btn-discret btn-petit"
            @click="changerCycle(r, 'check_out_fait')"
          >
            Check-out
          </button>
          <button
            v-if="['confirmee', 'en_attente_paiement'].includes(r.statutReservation)"
            class="btn-danger btn-petit"
            @click="annuler(r)"
          >
            Annuler
          </button>
        </div>
      </article>
    </div>

    <p v-else-if="!store.loading" class="etat-vide">Aucune réservation ne correspond à cette recherche.</p>
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
const statutActif = ref('Toutes');
const recherche = ref('');

const selectionsReassignation = reactive({});
const erreurGroupe = reactive({});

const typesChambreDisponibles = ['Simple', 'Double', 'Twin', 'Triple', 'Quadruple', 'Queen', 'King'];

const STATUTS_FILTRE = [
  { valeur: 'confirmee', libelle: 'Confirmées' },
  { valeur: 'en_attente_paiement', libelle: 'En attente' },
  { valeur: 'check_in_fait', libelle: 'En cours' },
  { valeur: 'check_out_fait', libelle: 'Terminées' },
  { valeur: 'annulee', libelle: 'Annulées' },
];

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
    if (selectionsReassignation[r._id] === undefined) {
      selectionsReassignation[r._id] = r.chambre?._id;
    }
  }

  return Array.from(groupes.values());
});

function chambresMemeTypeDisponibles(typeLit, chambreActuelleId) {
  return chambresStore.chambres.filter((c) => c.typeLit === typeLit && c._id !== chambreActuelleId);
}

const compteParStatut = computed(() => {
  const compte = {};
  for (const r of store.reservations) {
    compte[r.statutReservation] = (compte[r.statutReservation] || 0) + 1;
  }
  return compte;
});

// NOUVEAU — tri croissant par numéro de chambre (tri "naturel" : 002, 003 ... 010, 061,
// pas un tri texte brut qui placerait "10" avant "2"), appliqué APRÈS le filtrage.
const reservationsFiltrees = computed(() => {
  let liste = store.reservations;

  if (statutActif.value !== 'Toutes') {
    liste = liste.filter((r) => r.statutReservation === statutActif.value);
  }

  if (recherche.value.trim()) {
    const terme = recherche.value.trim().toLowerCase();
    liste = liste.filter(
      (r) =>
        r.client?.nom?.toLowerCase().includes(terme) ||
        r.client?.prenom?.toLowerCase().includes(terme) ||
        r.chambre?.numero?.toLowerCase().includes(terme)
    );
  }

  return [...liste].sort((a, b) => {
    const numA = a.chambre?.numero || '';
    const numB = b.chambre?.numero || '';
    return numA.localeCompare(numB, undefined, { numeric: true });
  });
});

async function reassignerChambre(reservation) {
  const nouvelleChambreId = selectionsReassignation[reservation._id];
  const groupeId = reservation.groupeReservationId;
  erreurGroupe[groupeId] = '';

  const resultat = await store.modifierReservation(reservation._id, { chambre: nouvelleChambreId });
  if (!resultat.success) {
    erreurGroupe[groupeId] = resultat.message;
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
.page-reservations {
  font-family: var(--font-sans);
  color: var(--ink);
}

/* ── En-tête ─────────────────────────────────────────────── */
.entete {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
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
.entete-titre h1 {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-size: 2rem;
  font-weight: 600;
}

/* ── Boutons ─────────────────────────────────────────────── */
.btn-principal {
  padding: 0.6rem 1.15rem;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-principal:hover {
  background: var(--brand-dark);
}
.btn-principal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-discret {
  padding: 0.6rem 1.15rem;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--ligne);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-danger {
  padding: 0.6rem 1.15rem;
  background: #fbeae2;
  color: #a04324;
  border: 1px solid #f0c9b6;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-petit {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
}

/* ── Formulaire ──────────────────────────────────────────── */
.panneau-formulaire {
  background: #fff;
  border: 1px solid var(--ligne);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.75rem;
  max-width: 680px;
}
.section {
  border: 1px solid var(--ligne);
  border-radius: 10px;
  padding: 1rem 1.25rem 1.25rem;
  margin: 0 0 1.25rem;
}
.section legend {
  padding: 0 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: #6b6656;
}
.ligne-champs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.champ {
  flex: 1;
  margin-bottom: 1rem;
}
.ligne-champs .champ {
  margin-bottom: 0;
}
.champ-etroit {
  flex: 0 0 100px;
}
.champ label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b6656;
}
.champ input,
.champ select,
.champ textarea {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--ligne);
  border-radius: 7px;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  color: var(--ink);
}
.champ input:disabled {
  background: #f2f0ea;
  color: #8a8578;
}
.champ input:focus,
.champ select:focus,
.champ textarea:focus {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
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
  border: 1px solid var(--ligne);
  border-radius: 7px;
  cursor: pointer;
}
.ligne-type input[type='checkbox'] {
  width: auto;
}
.nom-type {
  flex: 1;
  font-size: 0.88rem;
}
.input-quantite {
  width: 70px !important;
}
.actions-formulaire {
  display: flex;
  gap: 0.6rem;
}
.message-erreur {
  margin-top: 0.75rem;
  color: #b5502f;
  font-size: 0.85rem;
}
.message-succes {
  margin-top: 0.75rem;
  color: #157a4f;
  font-size: 0.85rem;
}

/* ── Panneau attente ─────────────────────────────────────── */
.panneau-attente {
  background: #fdf3d9;
  border: 1px solid #f0dca0;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.75rem;
}
.panneau-attente h2 {
  margin: 0 0 0.75rem;
  font-family: 'Fraunces', serif;
  font-size: 1.15rem;
  color: #8a6a08;
}
.groupe-attente {
  border-top: 1px solid #f0dca0;
  padding: 1rem 0;
}
.groupe-attente:first-of-type {
  border-top: none;
  padding-top: 0.25rem;
}
.groupe-entete {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}
.demande-speciale {
  font-size: 0.85rem;
  color: #78350f;
}
.table-groupe {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}
.table-groupe th {
  text-align: left;
  font-weight: 600;
  padding: 0.3rem 0.4rem;
  color: #6b6656;
}
.table-groupe td {
  padding: 0.3rem 0.4rem;
}
.table-groupe select {
  padding: 0.3rem;
  border-radius: 6px;
  border: 1px solid var(--ligne);
  font-family: inherit;
}
.groupe-actions {
  display: flex;
  justify-content: flex-end;
}

/* ── Filtres ─────────────────────────────────────────────── */
.barre-filtres {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
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
  transition: all 0.15s ease;
}
.pastille .compteur {
  color: #9c9788;
  font-variant-numeric: tabular-nums;
}
.pastille.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.pastille.active .compteur {
  color: #d6ece7;
}

/* NOUVEAU — champ de recherche avec icône, réactivité instantanée via v-model */
.champ-recherche-conteneur {
  position: relative;
  min-width: 260px;
}
.icone-recherche {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  opacity: 0.5;
  pointer-events: none;
}
.champ-recherche {
  width: 100%;
  padding: 0.5rem 0.9rem 0.5rem 2rem;
  border: 1px solid var(--ligne);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  background: #fff;
  box-sizing: border-box;
}
.champ-recherche:focus {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
}

/* ── Grille de cartes ────────────────────────────────────── */
.grille-reservations {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
.carte-reservation {
  background: #fff;
  border: 1px solid var(--ligne);
  border-left: 3px solid transparent;
  border-radius: 10px;
  padding: 1.1rem 1.2rem;
}
.carte-reservation.statut-confirmee {
  border-left-color: #1f8a5f;
}
.carte-reservation.statut-en_attente_paiement {
  border-left-color: #b8860b;
}
.carte-reservation.statut-check_in_fait {
  border-left-color: #2563a8;
}
.carte-reservation.statut-check_out_fait {
  border-left-color: #8a8578;
}
.carte-reservation.statut-annulee {
  border-left-color: #b5502f;
  opacity: 0.75;
}

.carte-entete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.carte-client {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-size: 1.1rem;
  font-weight: 600;
}
.carte-chambre-num {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #6b6656;
}

.pastille-statut {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}
.point-statut {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.pastille-confirmee {
  background: #e4f5ec;
  color: #157a4f;
}
.pastille-confirmee .point-statut {
  background: #1f8a5f;
}
.pastille-en_attente_paiement {
  background: #fdf3d9;
  color: #8a6a08;
}
.pastille-en_attente_paiement .point-statut {
  background: #b8860b;
}
.pastille-check_in_fait {
  background: #e1ecf7;
  color: #1d4e89;
}
.pastille-check_in_fait .point-statut {
  background: #2563a8;
}
.pastille-check_out_fait {
  background: #eeece5;
  color: #6b6656;
}
.pastille-check_out_fait .point-statut {
  background: #8a8578;
}
.pastille-annulee {
  background: #fbeae2;
  color: #a04324;
}
.pastille-annulee .point-statut {
  background: #b5502f;
}

.carte-dates {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0;
  border-top: 1px solid var(--ligne);
  border-bottom: 1px solid var(--ligne);
  margin-bottom: 0.65rem;
}
.carte-dates > div {
  flex: 1;
}
.etiquette {
  display: block;
  font-size: 0.68rem;
  color: #9c9788;
  margin-bottom: 0.1rem;
}
.carte-dates strong {
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}
.fleche-dates {
  color: #9c9788;
  padding-top: 0.8rem;
}

.carte-infos-secondaires {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
  font-size: 0.8rem;
  color: #6b6656;
  margin-bottom: 0.65rem;
}

.carte-demande-speciale {
  margin: 0 0 0.65rem;
  padding: 0.5rem 0.6rem;
  background: #f7f4ef;
  border-radius: 7px;
  font-size: 0.8rem;
  color: #5a5648;
}
.carte-demande-speciale .etiquette {
  display: inline;
  margin-right: 0.3rem;
  color: #9c9788;
}

.carte-montant {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.carte-total {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--brass);
}
.pastille-paiement {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
}
.badge-non-paye {
  background: #fbeae2;
  color: #a04324;
}
.badge-partiel {
  background: #fdf3d9;
  color: #8a6a08;
}
.badge-paye {
  background: #e4f5ec;
  color: #157a4f;
}
.badge-rembourse {
  background: #eee9f9;
  color: #6d28d9;
}

.carte-date-creation {
  margin: 0 0 0.75rem;
  font-size: 0.7rem;
  color: #9c9788;
}

.carte-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding-top: 0.65rem;
  border-top: 1px solid var(--ligne);
}

.etat-vide {
  padding: 2.5rem 0;
  text-align: center;
  color: #9c9788;
}

@media (max-width: 640px) {
  .entete {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .barre-filtres {
    flex-direction: column;
    align-items: stretch;
  }
  .champ-recherche-conteneur {
    min-width: 0;
  }
  .ligne-champs {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
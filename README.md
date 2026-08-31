# Application de Gestion Hôtelière — Stack MEVN

Projet L3 Génie Logiciel. Stack: **M**ongoDB, **E**xpress, **V**ue 3, **N**ode.js.

## Structure

```
hotel-mevn/
├── backend/          # API Express + Mongoose
│   ├── config/        # Connexion MongoDB
│   ├── models/        # Chambre, Client, Reservation, Paiement
│   ├── controllers/    # Logique métier
│   ├── routes/         # Routes REST
│   ├── middleware/     # Gestion des erreurs
│   └── server.js
└── frontend/         # Vue 3 + Vite + Pinia
    └── src/
        ├── views/       # Dashboard, Chambres, Reservations, Calendrier, Paiements
        ├── stores/       # État global (Pinia)
        ├── services/     # Appels API (axios)
        └── router/
```

## Installation

### Prérequis
- Node.js ≥ 18
- MongoDB (local ou Atlas)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # adapter MONGO_URI si besoin
npm run dev             # nécessite nodemon (npm install -g nodemon), sinon: npm start
```

L'API tourne sur `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend tourne sur `http://localhost:5173` (proxy `/api` configuré vers le port 5000).

## Fonctionnalités implémentées

| Module | Backend | Frontend |
|---|---|---|
| Chambres (CRUD + statut) | ✅ | ✅ |
| Réservations + anti-doublon | ✅ | ✅ |
| Paiements + calcul auto | ✅ | ✅ (basique) |
| Disponibilité / calendrier | ✅ | ✅ (liste par chambre) |
| Statistiques (occupation, CA) | ✅ | ✅ (dashboard + graphique) |
| Clients (CRUD) | ✅ | non (à faire) |

## Points clés d'implémentation

- **Contrôle des doublons** (`reservationController.js` → `chambreEstDisponible`): vérifie le
  chevauchement de dates avec `dateArrivee < finDemandee && dateDepart > debutDemandee` sur les
  réservations actives (`Confirmée`/`En cours`) de la même chambre.
- **Facturation automatique** (`paiementController.js`): montant = nombre de nuits × prix de la
  chambre, calculé côté serveur à la création du paiement (jamais côté client, pour éviter la
  manipulation du montant).
- **Statistiques mensuelles** (`statsController.js`): taux d'occupation = nuits réservées dans le
  mois / (nombre de chambres × jours du mois). Le CA ne compte que les paiements au statut "Payé".

## Pistes d'amélioration à développer (selon le temps disponible)

- Authentification (réceptionniste/admin) avec JWT
- CRUD Client côté frontend (formulaire dans Réservations pour créer un client à la volée)
- Calendrier visuel type grille (librairie `v-calendar` ou `@fullcalendar/vue3`) au lieu de la
  liste actuelle
- Validation des formulaires plus poussée (ex: `vee-validate`)
- Tests (Jest/Vitest + Supertest pour l'API)
- Export PDF des factures (ex: `pdfkit` côté backend)

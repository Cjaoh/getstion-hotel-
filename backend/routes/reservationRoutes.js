const express = require('express');
const router = express.Router();
const {
  getReservations,
  getReservation,
  createReservation,
  creerReservationGroupee,
  validerGroupeReservation,
  updateReservation,
  annulerReservation,
  deleteReservation,
} = require('../controllers/reservationController');
const { protect, autorize } = require('../middleware/authMiddleware');

router.use(protect);

// IMPORTANT : ces routes '/groupe/...' doivent être déclarées AVANT '/:id'
router.route('/groupe').post(creerReservationGroupee);
router.route('/groupe/:groupeReservationId/valider').patch(validerGroupeReservation);

router.route('/').get(getReservations).post(createReservation);
router
  .route('/:id')
  .get(getReservation)
  .put(updateReservation)
  .delete(autorize('admin'), deleteReservation);
router.route('/:id/annuler').patch(annulerReservation);

module.exports = router;
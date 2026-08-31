const express = require('express');
const router = express.Router();
const {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  annulerReservation,
  deleteReservation,
} = require('../controllers/reservationController');

router.route('/').get(getReservations).post(createReservation);
router.route('/:id').get(getReservation).put(updateReservation).delete(deleteReservation);
router.route('/:id/annuler').patch(annulerReservation);

module.exports = router;

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
const { protect, autorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getReservations).post(createReservation);
router
  .route('/:id')
  .get(getReservation)
  .put(updateReservation)
  .delete(autorize('admin'), deleteReservation);
router.route('/:id/annuler').patch(annulerReservation);

module.exports = router;
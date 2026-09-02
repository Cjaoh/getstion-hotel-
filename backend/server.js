require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connexion à la base de données
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chambres', require('./routes/chambreRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/paiements', require('./routes/paiementRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/disponibilite', require('./routes/disponibiliteRoutes'));
app.use('/api/verrous', require('./routes/verrouRoutes'));

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API de Gestion Hôtelière — MEVN Stack' });
});

// Gestion des erreurs (doit être en dernier)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Middleware global de gestion des erreurs
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let message = err.message || 'Erreur serveur';
  let statusCode = err.statusCode || 500;

  if (err.name === 'CastError') {
    message = 'Ressource non trouvée (ID invalide)';
    statusCode = 404;
  }

  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;

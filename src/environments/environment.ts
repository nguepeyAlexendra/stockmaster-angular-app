// Détection automatique de l'environnement
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

export const environment = {
  production: !isLocal,
  apiUrl: isLocal 
    ? 'http://127.0.0.1:8000/api' 
    : 'https://mon-backend-django.onrender.com/api'
};
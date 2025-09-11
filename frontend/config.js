// Centralized API configuration for frontend
// Detect environment by hostname and choose API base accordingly
// Netlify site hostname is jjsecondaryschool.netlify.app
(function() {
    var isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);
    // Allow override via query or global if needed
    var explicit = window.__API_BASE__ || null;
    var productionBase = 'https://<your-render-service>.onrender.com'; // TODO: replace with actual Render URL
    var developmentBase = 'http://localhost:3000';
    var base = explicit || (isLocal ? developmentBase : productionBase);
    window.API_BASE = base.replace(/\/$/, '');
})();



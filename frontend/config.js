// Centralized API configuration for frontend
// Detect environment by hostname and choose API base accordingly
// Netlify site hostname is jjsecondaryschool.netlify.app
(function() {
    var isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);
    // Allow override via query or global if needed
    var explicit = window.__API_BASE__ || null;
    var productionBase = 'https://jjschoolbackendserver.onrender.com';
    var developmentBase = 'http://localhost:3000';
    var base = explicit || (isLocal ? developmentBase : productionBase);
    window.API_BASE = base.replace(/\/$/, '');
    
    // Log API configuration for debugging
    console.log('🔧 API Configuration:');
    console.log('   - Hostname:', window.location.hostname);
    console.log('   - Is Local:', isLocal);
    console.log('   - API Base:', window.API_BASE);
    console.log('   - Environment:', isLocal ? 'Development' : 'Production');
})();



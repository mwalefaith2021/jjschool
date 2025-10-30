// Minimal, unified auth without tokens
(function() {
  function genSessionKey() {
    // Lightweight random key to mark an active tab session
    return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function setSession(user) {
    // First, clear any existing session data
    clearSession();
    
    // Persist lightweight session info only (no tokens)
    localStorage.setItem('userType', user.role || 'student');
    localStorage.setItem('username', user.username || '');
    localStorage.setItem('userProfile', JSON.stringify(user));

    // Mark an active session for this tab only
    sessionStorage.setItem('sessionKey', genSessionKey());
    // Store current session epoch to detect logout from other tabs
    const epoch = String(Date.now());
    localStorage.setItem('sessionEpoch', epoch);
  }

  function clearSession() {
    ['userType', 'username', 'userProfile', 'token'].forEach(k => localStorage.removeItem(k));
    // Broadcast a logout by bumping the epoch
    localStorage.setItem('sessionEpoch', String(Date.now()));
    // Clear volatile tab key
    sessionStorage.removeItem('sessionKey');
  }

  async function apiLogin(username, password) {
    console.log('Attempting login for username:', username);
    console.log('API URL:', `${API_BASE}/api/login`);
    console.log('Request payload:', { username, password: '***' });

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      console.log('Login response status:', res.status);
      console.log('Response headers:', Array.from(res.headers.entries()));

      // Always try to parse response body for better error info
      const json = await res.json().catch(e => ({ message: 'Could not parse response' }));
      console.log('Response body:', json);

      if (!res.ok) {
        throw new Error(json.message || 'Login failed');
      }

      return json;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  // No-token "verification": ensure minimal session info exists
  async function verifySession() {
    const hasUser = !!localStorage.getItem('username');
    if (!hasUser) clearSession();
    return hasUser;
  }

  async function handleLogin(username, password) {
    console.log('handleLogin called for:', username);
    
    try {
      // First clear any existing session
      clearSession();
      
      // Attempt login
      const response = await apiLogin(username, password);
      console.log('Login response parsed:', { hasUser: !!response.user });
      
      // Validate response contains required data
      if (!response.user) {
        throw new Error('Invalid login response: missing user data');
      }
      
      const { user } = response;
      
      // Set session data (no token)
      setSession(user);
      
      // Check for password reset requirement before redirecting
      if (user.requiresPasswordReset) {
        if (typeof showAdminPasswordResetModal === 'function' && user.role === 'admin') {
          showAdminPasswordResetModal(user.id);
          return;
        }
        // TODO: Handle student password reset if needed
      }
      
      // Redirect based on role
      const redirectPath = user.role === 'admin' ? 'admindashboard.html' : 'studentdashboard.html';
      console.log(`Redirecting ${user.role} to ${redirectPath}`);
      window.location.replace(redirectPath);
      
    } catch (error) {
      // Clear session on any error
      clearSession();
      throw error;
    }
  }

  function isAuthed(requiredRole) {
    const username = localStorage.getItem('username');
    const userType = localStorage.getItem('userType');
    const tabKey = sessionStorage.getItem('sessionKey');
    if (!username || !userType || !tabKey) return false;
    if (requiredRole && userType !== requiredRole) return false;
    return true;
  }

  function installGuards(requiredRole) {
    const ensure = () => {
      if (!isAuthed(requiredRole)) {
        // Defensive clear to avoid stale state and cached pages
        sessionStorage.removeItem('sessionKey');
        window.location.replace('login.html');
      }
    };

    // Immediate check
    ensure();

    // Back/forward cache and history navigation
    window.addEventListener('pageshow', () => ensure());
    if (window.history && window.history.pushState) {
      try {
        window.history.pushState(null, null, window.location.href);
        window.addEventListener('popstate', ensure);
      } catch (_) {}
    }

    // When tab becomes visible again
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ensure(); });

    // Cross-tab logout broadcast
    window.addEventListener('storage', (ev) => {
      if (ev.key === 'sessionEpoch') ensure();
      if (ev.key === 'userType' || ev.key === 'username') ensure();
    });
  }

  // Auto-guard dashboards based on path
  document.addEventListener('DOMContentLoaded', () => {
    const path = (location.pathname || '').toLowerCase();
    if (path.includes('admindashboard')) installGuards('admin');
    if (path.includes('studentdashboard')) installGuards('student');
  });

  window.Auth = { login: handleLogin, verify: verifySession, clear: clearSession, installGuards, isAuthed };
})();

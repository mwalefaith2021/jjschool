// Minimal, unified auth without tokens
(function() {
  function setSession(user) {
    // First, clear any existing session data
    clearSession();
    
    // Persist lightweight session info only (no tokens)
    localStorage.setItem('userType', user.role || 'student');
    localStorage.setItem('username', user.username || '');
    localStorage.setItem('userProfile', JSON.stringify(user));
  }

  function clearSession() {
    ['userType', 'username', 'userProfile', 'token'].forEach(k => localStorage.removeItem(k));
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

  window.Auth = { login: handleLogin, verify: verifySession, clear: clearSession };
})();

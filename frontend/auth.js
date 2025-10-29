// Minimal, unified auth for Netlify + Render (no admin-specific extras)
(function() {
  function setSession(user, token) {
    // First, clear any existing session data
    clearSession();
    
    // Set all session data
    localStorage.setItem('userType', user.role || 'student');
    localStorage.setItem('username', user.username || '');
    localStorage.setItem('userProfile', JSON.stringify(user));
    
    // Set token in localStorage and through window.setAuthToken if available
    localStorage.setItem('token', token);
    if (window.setAuthToken) {
      window.setAuthToken(token);
      console.log('Auth token set via setAuthToken');
    } else {
      console.log('Auth token stored in localStorage');
    }
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

  async function verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found in localStorage');
      return false;
    }
    try {
      // Use apiFetch if available, otherwise manually add token to headers
      const res = await (window.apiFetch ? 
        window.apiFetch(`${API_BASE}/api/verify`) : 
        fetch(`${API_BASE}/api/verify`, { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })
      );
      
      // If response is not ok, clear session
      if (!res.ok) {
        console.log('Token verification failed:', res.status);
        clearSession();
        return false;
      }
      
      console.log('Token verified successfully');
      return true;
    } catch (e) { 
      console.log('Token verification error:', e.message);
      clearSession();
      return false; 
    }
  }

  async function handleLogin(username, password) {
    console.log('handleLogin called for:', username);
    
    try {
      // First clear any existing session
      clearSession();
      
      // Attempt login
      const response = await apiLogin(username, password);
      console.log('Login response parsed:', { hasUser: !!response.user, hasToken: !!response.token });
      
      // Validate response contains required data
      if (!response.user) {
        throw new Error('Invalid login response: missing user data');
      }
      if (!response.token) {
        console.error('Login succeeded but no token returned from server', { user: response.user });
        throw new Error('Login did not return an authentication token. Please contact support.');
      }
      
      const { user, token } = response;
      
      // Set session data
      setSession(user, token);
      
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

  window.Auth = { login: handleLogin, verify: verifyToken, clear: clearSession };
})();

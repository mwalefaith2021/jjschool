// Minimal, unified auth for Netlify + Render (no admin-specific extras)
(function() {
  function setSession(user, token) {
    localStorage.setItem('userType', user.role || 'student');
    localStorage.setItem('username', user.username || '');
    localStorage.setItem('userProfile', JSON.stringify(user));
    localStorage.setItem('token', token);
  }

  function clearSession() {
    ['userType', 'username', 'userProfile', 'token'].forEach(k => localStorage.removeItem(k));
  }

  async function apiLogin(username, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      let msg = 'Login failed';
      try { const j = await res.json(); msg = j.message || msg; } catch {}
      throw new Error(msg);
    }
    const json = await res.json();
    console.log('apiLogin response:', json);
    return json;
  }

  async function verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await (window.apiFetch ? window.apiFetch(`${API_BASE}/api/verify`) : fetch(`${API_BASE}/api/verify`, { headers: { 'Authorization': `Bearer ${token}` } }));
      return res.ok;
    } catch { return false; }
  }

  async function handleLogin(username, password) {
    const { user, token } = await apiLogin(username, password);
    if (!user) throw new Error('Invalid login response: missing user');
    if (!token) {
      // helpful error for debugging
      console.error('Login succeeded but no token returned from server', { user });
      throw new Error('Login did not return an authentication token. Please contact support.');
    }
    setSession(user, token);
    if (window.setAuthToken) {
      window.setAuthToken(token);
      console.log('Auth token stored via setAuthToken');
    } else {
      localStorage.setItem('token', token);
      console.log('Auth token stored in localStorage');
    }
    // Redirect by role (default student)
    if (user.role === 'admin') window.location.href = 'admindashboard.html';
    else window.location.href = 'studentdashboard.html';
  }

  window.Auth = { login: handleLogin, verify: verifyToken, clear: clearSession };
})();

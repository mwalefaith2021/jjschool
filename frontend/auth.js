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
    return res.json();
  }

  async function verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/api/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok;
    } catch { return false; }
  }

  async function handleLogin(username, password) {
    const { user, token } = await apiLogin(username, password);
    if (!user || !token) throw new Error('Invalid login response');
    setSession(user, token);
    // Redirect by role (default student)
    if (user.role === 'admin') window.location.href = 'admindashboard.html';
    else window.location.href = 'studentdashboard.html';
  }

  window.Auth = { login: handleLogin, verify: verifyToken, clear: clearSession };
})();

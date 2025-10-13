// Frontend auth helper to work on Netlify + Render
(function() {
  function setSession(user, token) {
    localStorage.setItem('userType', user.role);
    localStorage.setItem('username', user.username);
    localStorage.setItem('userProfile', JSON.stringify(user));
    localStorage.setItem('token', token);
  }

  function clearSession() {
    localStorage.removeItem('userType');
    localStorage.removeItem('username');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('token');
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
      const res = await fetch(`${API_BASE}/api/verify`, { headers: { 'Authorization': `Bearer ${token}` }});
      return res.ok;
    } catch { return false; }
  }

  function showResetModal(userId, role) {
    // Reuse student/admin modal helpers if available
    if (role === 'admin' && typeof showAdminPasswordResetModal === 'function') {
      showAdminPasswordResetModal(userId);
      return;
    }
    if (typeof showPasswordResetModal === 'function') {
      showPasswordResetModal(userId);
      return;
    }
    // Minimal fallback
    const newPass = prompt('Set new password (min 6 chars)');
    if (!newPass || newPass.length < 6) return alert('Password too short.');
    fetch(`${API_BASE}/api/change-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword: newPass })
    }).then(r => {
      if (!r.ok) throw new Error('Failed to update password');
      alert('Password updated. Please login again.');
      clearSession();
    }).catch(e => alert(e.message));
  }

  async function handleLogin(userType, username, password) {
    const data = await apiLogin(username, password);
    const { user, token } = data;
    if (!user || !token) throw new Error('Invalid login response');
    // Optional role sanity check when user selected type
    if (userType && userType !== user.role) {
      throw new Error('You selected the wrong user type.');
    }
    setSession(user, token);
    if (user.requiresPasswordReset) {
      showResetModal(user.id, user.role);
      return; // stop redirect until reset is done
    }
    // redirect by role
    if (user.role === 'admin') window.location.href = 'admindashboard.html';
    else window.location.href = 'studentdashboard.html';
  }

  // Expose minimal API
  window.Auth = {
    login: handleLogin,
    verify: verifyToken,
    clear: clearSession
  };
})();

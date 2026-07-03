const API_BASE = '/api';

const Auth = {
  token: () => localStorage.getItem('lp_token'),
  user: () => JSON.parse(localStorage.getItem('lp_user') || 'null'),
  set: (token, user) => {
    localStorage.setItem('lp_token', token);
    localStorage.setItem('lp_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('lp_token');
    localStorage.removeItem('lp_user');
  },
  requireRole(role) {
    const user = Auth.user();
    if (!Auth.token() || !user) {
      window.location.href = '/index.html';
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === 'admin' ? '/admin.html' : '/owner.html';
      return null;
    }
    return user;
  }
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(typeof CONFIG !== 'undefined' && CONFIG.APP_API_KEY ? { 'x-app-key': CONFIG.APP_API_KEY } : {}),
      ...(Auth.token() ? { Authorization: `Bearer ${Auth.token()}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    Auth.clear();
    window.location.href = '/index.html';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

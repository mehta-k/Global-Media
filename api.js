// Shared API client for Global Media frontend.
// Handles auth token storage and JSON requests to the Express backend.
const API = {
  base: '',

  getToken() {
    return localStorage.getItem('gm_token');
  },
  setToken(token) {
    localStorage.setItem('gm_token', token);
  },
  clearToken() {
    localStorage.removeItem('gm_token');
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('gm_user'));
    } catch {
      return null;
    }
  },
  setCurrentUser(user) {
    localStorage.setItem('gm_user', JSON.stringify(user));
  },
  clearCurrentUser() {
    localStorage.removeItem('gm_user');
  },

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = API.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(API.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      /* no body */
    }

    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  get(path) {
    return API.request('GET', path);
  },
  post(path, body) {
    return API.request('POST', path, body);
  },
  patch(path, body) {
    return API.request('PATCH', path, body);
  },
  del(path) {
    return API.request('DELETE', path);
  },

  isLoggedIn() {
    return !!API.getToken();
  },

  logout() {
    API.clearToken();
    API.clearCurrentUser();
  }
};

// Expose globally
window.API = API;

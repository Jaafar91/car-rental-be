// ── API BASE URL ──
const API_BASE = '';   // same origin; change to 'http://localhost:8000' if needed

// ── Generic fetch wrapper ──
async function apiFetch(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof authState !== 'undefined' && authState?.token) {
    headers.Authorization = `Bearer ${authState.token}`;
  }

  const opts = {
    method,
    headers
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API Error');
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── CRUD helpers ──
const api = {
  get:    (url)         => apiFetch(url, 'GET'),
  post:   (url, data)   => apiFetch(url, 'POST',   data),
  put:    (url, data)   => apiFetch(url, 'PUT',    data),
  delete: (url)         => apiFetch(url, 'DELETE'),
};
const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    const message = json?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

export async function loginApi(email, password) {
  const json = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return json.data; // LoginResponse
}

export async function verifyTotpApi(mfaToken, code) {
  const json = await request('/api/v1/auth/login/verify-totp', {
    method: 'POST',
    body: JSON.stringify({ mfaToken, code }),
  });
  return json.data; // LoginResponse
}

export async function refreshTokenApi(refreshToken) {
  const json = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return json.data;
}

export async function logoutApi() {
  await request('/api/v1/auth/logout', { method: 'POST' });
}

export async function getMeApi() {
  const json = await request('/api/v1/auth/me');
  return json.data;
}

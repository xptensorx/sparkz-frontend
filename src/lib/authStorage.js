const KEY = 'sparkz_access_token';

export function getToken() {
  return localStorage.getItem(KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

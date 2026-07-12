// ============================================================
// SESI LOGIN
// Sengaja pakai sessionStorage (bukan localStorage): token otomatis
// hilang saat tab/browser ditutup. Tidak ada data bisnis apapun yang
// disimpan di sini — hanya token + info identitas ringan (nama, role)
// supaya UI tahu siapa yang login tanpa perlu tanya server tiap render.
// ============================================================
const KEY = 'tirta_session';

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); }
  catch (e) { return null; }
}
export function setSession(session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}
export function clearSession() {
  sessionStorage.removeItem(KEY);
}
export function getToken() {
  const s = getSession();
  return s ? s.token : '';
}
export function isLoggedIn() {
  const s = getSession();
  return !!(s && s.token);
}
export function currentRole() {
  const s = getSession();
  return s ? s.role : null;
}
export function currentName() {
  const s = getSession();
  return s ? s.name : null;
}

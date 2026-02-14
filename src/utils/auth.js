/**
 * Password protection using SHA-256 hashing.
 * The plaintext password lives in .env and is hashed at build time.
 * Only the hash (__PASSWORD_HASH__) is embedded in the final build.
 */

/* global __PASSWORD_HASH__ */

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim().toLowerCase());
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password) {
  const hash = await hashPassword(password);
  return hash === __PASSWORD_HASH__;
}

export function isAuthenticated() {
  return sessionStorage.getItem('wedding_auth') === 'true';
}

export function setAuthenticated() {
  sessionStorage.setItem('wedding_auth', 'true');
}

export function clearAuth() {
  sessionStorage.removeItem('wedding_auth');
}

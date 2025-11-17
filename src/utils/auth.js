import { HttpError } from './errors.js';

export function ensureAdmin(request) {
  if (request.user?.role !== 'ADMIN') {
    throw new HttpError(403, 'Solo administrador');
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password_hash;
  return clone;
}

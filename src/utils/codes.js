import { randomUUID } from 'crypto';

export function rentalCode() {
  return `RNT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export function saleCode() {
  return `SAL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

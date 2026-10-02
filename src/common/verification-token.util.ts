import { randomBytes } from 'crypto'

/** Verification links stay valid for this long before the person must re-register. */
export const VERIFICATION_TOKEN_TTL_HOURS = 48

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

export function tokenExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000)
}

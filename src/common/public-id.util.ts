/**
 * Human-readable, sortable unique IDs — deliberately not random (UUID/nanoid).
 *
 * Pattern: `{PREFIX}-{YY}-{SEQ}`, e.g. `SCH-26-000001`, `PLY-26-000042`.
 *   - PREFIX  identifies the entity type at a glance (SCH = school, PLY = player).
 *   - YY      two-digit registration year, so IDs sort chronologically within a type
 *             and support desk staff can eyeball roughly how old a record is.
 *   - SEQ     the row's own auto-increment primary key, zero-padded to 6 digits —
 *             guaranteed unique and gap-free by MySQL itself, no separate counter
 *             table or race condition to manage. 6 digits supports 999,999
 *             registrations per type before rolling to 7 digits (still valid, just wider).
 *
 * Composed after insert, once the DB has assigned the row's `id`, then written back
 * onto the row (see InstitutionsService.create / PlayersService.create).
 */
export function buildPublicId(prefix: 'SCH' | 'PLY', id: number, createdAt: Date = new Date()): string {
  const yy = String(createdAt.getFullYear()).slice(-2)
  const seq = String(id).padStart(6, '0')
  return `${prefix}-${yy}-${seq}`
}

import type { Assignment, Contact, Slot } from './types'
import { SLOTS, displayName } from './types'

export interface BoardEntry {
  assignment: Assignment
  contact: Contact
}

export interface BoardRow {
  /** postazione; stringa vuota quando non è ancora decisa */
  venue: string
  label: string
  cells: Record<Slot, BoardEntry[]>
}

function emptyCells(): Record<Slot, BoardEntry[]> {
  return { mattina: [], pomeriggio: [], sera: [] }
}

/**
 * Righe del tabellone: le postazioni scelte nelle impostazioni nell'ordine in cui
 * le ha scritte l'utente, poi quelle che compaiono solo negli appuntamenti, e in
 * fondo «Non decisa» per chi non ha ancora un posto.
 */
export function boardRows(
  venues: string[],
  assignments: Assignment[],
  contacts: Contact[],
): BoardRow[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  const entries: BoardEntry[] = []
  for (const assignment of assignments) {
    const contact = byId.get(assignment.contactId)
    if (contact) entries.push({ assignment, contact })
  }

  const labels = new Map<string, string>()
  for (const raw of venues) {
    const venue = raw.trim()
    if (!venue || labels.has(venue)) continue
    labels.set(venue, venue)
  }
  for (const entry of entries) {
    const venue = (entry.assignment.venue ?? '').trim()
    if (!venue || labels.has(venue)) continue
    labels.set(venue, venue)
  }
  if (entries.some((entry) => !(entry.assignment.venue ?? '').trim())) labels.set('', 'Non decisa')

  // se non c'è ancora nessuna postazione, il tabellone deve restare usabile
  if (labels.size === 0) labels.set('', 'Non decisa')

  const rows: BoardRow[] = [...labels.entries()].map(([venue, label]) => ({
    venue,
    label,
    cells: emptyCells(),
  }))
  const byVenue = new Map(rows.map((row) => [row.venue, row]))

  for (const entry of entries) {
    const venue = (entry.assignment.venue ?? '').trim()
    byVenue.get(venue)?.cells[entry.assignment.slot].push(entry)
  }

  for (const row of rows) {
    for (const slot of SLOTS) {
      row.cells[slot].sort((a, b) => displayName(a.contact).localeCompare(displayName(b.contact), 'it'))
    }
  }

  return rows
}

/** Quante caselle del tabellone hanno almeno una cosa dentro. */
export function filledCells(rows: BoardRow[]): number {
  return rows.reduce(
    (total, row) => total + SLOTS.filter((slot) => row.cells[slot].length > 0).length,
    0,
  )
}

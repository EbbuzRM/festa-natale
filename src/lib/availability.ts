import { emptyContact, type Assignment, type Contact, type Period } from './types'
import { dayRunLabel, daysBetween } from './format'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Ordina e unisce i periodi che si toccano, così l'elenco resta leggibile. */
export function normalizePeriods(periods: Period[] | null | undefined): Period[] {
  if (!Array.isArray(periods)) return []
  const valid = periods
    .filter((period) => ISO_DAY.test(period.from) && ISO_DAY.test(period.to))
    .map((period) => (period.to < period.from ? { from: period.to, to: period.from } : { ...period }))
    .sort((a, b) => a.from.localeCompare(b.from))

  const merged: Period[] = []
  for (const period of valid) {
    const last = merged[merged.length - 1]
    if (last && daysBetween(last.to, period.from) <= 1) {
      if (period.to > last.to) last.to = period.to
      continue
    }
    merged.push(period)
  }
  return merged
}

/** Chi ha dato le sue date può venire solo in quelle; senza date non ha vincoli. */
export function isAvailable(contact: Pick<Contact, 'available'>, day: string): boolean {
  const periods = Array.isArray(contact.available) ? contact.available : []
  if (periods.length === 0) return true
  return periods.some((period) => period.from <= day && day <= period.to)
}

/** Appuntamenti che cadono fuori dai giorni in cui il contatto ha detto di poter venire. */
export function assignmentsOutsideAvailability(
  assignments: Assignment[],
  contacts: Contact[],
): Assignment[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  return assignments.filter((assignment) => {
    const contact = byId.get(assignment.contactId)
    return contact !== undefined && contact.status !== 'scartato' && !isAvailable(contact, assignment.day)
  })
}

/**
 * Vecchi salvataggi e backup chiamavano "unavailable" le stesse date: in realtà
 * erano i giorni in cui il contatto può venire, quindi qui diventano disponibilità.
 */
export function normalizeStoredContact(raw: unknown): Contact {
  const { unavailable, ...value } = {
    ...emptyContact(),
    ...(raw as Partial<Contact> & { unavailable?: unknown }),
  }
  const periods =
    Array.isArray(value.available) && value.available.length > 0 ? value.available : unavailable
  return { ...value, available: parsePeriods(periods) }
}

export function periodLabel(period: Period): string {
  return dayRunLabel({
    start: period.from,
    end: period.to,
    count: daysBetween(period.from, period.to) + 1,
    days: [],
  })
}

/** Legge i periodi dal database o dal backup, scartando quello che non è una data. */
export function parsePeriods(value: unknown): Period[] {
  if (!Array.isArray(value)) return []
  const periods: Period[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<Period>
    const from = typeof candidate.from === 'string' ? candidate.from.slice(0, 10) : ''
    const to = typeof candidate.to === 'string' ? candidate.to.slice(0, 10) : ''
    if (!ISO_DAY.test(from)) continue
    periods.push({ from, to: ISO_DAY.test(to) ? to : from })
  }
  return normalizePeriods(periods)
}

/** Testo per Excel e backup: "2026-12-06..2026-12-08, 2026-12-24". */
export function periodsToText(periods: Period[] | null | undefined): string {
  return normalizePeriods(periods)
    .map((period) => (period.from === period.to ? period.from : `${period.from}..${period.to}`))
    .join(', ')
}

export function parsePeriodsText(raw: string): Period[] {
  const periods: Period[] = []
  for (const part of raw.split(/[;,|\n]/)) {
    const match = part
      .trim()
      .match(/^(\d{4}-\d{2}-\d{2})\s*(?:(?:\.\.|\/|–|—|→|a|to)\s*(\d{4}-\d{2}-\d{2}))?$/)
    if (!match) continue
    periods.push({ from: match[1], to: match[2] ?? match[1] })
  }
  return normalizePeriods(periods)
}

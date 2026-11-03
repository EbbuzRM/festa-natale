import type { Assignment, Contact, Unavailable } from './types'
import { dayRunLabel, daysBetween } from './format'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Ordina e unisce i periodi che si toccano, così l'elenco resta leggibile. */
export function normalizePeriods(periods: Unavailable[] | null | undefined): Unavailable[] {
  if (!Array.isArray(periods)) return []
  const valid = periods
    .filter((period) => ISO_DAY.test(period.from) && ISO_DAY.test(period.to))
    .map((period) => (period.to < period.from ? { from: period.to, to: period.from } : { ...period }))
    .sort((a, b) => a.from.localeCompare(b.from))

  const merged: Unavailable[] = []
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

export function isUnavailable(contact: Pick<Contact, 'unavailable'>, day: string): boolean {
  const periods = Array.isArray(contact.unavailable) ? contact.unavailable : []
  return periods.some((period) => period.from <= day && day <= period.to)
}

/** Chi non c'è in quel giorno, esclusi gli scartati. */
export function unavailableOn(contacts: Contact[], day: string): Contact[] {
  return contacts.filter((contact) => contact.status !== 'scartato' && isUnavailable(contact, day))
}

/** Appuntamenti che cadono in un giorno in cui il contatto ha detto di non esserci. */
export function unavailableAssignments(assignments: Assignment[], contacts: Contact[]): Assignment[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  return assignments.filter((assignment) => {
    const contact = byId.get(assignment.contactId)
    return contact !== undefined && contact.status !== 'scartato' && isUnavailable(contact, assignment.day)
  })
}

export function periodLabel(period: Unavailable): string {
  return dayRunLabel({
    start: period.from,
    end: period.to,
    count: daysBetween(period.from, period.to) + 1,
    days: [],
  })
}

/** Legge i periodi dal database o dal backup, scartando quello che non è una data. */
export function parseUnavailable(value: unknown): Unavailable[] {
  if (!Array.isArray(value)) return []
  const periods: Unavailable[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<Unavailable>
    const from = typeof candidate.from === 'string' ? candidate.from.slice(0, 10) : ''
    const to = typeof candidate.to === 'string' ? candidate.to.slice(0, 10) : ''
    if (!ISO_DAY.test(from)) continue
    periods.push({ from, to: ISO_DAY.test(to) ? to : from })
  }
  return normalizePeriods(periods)
}

/** Testo per Excel e backup: "2026-12-06..2026-12-08, 2026-12-24". */
export function periodsToText(periods: Unavailable[] | null | undefined): string {
  return normalizePeriods(periods)
    .map((period) => (period.from === period.to ? period.from : `${period.from}..${period.to}`))
    .join(', ')
}

export function parsePeriodsText(raw: string): Unavailable[] {
  const periods: Unavailable[] = []
  for (const part of raw.split(/[;,|\n]/)) {
    const match = part
      .trim()
      .match(/^(\d{4}-\d{2}-\d{2})\s*(?:(?:\.\.|\/|–|—|→|a|to)\s*(\d{4}-\d{2}-\d{2}))?$/)
    if (!match) continue
    periods.push({ from: match[1], to: match[2] ?? match[1] })
  }
  return normalizePeriods(periods)
}

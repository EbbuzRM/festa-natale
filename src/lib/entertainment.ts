import type { Assignment, Contact, Settings } from './types'

export interface VenueSlots {
  venue: string
  filled: number
}

export interface EntertainmentStats {
  /** artisti messi in calendario */
  filled: number
  target: number
  /** quanti slot mancano per arrivare al totale */
  remaining: number
  /** 0-100, fermo a 100 quando si supera il totale */
  percent: number
  complete: boolean
  byVenue: VenueSlots[]
  /** appuntamenti senza postazione scelta */
  withoutVenue: number
}

/**
 * Un appuntamento è intrattenimento quando l'artista è in calendario.
 * Gli scartati non contano: non saliranno mai sul palco.
 */
export function entertainmentAssignments(assignments: Assignment[], contacts: Contact[]): Assignment[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  return assignments.filter((assignment) => {
    const contact = byId.get(assignment.contactId)
    return contact !== undefined && contact.category === 'artisti' && contact.status !== 'scartato'
  })
}

export function entertainmentStats(
  assignments: Assignment[],
  contacts: Contact[],
  settings: Pick<Settings, 'venues' | 'entertainmentTarget'>,
): EntertainmentStats {
  const filled = entertainmentAssignments(assignments, contacts)
  const rawTarget = Math.round(
    Number.isFinite(settings.entertainmentTarget) ? settings.entertainmentTarget : 0,
  )
  const target = Math.max(0, rawTarget)

  const counts = new Map<string, number>()
  let withoutVenue = 0
  for (const assignment of filled) {
    const venue = (assignment.venue ?? '').trim()
    if (!venue) {
      withoutVenue += 1
      continue
    }
    counts.set(venue, (counts.get(venue) ?? 0) + 1)
  }

  const venues = settings.venues ?? []
  const byVenue = venues.map((venue) => ({ venue, filled: counts.get(venue) ?? 0 }))
  for (const [venue, count] of counts) {
    if (!venues.includes(venue)) byVenue.push({ venue, filled: count })
  }

  return {
    filled: filled.length,
    target,
    remaining: Math.max(0, target - filled.length),
    percent: target > 0 ? Math.min(100, Math.round((filled.length / target) * 100)) : 0,
    complete: target > 0 && filled.length >= target,
    byVenue,
    withoutVenue,
  }
}

import type { Assignment, Category, Contact, Status } from './types'
import { CATEGORIES, STATUSES } from './types'

export interface CategoryStats {
  total: number
  confirmed: number
}

export interface BudgetSummary {
  /** budget dichiarato (es. i 3.000 € del comune) */
  totalBudget: number
  /** somma dei prezzi dei contatti confermati */
  confirmedCost: number
  /** confermati + contattati: la previsione realistica */
  estimatedCost: number
  /** quanto resta del budget dopo i confermati */
  remaining: number
  /** quanto resterebbe se andassero a buon fine anche i contattati */
  remainingAfterEstimates: number
  confirmedCount: number
  counts: Record<Status, number>
  byCategory: Record<Category, CategoryStats>
  /** contatti confermati di cui non si conosce il prezzo */
  confirmedWithoutPrice: number
  /** percentuale di budget impegnata, 0-100 (può superare 100) */
  usedPercent: number
  overBudget: boolean
}

export function summarize(contacts: Contact[], budgetTotal: number): BudgetSummary {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>
  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => [category, { total: 0, confirmed: 0 }]),
  ) as Record<Category, CategoryStats>

  let confirmedCost = 0
  let estimatedCost = 0
  let confirmedWithoutPrice = 0

  for (const contact of contacts) {
    counts[contact.status] += 1
    byCategory[contact.category].total += 1

    if (contact.status === 'confermato') {
      byCategory[contact.category].confirmed += 1
      if (contact.price === null) confirmedWithoutPrice += 1
      else confirmedCost += contact.price
    }

    if (contact.price !== null && (contact.status === 'confermato' || contact.status === 'contattato')) {
      estimatedCost += contact.price
    }
  }

  const total = Number.isFinite(budgetTotal) ? budgetTotal : 0
  const remaining = total - confirmedCost
  const usedPercent = total > 0 ? Math.round((confirmedCost / total) * 100) : 0

  return {
    totalBudget: total,
    confirmedCost,
    estimatedCost,
    remaining,
    remainingAfterEstimates: total - estimatedCost,
    confirmedCount: counts.confermato,
    counts,
    byCategory,
    confirmedWithoutPrice,
    usedPercent,
    overBudget: confirmedCost > total,
  }
}

export function assignmentsForDay(assignments: Assignment[], day: string): Assignment[] {
  return assignments.filter((assignment) => assignment.day === day)
}

/** Appuntamenti da mostrare fuori dalla rubrica: gli scartati restano solo nei Contatti. */
export function visibleAssignments(assignments: Assignment[], contacts: Contact[]): Assignment[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  return assignments.filter((assignment) => {
    const contact = byId.get(assignment.contactId)
    return contact !== undefined && contact.status !== 'scartato'
  })
}

/** costo per giorno, contando una volta sola i contatti assegnati più volte */
export function costByDay(
  assignments: Assignment[],
  contacts: Contact[],
  days: string[],
): Record<string, number> {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  const result: Record<string, number> = {}
  for (const day of days) {
    let cost = 0
    for (const assignment of assignments) {
      if (assignment.day !== day) continue
      const contact = byId.get(assignment.contactId)
      if (!contact || contact.price === null) continue
      cost += contact.price
    }
    result[day] = cost
  }
  return result
}

/** totale previsto dall'insieme dei giorni (un contatto conta una volta sola) */
export function scheduledCost(assignments: Assignment[], contacts: Contact[]): number {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  const seen = new Set<string>()
  let total = 0
  for (const assignment of assignments) {
    if (seen.has(assignment.contactId)) continue
    const contact = byId.get(assignment.contactId)
    if (!contact || contact.price === null) continue
    seen.add(assignment.contactId)
    total += contact.price
  }
  return total
}

/** contatti messi in più di un giorno: probabile doppione da sistemare */
export function duplicatedContactIds(assignments: Assignment[]): string[] {
  const days = new Map<string, Set<string>>()
  for (const assignment of assignments) {
    const set = days.get(assignment.contactId) ?? new Set<string>()
    set.add(assignment.day)
    days.set(assignment.contactId, set)
  }
  return [...days.entries()].filter(([, set]) => set.size > 1).map(([id]) => id)
}

/** contatti confermati ma non ancora messi in nessun giorno */
export function unscheduledContacts(contacts: Contact[], assignments: Assignment[]): Contact[] {
  const scheduled = new Set(assignments.map((assignment) => assignment.contactId))
  return contacts.filter((contact) => contact.status === 'confermato' && !scheduled.has(contact.id))
}

export function clippedPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

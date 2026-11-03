import type { Contact } from './types'

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Chiave "umana" per riconoscere lo stesso fornitore inserito due volte:
 * nome + cognome + telefono + compagnia, normalizzati.
 */
export function contactKey(contact: Pick<Contact, 'name' | 'surname' | 'phone' | 'company'>): string {
  return [contact.name, contact.surname, contact.phone, contact.company].map(normalize).join('|')
}

export interface MergeResult {
  contacts: Contact[]
  added: number
  updated: number
  skipped: number
}

/**
 * Unisce i contatti importati a quelli esistenti senza creare doppioni:
 * stesso id → aggiorna, stessa chiave → salta, altrimenti aggiunge.
 */
export function mergeContacts(existing: Contact[], incoming: Contact[]): MergeResult {
  const result = [...existing]
  const byId = new Map(result.map((contact, index) => [contact.id, index]))
  const byKey = new Map<string, number>()
  result.forEach((contact, index) => {
    const key = contactKey(contact)
    if (key.replace(/\|/g, '')) byKey.set(key, index)
  })

  let added = 0
  let updated = 0
  let skipped = 0

  for (const contact of incoming) {
    const idIndex = byId.get(contact.id)
    if (idIndex !== undefined) {
      result[idIndex] = { ...result[idIndex], ...contact }
      updated += 1
      continue
    }

    const key = contactKey(contact)
    const hasKey = key.replace(/\|/g, '').length > 0
    if (hasKey && byKey.has(key)) {
      skipped += 1
      continue
    }

    result.push(contact)
    const index = result.length - 1
    byId.set(contact.id, index)
    if (hasKey) byKey.set(key, index)
    added += 1
  }

  return { contacts: result, added, updated, skipped }
}

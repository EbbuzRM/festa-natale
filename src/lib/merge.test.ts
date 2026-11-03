import { describe, expect, it } from 'vitest'
import { contactKey, mergeContacts } from './merge'
import type { Contact } from './types'
import { emptyContact } from './types'

function contact(patch: Partial<Contact>): Contact {
  return { ...emptyContact(), ...patch }
}

describe('contactKey', () => {
  it('normalizza accenti, maiuscole e punteggiatura', () => {
    const a = contactKey({ name: 'Nicolò', surname: 'D’Amico', phone: '333 123 4567', company: 'Coro' })
    const b = contactKey({ name: 'nicolo', surname: 'd amico', phone: '3331234567', company: 'coro' })
    expect(a).toBe(b)
  })
})

describe('mergeContacts', () => {
  const existing = [
    contact({ id: 'c1', name: 'Coro Santa Lucia', phone: '3331112222', price: 800 }),
    contact({ id: 'c2', name: 'Babbo Natale', phone: '3470001122' }),
  ]

  it('aggiorna quando trova lo stesso id', () => {
    const result = mergeContacts(existing, [
      contact({ id: 'c2', name: 'Babbo Natale', phone: '3470001122', price: 300 }),
    ])
    expect(result.updated).toBe(1)
    expect(result.added).toBe(0)
    expect(result.contacts.find((item) => item.id === 'c2')?.price).toBe(300)
    expect(result.contacts).toHaveLength(2)
  })

  it('salta i doppioni riconosciuti da nome e telefono', () => {
    const result = mergeContacts(existing, [
      contact({ id: 'zzz', name: 'coro santa lucia', phone: '333 111 2222' }),
    ])
    expect(result.skipped).toBe(1)
    expect(result.added).toBe(0)
    expect(result.contacts).toHaveLength(2)
  })

  it('aggiunge i contatti nuovi', () => {
    const result = mergeContacts(existing, [
      contact({ id: 'c3', name: 'Burattinaio', phone: '3405554433' }),
      contact({ id: 'c4', name: '', phone: '' }),
      contact({ id: 'c5', name: '', phone: '' }),
    ])
    expect(result.added).toBe(3)
    expect(result.contacts).toHaveLength(5)
  })
})

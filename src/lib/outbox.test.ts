import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalData } from './repo'
import {
  applyOps,
  enqueue,
  flushOutbox,
  loadOutbox,
  opsForData,
  saveOutbox,
  type OutboxOp,
} from './outbox'
import type { Assignment, Contact, Settings } from './types'

const mocks = vi.hoisted(() => ({
  pushContact: vi.fn(),
  deleteContactRemote: vi.fn(),
  pushAssignment: vi.fn(),
  deleteAssignmentRemote: vi.fn(),
  pushSettings: vi.fn(),
}))

vi.mock('./repo', () => ({
  pushContact: mocks.pushContact,
  deleteContactRemote: mocks.deleteContactRemote,
  pushAssignment: mocks.pushAssignment,
  deleteAssignmentRemote: mocks.deleteAssignmentRemote,
  pushSettings: mocks.pushSettings,
}))

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  }
}

function contact(id: string, name: string, updatedAt = '2026-11-04T10:00:00.000Z'): Contact {
  return {
    id,
    name,
    surname: '',
    company: '',
    category: 'artisti',
    subtype: '',
    phone: '',
    whatsapp: '',
    email: '',
    price: null,
    priceNote: '',
    source: '',
    origin: '',
    status: 'da_contattare',
    notes: '',
    unavailable: [],
    createdAt: '2026-11-04T09:00:00.000Z',
    updatedAt,
  }
}

function assignment(id: string, contactId: string): Assignment {
  return {
    id,
    contactId,
    day: '2026-12-24',
    slot: 'mattina',
    venue: '',
    note: '',
    createdAt: '2026-11-04T09:00:00.000Z',
    updatedAt: '2026-11-04T09:00:00.000Z',
  }
}

function settings(eventName = 'Festa di Natale'): Settings {
  return {
    eventName,
    budgetTotal: 0,
    eventDays: ['2026-12-24'],
    venues: ['Limonaia 1'],
    entertainmentTarget: 30,
    todos: [],
  }
}

function data(overrides: Partial<LocalData> = {}): LocalData {
  return { contacts: [], assignments: [], settings: settings(), ...overrides }
}

const client = {} as unknown as Parameters<typeof flushOutbox>[0]

describe('coda delle modifiche', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage())
    vi.clearAllMocks()
  })

  it('tiene solo l’ultima modifica dello stesso contatto', () => {
    let ops: OutboxOp[] = []
    ops = enqueue(ops, { kind: 'contact', value: contact('c1', 'primo') })
    ops = enqueue(ops, { kind: 'contact', value: contact('c1', 'secondo') })
    ops = enqueue(ops, { kind: 'contact', value: contact('c2', 'altro') })

    expect(ops).toHaveLength(2)
    expect(ops[0]).toEqual({ kind: 'contact', value: contact('c1', 'secondo') })
    expect(ops[1]).toEqual({ kind: 'contact', value: contact('c2', 'altro') })
  })

  it('una cancellazione toglie la modifica in attesa dello stesso contatto', () => {
    let ops: OutboxOp[] = [{ kind: 'contact', value: contact('c1', 'mario') }]
    ops = enqueue(ops, { kind: 'contact-delete', id: 'c1' })
    expect(ops).toEqual([{ kind: 'contact-delete', id: 'c1' }])
  })

  it('una cancellazione porta via anche gli appuntamenti di quel contatto', () => {
    let ops: OutboxOp[] = [
      { kind: 'assignment', value: assignment('a1', 'c1') },
      { kind: 'assignment', value: assignment('a2', 'c2') },
    ]
    ops = enqueue(ops, { kind: 'contact-delete', id: 'c1' })
    expect(ops).toEqual([
      { kind: 'assignment', value: assignment('a2', 'c2') },
      { kind: 'contact-delete', id: 'c1' },
    ])
  })

  it('sopravvive al ricaricamento della pagina', () => {
    saveOutbox([{ kind: 'contact', value: contact('c1', 'mario') }])
    expect(loadOutbox()).toHaveLength(1)
    expect(loadOutbox()[0]).toMatchObject({ kind: 'contact' })
    saveOutbox([])
    expect(loadOutbox()).toEqual([])
  })

  it('ignora una coda scritta male invece di rompere l’app', () => {
    localStorage.setItem('festa-natale.outbox.v1', '{non json')
    expect(loadOutbox()).toEqual([])
    localStorage.setItem('festa-natale.outbox.v1', JSON.stringify([{ kind: 'boh' }, 42]))
    expect(loadOutbox()).toEqual([])
  })

  describe('applicazione sopra la copia del cloud', () => {
    it('rimette i contatti in attesa che il cloud non ha ancora', () => {
      const remote = data({ contacts: [contact('c1', 'dal cloud')] })
      const merged = applyOps(remote, [{ kind: 'contact', value: contact('c2', 'offline') }])

      expect(merged.contacts.map((item) => item.name)).toEqual(['dal cloud', 'offline'])
    })

    it('la modifica in attesa vince sulla copia vecchia del cloud', () => {
      const remote = data({ contacts: [contact('c1', 'vecchio')] })
      const merged = applyOps(remote, [{ kind: 'contact', value: contact('c1', 'nuovo') }])

      expect(merged.contacts).toHaveLength(1)
      expect(merged.contacts[0].name).toBe('nuovo')
    })

    it('tiene cancellati i contatti e gli appuntamenti cancellati offline', () => {
      const remote = data({
        contacts: [contact('c1', 'mario')],
        assignments: [assignment('a1', 'c1')],
      })
      const merged = applyOps(remote, [{ kind: 'contact-delete', id: 'c1' }])

      expect(merged.contacts).toEqual([])
      expect(merged.assignments).toEqual([])
    })

    it('applica le impostazioni in attesa', () => {
      const merged = applyOps(data(), [{ kind: 'settings', value: settings('Festa 2027') }])
      expect(merged.settings.eventName).toBe('Festa 2027')
    })

    it('senza coda restituisce il cloud così com’è', () => {
      const remote = data({ contacts: [contact('c1', 'solo cloud')] })
      expect(applyOps(remote, [])).toBe(remote)
    })
  })

  describe('invio', () => {
    it('manda tutto e svuota la coda', async () => {
      saveOutbox([
        { kind: 'contact', value: contact('c1', 'mario') },
        { kind: 'settings', value: settings('Festa 2027') },
      ])

      const result = await flushOutbox(client, loadOutbox())

      expect(result).toEqual({ remaining: [], sent: 2, error: null })
      expect(mocks.pushContact).toHaveBeenCalledTimes(1)
      expect(mocks.pushSettings).toHaveBeenCalledTimes(1)
      expect(loadOutbox()).toEqual([])
    })

    it('un elemento che fallisce resta in coda senza bloccare gli altri', async () => {
      mocks.pushContact.mockRejectedValueOnce(new Error('Failed to fetch'))
      saveOutbox([
        { kind: 'contact', value: contact('c1', 'mario') },
        { kind: 'contact', value: contact('c2', 'lucia') },
      ])

      const result = await flushOutbox(client, loadOutbox())

      expect(result.sent).toBe(1)
      expect(result.error).toContain('Failed to fetch')
      expect(result.remaining).toEqual([{ kind: 'contact', value: contact('c1', 'mario') }])
      expect(loadOutbox()).toEqual([{ kind: 'contact', value: contact('c1', 'mario') }])
    })

    it('manda cancellazioni e impostazioni alle funzioni giuste', async () => {
      await flushOutbox(client, [
        { kind: 'contact-delete', id: 'c1' },
        { kind: 'assignment', value: assignment('a1', 'c2') },
        { kind: 'assignment-delete', id: 'a2' },
      ])

      expect(mocks.deleteContactRemote).toHaveBeenCalledWith(client, 'c1')
      expect(mocks.pushAssignment).toHaveBeenCalledTimes(1)
      expect(mocks.deleteAssignmentRemote).toHaveBeenCalledWith(client, 'a2')
    })
  })

  it('mette in coda tutto quello che serve dopo un import', () => {
    const ops = opsForData(
      data({ contacts: [contact('c1', 'mario')], assignments: [assignment('a1', 'c1')] }),
    )
    expect(ops.map((op) => op.kind)).toEqual(['contact', 'assignment', 'settings'])
  })
})

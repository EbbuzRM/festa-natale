import { describe, expect, it } from 'vitest'
import { entertainmentStats } from './entertainment'
import type { Assignment, Contact, Settings } from './types'
import { DEFAULT_VENUES, emptyContact } from './types'

function contact(patch: Partial<Contact>): Contact {
  return { ...emptyContact(), ...patch }
}

function assignment(patch: Partial<Assignment>): Assignment {
  return {
    id: patch.id ?? `a-${Math.random().toString(16).slice(2)}`,
    contactId: patch.contactId ?? 'c1',
    day: patch.day ?? '2026-12-06',
    slot: patch.slot ?? 'pomeriggio',
    venue: patch.venue ?? '',
    note: '',
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  }
}

const settings = (patch: Partial<Settings> = {}): Pick<Settings, 'venues' | 'entertainmentTarget'> => ({
  venues: DEFAULT_VENUES,
  entertainmentTarget: 30,
  ...patch,
})

const coro = contact({ id: 'c1', name: 'Coro', category: 'artisti', status: 'confermato' })
const babbo = contact({ id: 'c2', name: 'Babbo', category: 'artisti', status: 'confermato' })
const forno = contact({ id: 'c3', name: 'Forno', category: 'servizi', status: 'confermato' })
const scartato = contact({ id: 'c4', name: 'Gruppo', category: 'artisti', status: 'scartato' })

describe('entertainmentStats', () => {
  it('conta solo gli artisti in calendario, scartati esclusi', () => {
    const items = [
      assignment({ id: 'a1', contactId: 'c1', venue: 'Palco' }),
      assignment({ id: 'a2', contactId: 'c3', venue: 'Palco' }),
      assignment({ id: 'a3', contactId: 'c4', venue: 'Serra 1' }),
    ]
    const stats = entertainmentStats(items, [coro, forno, scartato], settings())

    expect(stats.filled).toBe(1)
    expect(stats.remaining).toBe(29)
    expect(stats.percent).toBe(3)
    expect(stats.complete).toBe(false)
  })

  it('spezza i riempiti per postazione e segnala quelli senza', () => {
    const items = [
      assignment({ id: 'a1', contactId: 'c1', venue: 'Palco' }),
      assignment({ id: 'a2', contactId: 'c2', venue: 'Limonaia 1' }),
      assignment({ id: 'a3', contactId: 'c1', venue: 'Palco', day: '2026-12-07' }),
      assignment({ id: 'a4', contactId: 'c2', venue: '' }),
    ]
    const stats = entertainmentStats(items, [coro, babbo], settings())

    expect(stats.filled).toBe(4)
    expect(stats.byVenue).toEqual([
      { venue: 'Limonaia 1', filled: 1 },
      { venue: 'Limonaia 2', filled: 0 },
      { venue: 'Serra 1', filled: 0 },
      { venue: 'Serra 2', filled: 0 },
      { venue: 'Palco', filled: 2 },
    ])
    expect(stats.withoutVenue).toBe(1)
  })

  it('tiene le postazioni tolte dalle impostazioni e chiude a target', () => {
    const items = [assignment({ id: 'a1', contactId: 'c1', venue: 'Teatro vecchio' })]
    const stats = entertainmentStats(items, [coro], settings({ venues: ['Palco'], entertainmentTarget: 1 }))

    expect(stats.byVenue).toEqual([
      { venue: 'Palco', filled: 0 },
      { venue: 'Teatro vecchio', filled: 1 },
    ])
    expect(stats.complete).toBe(true)
    expect(stats.remaining).toBe(0)
    expect(stats.percent).toBe(100)
  })

  it('non va in percentuali strane senza target', () => {
    const stats = entertainmentStats([], [], settings({ entertainmentTarget: 0 }))
    expect(stats.percent).toBe(0)
    expect(stats.complete).toBe(false)
    expect(stats.remaining).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import {
  assignmentsOutsideAvailability,
  isAvailable,
  normalizePeriods,
  parsePeriods,
  parsePeriodsText,
  periodLabel,
  periodsToText,
} from './availability'
import { emptyContact, type Assignment } from './types'

describe('normalizePeriods', () => {
  it('ordina, unisce i periodi che si toccano e scarta le date storte', () => {
    expect(
      normalizePeriods([
        { from: '2026-12-10', to: '2026-12-12' },
        { from: '2026-12-06', to: '2026-12-07' },
        { from: '2026-12-08', to: '2026-12-09' },
        { from: 'non una data', to: '2026-12-09' },
        { from: '2026-12-10', to: '2026-12-12' },
      ]),
    ).toEqual([{ from: '2026-12-06', to: '2026-12-12' }])
  })

  it('raddrizza il periodo scritto al contrario', () => {
    expect(normalizePeriods([{ from: '2026-12-10', to: '2026-12-08' }])).toEqual([
      { from: '2026-12-08', to: '2026-12-10' },
    ])
  })
})

describe('isAvailable', () => {
  const disponibile = { ...emptyContact(), available: [{ from: '2026-12-06', to: '2026-12-08' }] }

  it('vale solo dentro le date che ha dato', () => {
    expect(isAvailable(disponibile, '2026-12-05')).toBe(false)
    expect(isAvailable(disponibile, '2026-12-06')).toBe(true)
    expect(isAvailable(disponibile, '2026-12-08')).toBe(true)
    expect(isAvailable(disponibile, '2026-12-09')).toBe(false)
  })

  it('senza date non ha vincoli: si può sempre scegliere', () => {
    expect(isAvailable(emptyContact(), '2026-12-06')).toBe(true)
  })
})

describe('etichette e testi', () => {
  it('scrive il periodo in italiano', () => {
    expect(periodLabel({ from: '2026-12-06', to: '2026-12-08' })).toBe('6–8 dicembre 2026')
    expect(periodLabel({ from: '2026-12-24', to: '2026-12-24' })).toBe('24 dicembre 2026')
  })

  it('passa da testo a periodi e torna indietro', () => {
    const periods = [
      { from: '2026-12-06', to: '2026-12-08' },
      { from: '2026-12-24', to: '2026-12-24' },
    ]
    expect(periodsToText(periods)).toBe('2026-12-06..2026-12-08, 2026-12-24')
    expect(parsePeriodsText(periodsToText(periods))).toEqual(periods)
    expect(parsePeriodsText('6/12/2026')).toEqual([])
  })

  it('legge i periodi salvati sul database, anche scritti male', () => {
    expect(parsePeriods([{ from: '2026-12-06T00:00:00.000Z', to: '' }])).toEqual([
      { from: '2026-12-06', to: '2026-12-06' },
    ])
    expect(parsePeriods('niente')).toEqual([])
    expect(parsePeriods([{ from: '', to: '2026-12-06' }, null])).toEqual([])
  })
})

describe('incroci col calendario', () => {
  const senzaDate = { ...emptyContact(), id: 'a', name: 'Zampognari' }
  const conDate = {
    ...emptyContact(),
    id: 'b',
    name: 'Coro',
    available: [{ from: '2026-12-06', to: '2026-12-07' }],
  }
  const scartato = {
    ...emptyContact(),
    id: 'c',
    name: 'Banda',
    status: 'scartato' as const,
    available: [{ from: '2026-12-06', to: '2026-12-07' }],
  }

  const assignment = (contactId: string, day: string): Assignment => ({
    id: `ass-${contactId}-${day}`,
    contactId,
    day,
    slot: 'sera',
    venue: 'Palco',
    note: '',
    createdAt: '',
    updatedAt: '',
  })

  it('segnala solo gli appuntamenti fuori dalle date in cui può venire', () => {
    const items = [
      assignment('b', '2026-12-06'),
      assignment('b', '2026-12-12'),
      assignment('a', '2026-12-28'),
      assignment('c', '2026-12-12'),
    ]
    expect(assignmentsOutsideAvailability(items, [senzaDate, conDate, scartato]).map((item) => item.id)).toEqual([
      'ass-b-2026-12-12',
    ])
  })
})

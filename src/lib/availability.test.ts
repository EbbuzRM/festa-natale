import { describe, expect, it } from 'vitest'
import {
  isUnavailable,
  normalizePeriods,
  parsePeriodsText,
  parseUnavailable,
  periodLabel,
  periodsToText,
  unavailableAssignments,
  unavailableOn,
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

describe('isUnavailable', () => {
  const contatto = { ...emptyContact(), unavailable: [{ from: '2026-12-06', to: '2026-12-08' }] }

  it('comprende i due estremi', () => {
    expect(isUnavailable(contatto, '2026-12-05')).toBe(false)
    expect(isUnavailable(contatto, '2026-12-06')).toBe(true)
    expect(isUnavailable(contatto, '2026-12-08')).toBe(true)
    expect(isUnavailable(contatto, '2026-12-09')).toBe(false)
  })

  it('senza periodi è sempre disponibile', () => {
    expect(isUnavailable(emptyContact(), '2026-12-06')).toBe(false)
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
    expect(parseUnavailable([{ from: '2026-12-06T00:00:00.000Z', to: '' }])).toEqual([
      { from: '2026-12-06', to: '2026-12-06' },
    ])
    expect(parseUnavailable('niente')).toEqual([])
    expect(parseUnavailable([{ from: '', to: '2026-12-06' }, null])).toEqual([])
  })
})

describe('incroci col calendario', () => {
  const libero = { ...emptyContact(), id: 'a', name: 'Zampognari' }
  const occupato = {
    ...emptyContact(),
    id: 'b',
    name: 'Coro',
    unavailable: [{ from: '2026-12-06', to: '2026-12-07' }],
  }
  const scartato = {
    ...emptyContact(),
    id: 'c',
    name: 'Banda',
    status: 'scartato' as const,
    unavailable: [{ from: '2026-12-06', to: '2026-12-07' }],
  }

  const assignment = (contactId: string, day: string): Assignment => ({
    id: `ass-${contactId}`,
    contactId,
    day,
    slot: 'sera',
    venue: 'Palco',
    note: '',
    createdAt: '',
    updatedAt: '',
  })

  it('elenca chi non c’è in un giorno, senza gli scartati', () => {
    expect(unavailableOn([libero, occupato, scartato], '2026-12-06').map((c) => c.id)).toEqual(['b'])
    expect(unavailableOn([libero, occupato], '2026-12-12')).toEqual([])
  })

  it('trova gli appuntamenti che cadono in un giorno di indisponibilità', () => {
    const items = [
      assignment('b', '2026-12-06'),
      assignment('a', '2026-12-06'),
      assignment('c', '2026-12-07'),
    ]
    expect(unavailableAssignments(items, [libero, occupato, scartato]).map((item) => item.id)).toEqual([
      'ass-b',
    ])
  })
})

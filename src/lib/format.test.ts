import { describe, expect, it } from 'vitest'
import {
  dayLabel,
  dayRunLabel,
  daysInRange,
  defaultEventDays,
  groupDayRuns,
  money,
  parseMoney,
  relativeLabel,
  toIsoDay,
} from './format'

const plain = (value: string) => value.replace(/\u00a0|\u202f/g, ' ')

describe('money', () => {
  it('mette il separatore delle migliaia e non i decimali inutili', () => {
    expect(plain(money(3000))).toBe('3.000 €')
    expect(plain(money(1200.5))).toBe('1.200,50 €')
    expect(plain(money(0))).toBe('0 €')
    expect(money(null)).toBe('—')
    expect(money(Number.NaN)).toBe('—')
  })
})

describe('parseMoney', () => {
  it('legge i formati italiani e non', () => {
    expect(parseMoney('350')).toBe(350)
    expect(parseMoney('350,50')).toBe(350.5)
    expect(parseMoney('1.200,00')).toBe(1200)
    expect(parseMoney('€ 2.300')).toBe(2300)
    expect(parseMoney('1,234.56')).toBe(1234.56)
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('da concordare')).toBeNull()
    expect(parseMoney(null)).toBeNull()
    expect(parseMoney(450)).toBe(450)
  })
})

describe('defaultEventDays', () => {
  it('propone weekend di dicembre più i giorni dopo Natale', () => {
    const days = defaultEventDays(2026)
    expect(days).toHaveLength(14)
    expect(days[0]).toBe('2026-12-05')
    expect(days).toContain('2026-12-23')
    expect(days).toContain('2026-12-28')
    expect(days).not.toContain('2026-12-25')
  })
})

describe('daysInRange', () => {
  it('prende inizio, fine e tutti i giorni in mezzo', () => {
    expect(daysInRange('2026-12-05', '2026-12-07')).toEqual([
      '2026-12-05',
      '2026-12-06',
      '2026-12-07',
    ])
    expect(daysInRange('2026-12-31', '2027-01-02')).toEqual([
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
    expect(daysInRange('2026-12-07', '2026-12-07')).toEqual(['2026-12-07'])
    expect(daysInRange('2026-12-07', '2026-12-05')).toEqual([])
    expect(daysInRange('', '2026-12-05')).toEqual([])
  })
})

describe('groupDayRuns', () => {
  it('mette insieme solo i giorni consecutivi', () => {
    const runs = groupDayRuns(['2026-12-06', '2026-12-05', '2026-12-07', '2026-12-12', '2026-12-05'])
    expect(runs.map((run) => [run.start, run.end, run.count])).toEqual([
      ['2026-12-05', '2026-12-07', 3],
      ['2026-12-12', '2026-12-12', 1],
    ])
  })

  it('etichetta i periodi in italiano, anche a cavallo di mese e anno', () => {
    const [run] = groupDayRuns(['2026-12-05', '2026-12-06'])
    expect(dayRunLabel(run)).toBe('5–6 dicembre 2026')
    const [single] = groupDayRuns(['2026-12-24'])
    expect(dayRunLabel(single)).toBe('24 dicembre 2026')
    const [crossMonth] = groupDayRuns(['2026-11-30', '2026-12-01'])
    expect(dayRunLabel(crossMonth)).toBe('30 nov – 1 dic 2026')
    const [crossYear] = groupDayRuns(['2026-12-31', '2027-01-01'])
    expect(dayRunLabel(crossYear)).toBe('31 dic 2026 – 1 gen 2027')
  })
})

describe('dayLabel', () => {
  it('scrive il giorno in italiano', () => {
    expect(dayLabel('2026-12-06')).toBe('domenica 6 dic')
    expect(dayLabel('2026-12-24')).toBe('giovedì 24 dic')
  })

  it('non slitta di un giorno per il fuso orario', () => {
    expect(toIsoDay(new Date(2026, 11, 6, 0, 30))).toBe('2026-12-06')
    expect(toIsoDay(new Date(2026, 11, 6, 23, 59))).toBe('2026-12-06')
  })
})

describe('relativeLabel', () => {
  it('usa oggi/domani per i giorni vicini', () => {
    const today = new Date()
    const iso = toIsoDay(today)
    expect(relativeLabel(iso)).toBe('oggi')
  })
})

import { describe, expect, it } from 'vitest'
import {
  clippedPercent,
  costByDay,
  duplicatedContactIds,
  scheduledCost,
  summarize,
  unscheduledContacts,
  visibleAssignments,
} from './budget'
import type { Assignment, Contact } from './types'
import { emptyContact } from './types'

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

const coro = contact({ id: 'c1', name: 'Coro', price: 1000, status: 'confermato' })
const babbo = contact({ id: 'c2', name: 'Babbo', price: null, status: 'confermato' })
const gruppo = contact({ id: 'c3', name: 'Gruppo', price: 200, status: 'contattato' })
const burattinaio = contact({ id: 'c4', name: 'Burattinaio', price: 900, status: 'scartato' })

describe('summarize', () => {
  it('separa costi confermati, previsione e residuo', () => {
    const summary = summarize([coro, babbo, gruppo, burattinaio], 3000)

    expect(summary.confirmedCost).toBe(1000)
    expect(summary.estimatedCost).toBe(1200)
    expect(summary.remaining).toBe(2000)
    expect(summary.remainingAfterEstimates).toBe(1800)
    expect(summary.confirmedCount).toBe(2)
    expect(summary.confirmedWithoutPrice).toBe(1)
    expect(summary.usedPercent).toBe(33)
    expect(summary.overBudget).toBe(false)
    expect(summary.counts).toEqual({
      da_contattare: 0,
      contattato: 1,
      confermato: 2,
      scartato: 1,
    })
    expect(summary.byCategory.artisti).toEqual({ total: 4, confirmed: 2 })
  })

  it('segnala lo sforamento e il budget a zero', () => {
    const over = summarize([coro, contact({ id: 'c9', price: 2500, status: 'confermato' })], 3000)
    expect(over.confirmedCost).toBe(3500)
    expect(over.overBudget).toBe(true)
    expect(over.remaining).toBe(-500)

    const noBudget = summarize([coro], 0)
    expect(noBudget.usedPercent).toBe(0)
    expect(noBudget.overBudget).toBe(true)
  })

  it('ignora i prezzi dei contatti scartati', () => {
    const summary = summarize([burattinaio], 1000)
    expect(summary.confirmedCost).toBe(0)
    expect(summary.estimatedCost).toBe(0)
  })
})

describe('calendario', () => {
  const days = ['2026-12-06', '2026-12-07']
  const items = [
    assignment({ id: 'a1', contactId: 'c1', day: '2026-12-06' }),
    assignment({ id: 'a2', contactId: 'c3', day: '2026-12-06' }),
    assignment({ id: 'a3', contactId: 'c1', day: '2026-12-07' }),
  ]

  it('somma il costo per giorno', () => {
    expect(costByDay(items, [coro, babbo, gruppo], days)).toEqual({
      '2026-12-06': 1200,
      '2026-12-07': 1000,
    })
  })

  it('nel totale conteggia una volta sola un contatto su più giorni', () => {
    expect(scheduledCost(items, [coro, babbo, gruppo])).toBe(1200)
  })

  it('trova i contatti doppi e i confermati senza giorno', () => {
    expect(duplicatedContactIds(items)).toEqual(['c1'])
    expect(unscheduledContacts([coro, babbo], items.slice(0, 2)).map((c) => c.id)).toEqual(['c2'])
  })

  it('lascia gli scartati fuori dal calendario', () => {
    const items = [
      assignment({ id: 'a1', contactId: 'c1' }),
      assignment({ id: 'a2', contactId: 'c4' }),
    ]
    expect(visibleAssignments(items, [coro, burattinaio]).map((item) => item.id)).toEqual(['a1'])
  })
})

describe('clippedPercent', () => {
  it('resta tra 0 e 100', () => {
    expect(clippedPercent(-20)).toBe(0)
    expect(clippedPercent(45)).toBe(45)
    expect(clippedPercent(180)).toBe(100)
    expect(clippedPercent(Number.NaN)).toBe(0)
  })
})

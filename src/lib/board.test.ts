import { describe, expect, it } from 'vitest'
import { boardRows, filledCells } from './board'
import { emptyContact, type Assignment, type Contact } from './types'

const coro: Contact = { ...emptyContact(), id: 'a', name: 'Coro' }
const babbo: Contact = { ...emptyContact(), id: 'b', name: 'Babbo Natale' }

function assignment(id: string, contactId: string, slot: Assignment['slot'], venue: string): Assignment {
  return { id, contactId, day: '2026-12-06', slot, venue, note: '', createdAt: '', updatedAt: '' }
}

describe('boardRows', () => {
  it('tiene l’ordine delle postazioni e mette in fondo «Non decisa»', () => {
    const rows = boardRows(
      ['Limonaia 1', 'Palco', 'Limonaia 1'],
      [assignment('1', 'a', 'sera', ''), assignment('2', 'b', 'mattina', 'Limonaia 1')],
      [coro, babbo],
    )
    expect(rows.map((row) => row.label)).toEqual(['Limonaia 1', 'Palco', 'Non decisa'])
    expect(rows[0].cells.mattina.map((entry) => entry.contact.name)).toEqual(['Babbo Natale'])
    expect(rows[2].cells.sera.map((entry) => entry.contact.name)).toEqual(['Coro'])
    expect(rows[1].cells.sera).toEqual([])
  })

  it('aggiunge le postazioni scritte solo negli appuntamenti', () => {
    const rows = boardRows(['Palco'], [assignment('1', 'a', 'pomeriggio', 'Viale')], [coro])
    expect(rows.map((row) => row.label)).toEqual(['Palco', 'Viale'])
  })

  it('ammette più persone nella stessa casella, in ordine di nome', () => {
    const rows = boardRows(
      ['Palco'],
      [
        assignment('1', 'b', 'sera', 'Palco'),
        assignment('2', 'a', 'sera', 'Palco'),
      ],
      [coro, babbo],
    )
    expect(rows[0].cells.sera.map((entry) => entry.contact.name)).toEqual([
      'Babbo Natale',
      'Coro',
    ])
  })

  it('senza postazioni e senza appuntamenti lascia una riga «Non decisa»', () => {
    const rows = boardRows([], [], [])
    expect(rows).toHaveLength(1)
    expect(rows[0].label).toBe('Non decisa')
  })

  it('ignora gli appuntamenti di contatti che non esistono più', () => {
    const rows = boardRows(['Palco'], [assignment('1', 'sparito', 'sera', 'Palco')], [coro])
    expect(rows[0].cells.sera).toEqual([])
    expect(rows.map((row) => row.label)).toEqual(['Palco'])
  })

  it('conta le caselle occupate, non le persone', () => {
    const rows = boardRows(
      ['Palco'],
      [
        assignment('1', 'a', 'sera', 'Palco'),
        assignment('2', 'b', 'sera', 'Palco'),
        assignment('3', 'a', 'mattina', 'Palco'),
      ],
      [coro, babbo],
    )
    expect(filledCells(rows)).toBe(2)
  })
})

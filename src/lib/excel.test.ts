import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildWorkbook, parseWorkbook, workbookToArrayBuffer } from './excel'
import { SCHEMA_SQL } from './repo'
import type { Assignment, Contact, Settings } from './types'
import { emptyContact } from './types'

const settings: Settings = {
  eventName: 'Festa di Natale 2026',
  budgetTotal: 3000,
  eventDays: ['2026-12-06', '2026-12-13'],
  venues: ['Limonaia 1', 'Palco'],
  entertainmentTarget: 30,
  todos: [],
  lists: [],
  notes: [],
}

const coro: Contact = {
  ...emptyContact('artisti'),
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Coro',
  surname: 'Santa Lucia',
  company: 'Parrocchia',
  subtype: 'Coro',
  phone: '3331112222',
  email: 'coro@esempio.it',
  price: 800,
  source: 'Giulia',
  origin: 'volantino al mercato',
  status: 'confermato',
  notes: 'domenica pomeriggio',
  available: [{ from: '2026-12-24', to: '2026-12-26' }],
}

const forno: Contact = {
  ...emptyContact('servizi'),
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Forno',
  company: 'Panificio Rossi',
  subtype: 'Forno / panettoni',
  price: 150.5,
  status: 'contattato',
}

const assignment: Assignment = {
  id: '33333333-3333-4333-8333-333333333333',
  contactId: coro.id,
  day: '2026-12-06',
  slot: 'pomeriggio',
  venue: 'Palco',
  note: '',
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
}

describe('excel', () => {
  it('esporta e reimporta senza perdere niente', async () => {
    const workbook = await buildWorkbook([coro, forno], [assignment], settings)
    const buffer = await workbookToArrayBuffer(workbook)
    const parsed = await parseWorkbook(buffer)

    expect(parsed.warnings).toEqual([])
    expect(parsed.contacts).toHaveLength(2)

    const backCoro = parsed.contacts.find((contact) => contact.id === coro.id)
    expect(backCoro).toMatchObject({
      name: 'Coro',
      surname: 'Santa Lucia',
      company: 'Parrocchia',
      category: 'artisti',
      subtype: 'Coro',
      phone: '3331112222',
      email: 'coro@esempio.it',
      price: 800,
      source: 'Giulia',
      origin: 'volantino al mercato',
      status: 'confermato',
      notes: 'domenica pomeriggio',
      available: [{ from: '2026-12-24', to: '2026-12-26' }],
    })

    const backForno = parsed.contacts.find((contact) => contact.id === forno.id)
    expect(backForno?.category).toBe('servizi')
    expect(backForno?.price).toBe(150.5)
    expect(backForno?.status).toBe('contattato')

    expect(parsed.assignments).toHaveLength(1)
    expect(parsed.assignments[0]).toMatchObject({
      contactId: coro.id,
      day: '2026-12-06',
      slot: 'pomeriggio',
      venue: 'Palco',
    })

    expect(parsed.settings).toMatchObject({
      eventName: 'Festa di Natale 2026',
      budgetTotal: 3000,
      eventDays: ['2026-12-06', '2026-12-13'],
      entertainmentTarget: 30,
    })
  })

  it('legge un foglio compilato a mano con etichette e prezzi italiani', async () => {
    const rows = [
      {
        Nome: 'Burattinaio',
        Compagnia: 'Teatro dei Burattini',
        Categoria: 'Artisti',
        Tipo: 'Burattinaio',
        Telefono: '340 555 4433',
        Prezzo: '350,00',
        Stato: 'Confermato',
        'Chi ha fornito il contatto': 'Marco',
      },
    ]
    const sheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Contatti')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer

    const parsed = await parseWorkbook(buffer)
    expect(parsed.contacts).toHaveLength(1)
    expect(parsed.contacts[0]).toMatchObject({
      name: 'Burattinaio',
      category: 'artisti',
      price: 350,
      status: 'confermato',
      source: 'Marco',
    })
  })

  it('ignora le righe vuote e avvisa', async () => {
    const rows = [{ Nome: '', Telefono: '', Note: 'riga vuota' }]
    const sheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Contatti')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer

    const parsed = await parseWorkbook(buffer)
    expect(parsed.contacts).toHaveLength(0)
    expect(parsed.warnings[0]).toContain('Riga 2')
  })

  it('lo schema SQL nel codice e nel file restano identici', () => {
    const path = fileURLToPath(new URL('../../supabase/schema.sql', import.meta.url))
    const file = readFileSync(path, 'utf8')
    expect(file.trim()).toBe(SCHEMA_SQL.trim())
  })
})

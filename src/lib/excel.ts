import type * as XLSXType from 'xlsx'
import { parsePeriodsText, periodsToText } from './availability'
import { parseMoney } from './format'
import type { Assignment, Category, Contact, Settings, Slot, Status } from './types'
import {
  CATEGORY_LABELS,
  SLOT_LABELS,
  STATUS_LABELS,
  SLOTS,
  CATEGORIES,
  STATUSES,
  isCategory,
  isSlot,
  isStatus,
  newId,
} from './types'

const CONTACT_SHEET = 'Contatti'
const CALENDAR_SHEET = 'Calendario'
const BUDGET_SHEET = 'Budget'

export const CONTACT_HEADERS = [
  'ID',
  'Nome',
  'Cognome',
  'Compagnia',
  'Categoria',
  'Tipo',
  'Telefono',
  'WhatsApp',
  'Email',
  'Prezzo',
  'Nota prezzo',
  'Chi ha fornito il contatto',
  'Provenienza',
  'Stato',
  'Date in cui può venire',
  'Note',
  'Creato',
  'Aggiornato',
] as const

export const ASSIGNMENT_HEADERS = [
  'ID',
  'ID contatto',
  'Contatto',
  'Giorno',
  'Fascia',
  'Postazione',
  'Note',
] as const

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseCategory(value: unknown): Category {
  const raw = cellToString(value)
  if (isCategory(raw)) return raw
  const normalized = normalizeHeader(raw)
  for (const category of CATEGORIES) {
    if (normalizeHeader(CATEGORY_LABELS[category]) === normalized) return category
    if (normalizeHeader(category) === normalized) return category
  }
  return 'artisti'
}

function parseStatus(value: unknown): Status {
  const raw = cellToString(value)
  if (isStatus(raw)) return raw
  const normalized = normalizeHeader(raw)
  for (const status of STATUSES) {
    if (normalizeHeader(STATUS_LABELS[status]) === normalized) return status
  }
  return 'da_contattare'
}

function parseSlot(value: unknown): Slot | null {
  const raw = cellToString(value)
  if (isSlot(raw)) return raw
  const normalized = normalizeHeader(raw)
  for (const slot of SLOTS) {
    if (normalizeHeader(SLOT_LABELS[slot]) === normalized) return slot
  }
  return null
}

export type Spreadsheet = XLSXType.WorkBook

/** xlsx pesa: lo carico solo quando si esporta o si importa. */
async function loadXlsx(): Promise<typeof XLSXType> {
  return import('xlsx')
}

export async function buildWorkbook(
  contacts: Contact[],
  assignments: Assignment[],
  settings: Settings,
): Promise<Spreadsheet> {
  const XLSX = await loadXlsx()
  const contactRows = contacts
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
    .map((contact) => ({
      ID: contact.id,
      Nome: contact.name,
      Cognome: contact.surname,
      Compagnia: contact.company,
      Categoria: CATEGORY_LABELS[contact.category],
      Tipo: contact.subtype,
      Telefono: contact.phone,
      WhatsApp: contact.whatsapp,
      Email: contact.email,
      Prezzo: contact.price ?? '',
      'Nota prezzo': contact.priceNote,
      'Chi ha fornito il contatto': contact.source,
      Provenienza: contact.origin,
      Stato: STATUS_LABELS[contact.status],
      'Date in cui può venire': periodsToText(contact.available),
      Note: contact.notes,
      Creato: contact.createdAt,
      Aggiornato: contact.updatedAt,
    }))

  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  const assignmentRows = assignments
    .filter((assignment) => byId.get(assignment.contactId)?.status !== 'scartato')
    .slice()
    .sort((a, b) => (a.day + a.slot).localeCompare(b.day + b.slot))
    .map((assignment) => ({
      ID: assignment.id,
      'ID contatto': assignment.contactId,
      Contatto: byId.get(assignment.contactId)
        ? [byId.get(assignment.contactId)!.name, byId.get(assignment.contactId)!.surname]
            .filter(Boolean)
            .join(' ')
        : '—',
      Giorno: assignment.day,
      Fascia: SLOT_LABELS[assignment.slot],
      Postazione: assignment.venue,
      Note: assignment.note,
    }))

  const budgetRows = [
    { Voce: 'Nome evento', Valore: settings.eventName },
    { Voce: 'Budget totale', Valore: settings.budgetTotal },
    { Voce: 'Giorni evento', Valore: settings.eventDays.join(', ') },
    { Voce: 'Contatti', Valore: contacts.length },
    { Voce: 'Confermati', Valore: contacts.filter((c) => c.status === 'confermato').length },
    { Voce: 'Slot intrattenimento', Valore: settings.entertainmentTarget },
  ]

  const workbook = XLSX.utils.book_new()
  const contactsSheet = XLSX.utils.json_to_sheet(contactRows, { header: [...CONTACT_HEADERS] })
  contactsSheet['!cols'] = [
    { wch: 38 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 24 },
    { wch: 10 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 26 },
    { wch: 32 },
    { wch: 22 },
    { wch: 22 },
  ]
  XLSX.utils.book_append_sheet(workbook, contactsSheet, CONTACT_SHEET)

  const calendarSheet = XLSX.utils.json_to_sheet(assignmentRows, { header: [...ASSIGNMENT_HEADERS] })
  calendarSheet['!cols'] = [
    { wch: 38 },
    { wch: 38 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
  ]
  XLSX.utils.book_append_sheet(workbook, calendarSheet, CALENDAR_SHEET)

  const budgetSheet = XLSX.utils.json_to_sheet(budgetRows, { header: ['Voce', 'Valore'] })
  budgetSheet['!cols'] = [{ wch: 20 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(workbook, budgetSheet, BUDGET_SHEET)

  return workbook
}

export async function workbookToArrayBuffer(workbook: Spreadsheet): Promise<ArrayBuffer> {
  const XLSX = await loadXlsx()
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
}

export async function downloadWorkbook(workbook: Spreadsheet, filename: string): Promise<void> {
  const XLSX = await loadXlsx()
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' })
}

export interface ImportResult {
  contacts: Contact[]
  assignments: Assignment[]
  settings: Partial<Settings>
  warnings: string[]
}

/** Legge un .xlsx esportato da questa app (o compilato a mano con le stesse colonne). */
export async function parseWorkbook(buffer: ArrayBuffer): Promise<ImportResult> {
  const XLSX = await loadXlsx()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const warnings: string[] = []
  const contacts: Contact[] = []
  const assignments: Assignment[] = []
  const settings: Partial<Settings> = {}

  const contactsSheet = workbook.Sheets[CONTACT_SHEET] ?? workbook.Sheets[workbook.SheetNames[0]]
  if (!contactsSheet) {
    return { contacts, assignments, settings, warnings: ['Il file non contiene fogli leggibili.'] }
  }

  const contactRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(contactsSheet, { defval: '' })
  const now = new Date().toISOString()

  contactRows.forEach((row, index) => {
    const byHeader = new Map<string, unknown>()
    for (const [key, value] of Object.entries(row)) byHeader.set(normalizeHeader(key), value)

    const read = (header: string): unknown => byHeader.get(normalizeHeader(header)) ?? ''
    const name = cellToString(read('Nome'))
    const company = cellToString(read('Compagnia'))
    const phone = cellToString(read('Telefono'))

    if (!name && !company && !phone) {
      warnings.push(`Riga ${index + 2}: ignorata, senza nome, compagnia o telefono.`)
      return
    }

    const created = cellToString(read('Creato'))
    contacts.push({
      id: cellToString(read('ID')) || newId(),
      name,
      surname: cellToString(read('Cognome')),
      company,
      category: parseCategory(read('Categoria')),
      subtype: cellToString(read('Tipo')),
      phone,
      whatsapp: cellToString(read('WhatsApp')),
      email: cellToString(read('Email')),
      price: parseMoney(read('Prezzo')),
      priceNote: cellToString(read('Nota prezzo')),
      source: cellToString(read('Chi ha fornito il contatto')),
      origin: cellToString(read('Provenienza')),
      status: parseStatus(read('Stato')),
      notes: cellToString(read('Note')),
      available: parsePeriodsText(
        cellToString(read('Date in cui può venire')) || cellToString(read('Non disponibile')),
      ),
      createdAt: created || now,
      updatedAt: cellToString(read('Aggiornato')) || now,
    })
  })

  const calendarSheet = workbook.Sheets[CALENDAR_SHEET]
  if (calendarSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(calendarSheet, { defval: '' })
    const now = new Date().toISOString()
    rows.forEach((row, index) => {
      const byHeader = new Map<string, unknown>()
      for (const [key, value] of Object.entries(row)) byHeader.set(normalizeHeader(key), value)
      const read = (header: string): unknown => byHeader.get(normalizeHeader(header)) ?? ''

      const contactId = cellToString(read('ID contatto'))
      const day = cellToString(read('Giorno'))
      const slot = parseSlot(read('Fascia'))
      if (!contactId && !day) return
      if (!contactId || !day || !slot) {
        warnings.push(`Calendario, riga ${index + 2}: manca contatto, giorno o fascia.`)
        return
      }
      assignments.push({
        id: cellToString(read('ID')) || newId(),
        contactId,
        day: day.slice(0, 10),
        slot,
        venue: cellToString(read('Postazione')),
        note: cellToString(read('Note')),
        createdAt: now,
        updatedAt: now,
      })
    })
  }

  const budgetSheet = workbook.Sheets[BUDGET_SHEET]
  if (budgetSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(budgetSheet, { defval: '' })
    for (const row of rows) {
      const label = normalizeHeader(cellToString(row['Voce']))
      const value = row['Valore']
      if (label === normalizeHeader('Nome evento')) settings.eventName = cellToString(value)
      if (label === normalizeHeader('Budget totale')) settings.budgetTotal = parseMoney(value) ?? 0
      if (label === normalizeHeader('Slot intrattenimento')) {
        const target = parseMoney(value)
        if (target !== null) settings.entertainmentTarget = Math.max(0, Math.round(target))
      }
      if (label === normalizeHeader('Giorni evento')) {
        const days = cellToString(value)
          .split(/[,;]/)
          .map((day) => day.trim())
          .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
        if (days.length > 0) settings.eventDays = days
      }
    }
  }

  const contactIds = new Set(contacts.map((contact) => contact.id))
  const keptAssignments = assignments.filter((assignment) => contactIds.has(assignment.contactId))
  if (keptAssignments.length !== assignments.length) {
    warnings.push(
      `${assignments.length - keptAssignments.length} appuntamenti ignorati: il contatto non è nella lista.`,
    )
  }

  return { contacts, assignments: keptAssignments, settings, warnings }
}

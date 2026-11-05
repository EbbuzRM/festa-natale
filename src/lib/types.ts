export const CATEGORIES = ['artisti', 'materiali', 'servizi'] as const
export type Category = (typeof CATEGORIES)[number]

export const STATUSES = ['da_contattare', 'contattato', 'confermato', 'scartato'] as const
export type Status = (typeof STATUSES)[number]

export const SLOTS = ['mattina', 'pomeriggio', 'sera'] as const
export type Slot = (typeof SLOTS)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  artisti: 'Artisti',
  materiali: 'Materiali',
  servizi: 'Servizi',
}

export const CATEGORY_HINTS: Record<Category, string> = {
  artisti: 'burattinai, cori, gruppi, babbo natale',
  materiali: 'palco, luci, allestimenti, stampe',
  servizi: 'forni e panettoni, catering, foto, sicurezza',
}

export const STATUS_LABELS: Record<Status, string> = {
  da_contattare: 'Da contattare',
  contattato: 'Contattato',
  confermato: 'Confermato',
  scartato: 'Scartato',
}

export const SLOT_LABELS: Record<Slot, string> = {
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
}

export const SUBTYPES: Record<Category, string[]> = {
  artisti: [
    'Burattinaio',
    'Coro',
    'Gruppo musicale',
    'Babbo Natale',
    'Animazione bimbi',
    'Teatro',
    'Cantante',
    'Altro artista',
  ],
  materiali: [
    'Fornitore materiali',
    'Luci e audio',
    'Palco',
    'Allestimenti',
    'Tipografia e stampe',
    'Altro materiale',
  ],
  servizi: [
    'Forno / panettoni',
    'Catering',
    'Fotografo',
    'Video',
    'Sicurezza',
    'Pulizie',
    'Altro servizio',
  ],
}

/** Periodo in cui il contatto può venire, estremi compresi. */
export interface Period {
  from: string
  to: string
}

export interface Contact {
  id: string
  name: string
  surname: string
  company: string
  category: Category
  subtype: string
  phone: string
  whatsapp: string
  email: string
  price: number | null
  priceNote: string
  /** chi mi ha passato il contatto */
  source: string
  /** da dove viene (volantino, amico, comune...) */
  origin: string
  status: Status
  notes: string
  /** giorni in cui può venire, estremi compresi; vuoto = nessun vincolo */
  available: Period[]
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  id: string
  contactId: string
  /** giorno in formato ISO yyyy-mm-dd */
  day: string
  slot: Slot
  /** postazione: palco, limonaia, serra… vuoto quando non è ancora decisa */
  venue: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: string
}

/** Una riga di una lista: può essere anche un link (acquisti). */
export interface ListItem {
  id: string
  text: string
  done: boolean
  createdAt: string
}

export interface PartyList {
  id: string
  name: string
  items: ListItem[]
}

/** Appunto di riunione o telefonata, legato all'evento. */
export interface Note {
  id: string
  title: string
  text: string
  createdAt: string
  updatedAt: string
}

/** Le postazioni raccontate dall'host: due limonaie, due serre, il palco. */
export const DEFAULT_VENUES = ['Limonaia 1', 'Limonaia 2', 'Serra 1', 'Serra 2', 'Palco']

/** Quanti slot di intrattenimento vanno riempiti in tutto. */
export const DEFAULT_ENTERTAINMENT_TARGET = 30

export interface Settings {
  eventName: string
  budgetTotal: number
  /** giorni dell'evento in formato ISO yyyy-mm-dd */
  eventDays: string[]
  /** postazioni dove si fa l'intrattenimento */
  venues: string[]
  /** slot di intrattenimento da riempire */
  entertainmentTarget: number
  /** lista delle cose da fare */
  todos: Todo[]
  /** liste libere: acquisti, giochi, cose da portare */
  lists: PartyList[]
  /** appunti di riunioni e telefonate */
  notes: Note[]
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function emptyContact(category: Category = 'artisti'): Contact {
  const stamp = nowIso()
  return {
    id: newId(),
    name: '',
    surname: '',
    company: '',
    category,
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
    available: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export function emptyTodo(text: string): Todo {
  return { id: newId(), text: text.trim(), done: false, createdAt: nowIso() }
}

export function emptyListItem(text: string): ListItem {
  return { id: newId(), text: text.trim(), done: false, createdAt: nowIso() }
}

export function emptyList(name: string): PartyList {
  return { id: newId(), name: name.trim(), items: [] }
}

export function emptyNote(title: string, text: string): Note {
  const stamp = nowIso()
  return { id: newId(), title: title.trim(), text: text.trim(), createdAt: stamp, updatedAt: stamp }
}

export function displayName(contact: Contact): string {
  const full = [contact.name, contact.surname].filter(Boolean).join(' ').trim()
  if (full) return full
  if (contact.company.trim()) return contact.company.trim()
  return 'Senza nome'
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

export function isSlot(value: unknown): value is Slot {
  return typeof value === 'string' && (SLOTS as readonly string[]).includes(value)
}

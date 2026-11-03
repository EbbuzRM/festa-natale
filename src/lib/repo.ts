import type { SupabaseClient } from '@supabase/supabase-js'
import { parseUnavailable } from './availability'
import { defaultEventDays } from './format'
import type { Assignment, Category, Contact, Settings, Slot, Status, Todo } from './types'
import {
  DEFAULT_ENTERTAINMENT_TARGET,
  DEFAULT_VENUES,
  emptyContact,
  isCategory,
  isSlot,
  isStatus,
  nowIso,
} from './types'

export interface DbConfig {
  url: string
  anonKey: string
}

export interface LocalData {
  contacts: Contact[]
  assignments: Assignment[]
  settings: Settings
}

const CONFIG_KEY = 'festa-natale.db.v1'
const DATA_KEY = 'festa-natale.data.v1'

/** Collegamento di partenza dai parametri di build: il sito pubblicato è già sul database. */
const ENV_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const ENV_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export function defaultSettings(): Settings {
  return {
    eventName: 'Festa di Natale',
    budgetTotal: 0,
    eventDays: defaultEventDays(new Date().getFullYear()),
    venues: [...DEFAULT_VENUES],
    entertainmentTarget: DEFAULT_ENTERTAINMENT_TARGET,
    todos: [],
  }
}

export function emptyData(): LocalData {
  return { contacts: [], assignments: [], settings: defaultSettings() }
}

/** Configurazione del database: prima quella salvata sul dispositivo, poi quella del build. */
export function loadDbConfig(): DbConfig | null {
  return readStoredDbConfig() ?? envDbConfig()
}

function envDbConfig(): DbConfig | null {
  if (!ENV_URL || !ENV_KEY) return null
  return { url: ENV_URL, anonKey: ENV_KEY }
}

function readStoredDbConfig(): DbConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY) ?? takeFromSession()
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DbConfig>
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.url !== 'string' || typeof parsed.anonKey !== 'string') return null
    return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() }
  } catch {
    return null
  }
}

/** Recupera una configurazione salvata prima che passasse a localStorage. */
function takeFromSession(): string | null {
  const stored = sessionStorage.getItem(CONFIG_KEY)
  if (!stored) return null
  localStorage.setItem(CONFIG_KEY, stored)
  sessionStorage.removeItem(CONFIG_KEY)
  return stored
}

export function saveDbConfig(config: DbConfig | null): void {
  sessionStorage.removeItem(CONFIG_KEY)
  if (!config) {
    localStorage.removeItem(CONFIG_KEY)
    return
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function loadLocal(): LocalData {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<LocalData>
    if (!parsed || typeof parsed !== 'object') return emptyData()
    const defaults = defaultSettings()
    return {
      contacts: Array.isArray(parsed.contacts)
        ? parsed.contacts.map((contact) => ({ ...emptyContact(), ...contact }))
        : [],
      assignments: Array.isArray(parsed.assignments)
        ? parsed.assignments.map((assignment) => ({ ...assignment, venue: assignment.venue ?? '' }))
        : [],
      settings: { ...defaults, ...(parsed.settings ?? {}) },
    }
  } catch {
    return emptyData()
  }
}

export function saveLocal(data: LocalData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data))
}

export function clearLocal(): void {
  localStorage.removeItem(DATA_KEY)
}

/** Il client si carica solo quando serve, per non pesare sul primo avvio. */
export async function createDb(config: DbConfig): Promise<SupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(config.url, config.anonKey, {
    // l'accesso resta ricordato su questo browser finché non si esce
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
}

/** C'è già una sessione valida su questo dispositivo? */
export async function hasSession(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.auth.getSession()
  return Boolean(data.session)
}

export async function signIn(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(authMessage(error.message))
}

export async function signOut(client: SupabaseClient): Promise<void> {
  await client.auth.signOut()
}

/** Le risposte di Supabase Auth sono in inglese: qui diventano comprensibili. */
function authMessage(raw: string): string {
  if (/invalid login credentials/i.test(raw)) return 'Email o password non corretti.'
  if (/email not confirmed/i.test(raw)) return 'Account non confermato: confermalo da Supabase.'
  if (/invalid api key/i.test(raw)) return 'Chiave del progetto sbagliata.'
  if (/failed to fetch|networkerror|network request failed/i.test(raw))
    return 'Database non raggiungibile: controlla la connessione.'
  return raw
}

interface ContactRow {
  id: string
  name: string | null
  surname: string | null
  company: string | null
  category: string | null
  subtype: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  price: number | string | null
  price_note: string | null
  source: string | null
  origin: string | null
  status: string | null
  notes: string | null
  unavailable: unknown
  created_at: string | null
  updated_at: string | null
}

interface AssignmentRow {
  id: string
  contact_id: string
  day: string
  slot: string
  venue: string | null
  note: string | null
  created_at: string | null
  updated_at: string | null
}

interface SettingsRow {
  id: number
  event_name: string | null
  budget_total: number | string | null
  event_days: unknown
  venues: unknown
  entertainment_target: number | string | null
  todos: unknown
}

function text(value: string | null | undefined): string {
  return value ?? ''
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: text(row.name),
    surname: text(row.surname),
    company: text(row.company),
    category: isCategory(row.category) ? row.category : ('artisti' satisfies Category),
    subtype: text(row.subtype),
    phone: text(row.phone),
    whatsapp: text(row.whatsapp),
    email: text(row.email),
    price: toNumber(row.price),
    priceNote: text(row.price_note),
    source: text(row.source),
    origin: text(row.origin),
    status: isStatus(row.status) ? row.status : ('da_contattare' satisfies Status),
    notes: text(row.notes),
    unavailable: parseUnavailable(row.unavailable),
    createdAt: text(row.created_at) || nowIso(),
    updatedAt: text(row.updated_at) || nowIso(),
  }
}

export function contactToRow(contact: Contact) {
  return {
    id: contact.id,
    name: contact.name,
    surname: contact.surname,
    company: contact.company,
    category: contact.category,
    subtype: contact.subtype,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    email: contact.email,
    price: contact.price,
    price_note: contact.priceNote,
    source: contact.source,
    origin: contact.origin,
    status: contact.status,
    notes: contact.notes,
    unavailable: contact.unavailable,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  }
}

function toAssignment(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    contactId: row.contact_id,
    day: text(row.day).slice(0, 10),
    slot: isSlot(row.slot) ? (row.slot as Slot) : 'mattina',
    venue: text(row.venue),
    note: text(row.note),
    createdAt: text(row.created_at) || nowIso(),
    updatedAt: text(row.updated_at) || nowIso(),
  }
}

export function assignmentToRow(assignment: Assignment) {
  return {
    id: assignment.id,
    contact_id: assignment.contactId,
    day: assignment.day,
    slot: assignment.slot,
    venue: assignment.venue,
    note: assignment.note,
    created_at: assignment.createdAt,
    updated_at: assignment.updatedAt,
  }
}

function toTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Partial<Todo>
    const label = text(candidate.text).trim()
    if (!label) return []
    return [
      {
        id: text(candidate.id) || `todo-${Math.random().toString(16).slice(2, 10)}`,
        text: label,
        done: candidate.done === true,
        createdAt: text(candidate.createdAt) || nowIso(),
      },
    ]
  })
}

function toSettings(row: SettingsRow | null): Settings | null {
  if (!row) return null
  const days = toTextList(row.event_days)
  const target = toNumber(row.entertainment_target)
  return {
    eventName: text(row.event_name) || 'Festa di Natale',
    budgetTotal: toNumber(row.budget_total) ?? 0,
    eventDays: days.length > 0 ? days : defaultEventDays(new Date().getFullYear()),
    venues: Array.isArray(row.venues) ? toTextList(row.venues) : [...DEFAULT_VENUES],
    entertainmentTarget:
      target === null ? DEFAULT_ENTERTAINMENT_TARGET : Math.max(0, Math.round(target)),
    todos: toTodos(row.todos),
  }
}

export async function pullAll(client: SupabaseClient): Promise<LocalData> {
  const [contactsResult, assignmentsResult, settingsResult] = await Promise.all([
    client.from('contacts').select('*').order('created_at', { ascending: true }).limit(5000),
    client.from('assignments').select('*').limit(5000),
    client.from('settings').select('*').eq('id', 1).maybeSingle(),
  ])

  if (contactsResult.error) throw new Error(`Lettura contatti: ${contactsResult.error.message}`)
  if (assignmentsResult.error) throw new Error(`Lettura calendario: ${assignmentsResult.error.message}`)
  if (settingsResult.error) throw new Error(`Lettura impostazioni: ${settingsResult.error.message}`)

  const contacts = ((contactsResult.data ?? []) as ContactRow[]).map(toContact)
  const assignments = ((assignmentsResult.data ?? []) as AssignmentRow[])
    .map(toAssignment)
    .filter((assignment) => contacts.some((contact) => contact.id === assignment.contactId))

  return {
    contacts,
    assignments,
    settings: toSettings((settingsResult.data as SettingsRow | null) ?? null) ?? defaultSettings(),
  }
}

export async function pushContact(client: SupabaseClient, contact: Contact): Promise<void> {
  const { error } = await client.from('contacts').upsert(contactToRow(contact), { onConflict: 'id' })
  if (error) throw new Error(`Salvataggio contatto: ${error.message}`)
}

export async function deleteContactRemote(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('contacts').delete().eq('id', id)
  if (error) throw new Error(`Eliminazione contatto: ${error.message}`)
}

export async function pushAssignment(client: SupabaseClient, assignment: Assignment): Promise<void> {
  const { error } = await client
    .from('assignments')
    .upsert(assignmentToRow(assignment), { onConflict: 'id' })
  if (error) throw new Error(`Salvataggio appuntamento: ${error.message}`)
}

export async function deleteAssignmentRemote(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('assignments').delete().eq('id', id)
  if (error) throw new Error(`Eliminazione appuntamento: ${error.message}`)
}

export async function pushSettings(client: SupabaseClient, settings: Settings): Promise<void> {
  const { error } = await client.from('settings').upsert(
    {
      id: 1,
      event_name: settings.eventName,
      budget_total: settings.budgetTotal,
      event_days: settings.eventDays,
      venues: settings.venues,
      entertainment_target: settings.entertainmentTarget,
      todos: settings.todos,
      updated_at: nowIso(),
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`Salvataggio impostazioni: ${error.message}`)
}

export async function pushAll(client: SupabaseClient, data: LocalData): Promise<void> {
  if (data.contacts.length > 0) {
    const { error } = await client
      .from('contacts')
      .upsert(data.contacts.map(contactToRow), { onConflict: 'id' })
    if (error) throw new Error(`Sincronizzazione contatti: ${error.message}`)
  }
  if (data.assignments.length > 0) {
    const { error } = await client
      .from('assignments')
      .upsert(data.assignments.map(assignmentToRow), { onConflict: 'id' })
    if (error) throw new Error(`Sincronizzazione calendario: ${error.message}`)
  }
  await pushSettings(client, data.settings)
}

/** Schema da incollare nell'SQL editor di Supabase, mostrato anche nelle impostazioni. */
export const SCHEMA_SQL = `-- Festa di Natale: schema minimo (eseguilo una volta nell'SQL Editor di Supabase)
create table if not exists public.contacts (
  id uuid primary key,
  name text not null default '',
  surname text not null default '',
  company text not null default '',
  category text not null default 'artisti',
  subtype text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  price numeric(10,2),
  price_note text not null default '',
  source text not null default '',
  origin text not null default '',
  status text not null default 'da_contattare',
  notes text not null default '',
  unavailable jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  day date not null,
  slot text not null default 'mattina',
  venue text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assignments_day_idx on public.assignments (day);

create table if not exists public.settings (
  id int primary key default 1,
  event_name text not null default 'Festa di Natale',
  budget_total numeric(10,2) not null default 0,
  event_days jsonb not null default '[]'::jsonb,
  venues jsonb not null default '[]'::jsonb,
  entertainment_target int not null default 30,
  todos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- database già creato in passato: aggiunge solo le colonne nuove, senza toccare i dati
alter table public.contacts add column if not exists unavailable jsonb not null default '[]'::jsonb;
alter table public.assignments add column if not exists venue text not null default '';
alter table public.settings add column if not exists venues jsonb not null default '[]'::jsonb;
alter table public.settings add column if not exists entertainment_target int not null default 30;
alter table public.settings add column if not exists todos jsonb not null default '[]'::jsonb;

alter table public.contacts enable row level security;
alter table public.assignments enable row level security;
alter table public.settings enable row level security;

-- Solo chi ha fatto login legge e scrive: la chiave publishable da sola non apre niente.
drop policy if exists "festa anon contacts" on public.contacts;
drop policy if exists "festa anon assignments" on public.assignments;
drop policy if exists "festa anon settings" on public.settings;
drop policy if exists "festa auth contacts" on public.contacts;
drop policy if exists "festa auth assignments" on public.assignments;
drop policy if exists "festa auth settings" on public.settings;

create policy "festa auth contacts" on public.contacts for all to authenticated using (true) with check (true);
create policy "festa auth assignments" on public.assignments for all to authenticated using (true) with check (true);
create policy "festa auth settings" on public.settings for all to authenticated using (true) with check (true);
`

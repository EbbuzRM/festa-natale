import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocalData } from './repo'
import { normalizeStoredContact } from './availability'
import {
  deleteAssignmentRemote,
  deleteContactRemote,
  pushAssignment,
  pushContact,
  pushSettings,
} from './repo'
import type { Assignment, Contact, Settings } from './types'

/**
 * Una modifica che il database non ha ancora ricevuto.
 * Resta in localStorage finché il cloud non la conferma: se la rete manca,
 * la modifica non si perde e riparte da sola al ritorno della connessione.
 */
export type OutboxOp =
  | { kind: 'contact'; value: Contact }
  | { kind: 'contact-delete'; id: string }
  | { kind: 'assignment'; value: Assignment }
  | { kind: 'assignment-delete'; id: string }
  | { kind: 'settings'; value: Settings }

const OUTBOX_KEY = 'festa-natale.outbox.v1'

/** Due modifiche allo stesso elemento si sostituiscono: conta solo l'ultima. */
function opKey(op: OutboxOp): string {
  switch (op.kind) {
    case 'contact':
      return `contact:${op.value.id}`
    case 'contact-delete':
      return `contact:${op.id}`
    case 'assignment':
      return `assignment:${op.value.id}`
    case 'assignment-delete':
      return `assignment:${op.id}`
    case 'settings':
      return 'settings'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isOutboxOp(value: unknown): value is OutboxOp {
  if (!isRecord(value)) return false
  const kind = value.kind
  if (kind === 'settings') return isRecord(value.value)
  if (kind === 'contact' || kind === 'assignment') {
    return isRecord(value.value) && typeof value.value.id === 'string'
  }
  if (kind === 'contact-delete' || kind === 'assignment-delete') {
    return typeof value.id === 'string'
  }
  return false
}

export function loadOutbox(): OutboxOp[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // una modifica in coda scritta prima del cambio di significato va letta come disponibilità
    return parsed
      .filter(isOutboxOp)
      .map((op) =>
        op.kind === 'contact' ? { kind: 'contact' as const, value: normalizeStoredContact(op.value) } : op,
      )
  } catch {
    return []
  }
}

export function saveOutbox(ops: OutboxOp[]): void {
  if (ops.length === 0) {
    localStorage.removeItem(OUTBOX_KEY)
    return
  }
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops))
}

/** Aggiunge una modifica in fondo alla coda, togliendo quella che sostituisce. */
export function enqueue(ops: OutboxOp[], op: OutboxOp): OutboxOp[] {
  const key = opKey(op)
  const kept = ops.filter((item) => {
    if (opKey(item) === key) return false
    // cancellare un contatto porta via anche i suoi appuntamenti: inutile rimandarli
    if (op.kind === 'contact-delete' && item.kind === 'assignment') {
      return item.value.contactId !== op.id
    }
    return true
  })
  return [...kept, op]
}

/** Porta in coda un intero insieme di dati (usato dopo un import o un ripristino). */
export function opsForData(data: LocalData): OutboxOp[] {
  return [
    ...data.contacts.map((contact): OutboxOp => ({ kind: 'contact', value: contact })),
    ...data.assignments.map((assignment): OutboxOp => ({ kind: 'assignment', value: assignment })),
    { kind: 'settings', value: data.settings },
  ]
}

export async function runOutboxOp(client: SupabaseClient, op: OutboxOp): Promise<void> {
  switch (op.kind) {
    case 'contact':
      await pushContact(client, op.value)
      return
    case 'contact-delete':
      await deleteContactRemote(client, op.id)
      return
    case 'assignment':
      await pushAssignment(client, op.value)
      return
    case 'assignment-delete':
      await deleteAssignmentRemote(client, op.id)
      return
    case 'settings':
      await pushSettings(client, op.value)
      return
  }
}

export interface FlushResult {
  remaining: OutboxOp[]
  sent: number
  error: string | null
}

/**
 * Manda al database tutto quello che è in coda.
 * Un elemento che fallisce resta in attesa senza bloccare gli altri: la coda
 * viene riscritta su localStorage a ogni giro, così un ricaricamento non la perde.
 */
export async function flushOutbox(
  client: SupabaseClient,
  ops: OutboxOp[],
): Promise<FlushResult> {
  if (ops.length === 0) return { remaining: [], sent: 0, error: null }

  const failed: OutboxOp[] = []
  let sent = 0
  let firstError: string | null = null

  for (const op of ops) {
    try {
      await runOutboxOp(client, op)
      sent += 1
    } catch (error) {
      failed.push(op)
      if (!firstError) firstError = error instanceof Error ? error.message : String(error)
    }
  }

  saveOutbox(failed)
  return { remaining: failed, sent, error: firstError }
}

/** Rimette le modifiche ancora in coda sopra la copia del cloud. */
export function applyOps(data: LocalData, ops: OutboxOp[]): LocalData {
  if (ops.length === 0) return data

  let contacts = data.contacts
  let assignments = data.assignments
  let settings = data.settings

  for (const op of ops) {
    switch (op.kind) {
      case 'contact': {
        const exists = contacts.some((contact) => contact.id === op.value.id)
        contacts = exists
          ? contacts.map((contact) => (contact.id === op.value.id ? op.value : contact))
          : [...contacts, op.value]
        break
      }
      case 'contact-delete':
        contacts = contacts.filter((contact) => contact.id !== op.id)
        assignments = assignments.filter((assignment) => assignment.contactId !== op.id)
        break
      case 'assignment': {
        const exists = assignments.some((assignment) => assignment.id === op.value.id)
        assignments = exists
          ? assignments.map((assignment) =>
              assignment.id === op.value.id ? op.value : assignment,
            )
          : [...assignments, op.value]
        break
      }
      case 'assignment-delete':
        assignments = assignments.filter((assignment) => assignment.id !== op.id)
        break
      case 'settings':
        settings = op.value
        break
    }
  }

  return { contacts, assignments, settings }
}

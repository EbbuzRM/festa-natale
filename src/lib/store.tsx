import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeContacts } from './merge'
import type { Assignment, Contact, Settings } from './types'
import { nowIso } from './types'
import type { DbConfig, LocalData } from './repo'
import {
  clearLocal,
  createDb,
  emptyData,
  hasSession,
  loadDbConfig,
  loadLocal,
  pullAll,
  pushAll,
  saveDbConfig,
  saveLocal,
  signIn,
  signOut,
} from './repo'
import {
  applyOps,
  enqueue,
  flushOutbox,
  loadOutbox,
  opsForData,
  runOutboxOp,
  saveOutbox,
  type OutboxOp,
} from './outbox'

export type StoreMode = 'locale' | 'cloud'

export interface ImportSummary {
  added: number
  updated: number
  skipped: number
  assignments: number
}

interface StoreValue {
  data: LocalData
  mode: StoreMode
  loading: boolean
  syncError: string | null
  /** modifiche salvate qui ma non ancora arrivate al database */
  pending: number
  dbConfig: DbConfig | null
  saveContact: (contact: Contact) => Promise<void>
  removeContact: (id: string) => Promise<void>
  saveAssignment: (assignment: Assignment) => Promise<void>
  removeAssignment: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  importData: (payload: {
    contacts: Contact[]
    assignments?: Assignment[]
    settings?: Partial<Settings>
  }) => Promise<ImportSummary>
  replaceAll: (data: LocalData) => Promise<void>
  connectDb: (config: DbConfig | null) => Promise<void>
  authRequired: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retrySync: () => Promise<void>
  resetAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function pendingMessage(count: number, detail: string | null): string {
  const head =
    count === 1
      ? 'Una modifica non è ancora arrivata al database.'
      : `${count} modifiche non sono ancora arrivate al database.`
  return detail ? `${head} Ultimo errore: ${detail}` : head
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LocalData>(() => loadLocal())
  const [mode, setMode] = useState<StoreMode>('locale')
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [pending, setPending] = useState(() => loadOutbox().length)
  const clientRef = useRef<SupabaseClient | null>(null)
  const configRef = useRef<DbConfig | null>(null)
  const readyRef = useRef(false)

  const flushPending = useCallback(async (client: SupabaseClient) => {
    const result = await flushOutbox(client, loadOutbox())
    setPending(result.remaining.length)
    return result
  }, [])

  const queueMany = useCallback((ops: OutboxOp[]) => {
    let next = loadOutbox()
    for (const op of ops) next = enqueue(next, op)
    saveOutbox(next)
    setPending(next.length)
    return next.length
  }, [])

  const queue = useCallback((op: OutboxOp) => queueMany([op]), [queueMany])

  /** Prende la copia del cloud ma ci rimette sopra le modifiche ancora in coda. */
  const adopt = useCallback((remote: LocalData) => {
    const merged = applyOps(remote, loadOutbox())
    setData(merged)
    saveLocal(merged)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function start() {
      const config = loadDbConfig()
      configRef.current = config
      setDbConfig(config)
      if (!config) {
        readyRef.current = true
        setLoading(false)
        return
      }

      try {
        const client = await createDb(config)
        clientRef.current = client
        // la rete si prova subito: un indirizzo sbagliato deve dirlo, non chiedere la password
        const probe = await client.from('settings').select('id').limit(1)
        if (probe.error) throw new Error(probe.error.message)
        if (!(await hasSession(client))) {
          // c'è il database ma non la sessione: prima si entra
          if (!cancelled) setAuthRequired(true)
          return
        }
        // prima quello che era rimasto in sospeso, poi la copia del cloud
        const flushed = await flushPending(client)
        if (cancelled) return
        const remote = await pullAll(client)
        if (cancelled) return
        const local = loadLocal()

        if (remote.contacts.length === 0 && local.contacts.length > 0 && loadOutbox().length === 0) {
          // primo collegamento: porto in cloud quello che c'è già sul dispositivo
          await pushAll(client, local)
          if (cancelled) return
        } else {
          adopt(remote)
        }
        setMode('cloud')
        setSyncError(
          flushed.remaining.length === 0
            ? null
            : pendingMessage(flushed.remaining.length, flushed.error),
        )
      } catch (error) {
        if (cancelled) return
        clientRef.current = null
        setMode('locale')
        const queued = loadOutbox().length
        setSyncError(
          queued > 0
            ? `Database non raggiungibile: ${describeError(error)}. ${pendingMessage(queued, null)}`
            : `Database non raggiungibile: ${describeError(error)}`,
        )
      } finally {
        if (!cancelled) {
          readyRef.current = true
          setLoading(false)
        }
      }
    }

    void start()
    return () => {
      cancelled = true
    }
  }, [adopt, flushPending])

  useEffect(() => {
    if (!readyRef.current) return
    saveLocal(data)
  }, [data])

  /**
   * Manda una modifica al database. Se non riesce, la mette in coda invece di
   * buttarla: senza rete il lavoro fatto resta e riparte da solo più tardi.
   */
  const push = useCallback(
    async (op: OutboxOp) => {
      const client = clientRef.current
      if (!client) {
        // nessun database configurato: l'app vive solo su questo dispositivo
        if (!configRef.current) return
        queue(op)
        setSyncError(
          'Sei senza rete: la modifica è salvata su questo dispositivo e parte appena torna la connessione.',
        )
        return
      }

      try {
        await runOutboxOp(client, op)
        setSyncError(null)
      } catch (error) {
        queue(op)
        setSyncError(
          `Salvataggio non riuscito (${describeError(error)}): la modifica resta salvata qui e parte appena torna la connessione.`,
        )
        return
      }

      if (loadOutbox().length > 0) {
        const result = await flushPending(client)
        if (result.remaining.length > 0) {
          setSyncError(pendingMessage(result.remaining.length, result.error))
        }
      }
    },
    [flushPending, queue],
  )

  const saveContact = useCallback(
    async (contact: Contact) => {
      const stamp = nowIso()
      const stamped: Contact = {
        ...contact,
        createdAt: contact.createdAt || stamp,
        updatedAt: stamp,
      }
      setData((current) => {
        const exists = current.contacts.some((item) => item.id === stamped.id)
        return {
          ...current,
          contacts: exists
            ? current.contacts.map((item) => (item.id === stamped.id ? stamped : item))
            : [stamped, ...current.contacts],
        }
      })
      await push({ kind: 'contact', value: stamped })
    },
    [push],
  )

  const removeContact = useCallback(
    async (id: string) => {
      setData((current) => ({
        ...current,
        contacts: current.contacts.filter((contact) => contact.id !== id),
        assignments: current.assignments.filter((assignment) => assignment.contactId !== id),
      }))
      await push({ kind: 'contact-delete', id })
    },
    [push],
  )

  const saveAssignment = useCallback(
    async (assignment: Assignment) => {
      const stamp = nowIso()
      const stamped: Assignment = {
        ...assignment,
        createdAt: assignment.createdAt || stamp,
        updatedAt: stamp,
      }
      setData((current) => {
        const exists = current.assignments.some((item) => item.id === stamped.id)
        return {
          ...current,
          assignments: exists
            ? current.assignments.map((item) => (item.id === stamped.id ? stamped : item))
            : [...current.assignments, stamped],
        }
      })
      await push({ kind: 'assignment', value: stamped })
    },
    [push],
  )

  const removeAssignment = useCallback(
    async (id: string) => {
      setData((current) => ({
        ...current,
        assignments: current.assignments.filter((assignment) => assignment.id !== id),
      }))
      await push({ kind: 'assignment-delete', id })
    },
    [push],
  )

  const saveSettings = useCallback(
    async (settings: Settings) => {
      setData((current) => ({ ...current, settings }))
      await push({ kind: 'settings', value: settings })
    },
    [push],
  )

  /** Dopo un import massiccio: o passa tutto, o finisce tutto in coda. */
  const pushEverything = useCallback(
    async (next: LocalData, label: string) => {
      const client = clientRef.current
      if (client) {
        try {
          await pushAll(client, next)
          setSyncError(null)
          await flushPending(client)
          return
        } catch (error) {
          queueMany(opsForData(next))
          setSyncError(
            `${label} (${describeError(error)}): i dati sono salvati qui e partono appena torna la connessione.`,
          )
          return
        }
      }
      if (!configRef.current) return
      queueMany(opsForData(next))
      setSyncError(
        `Sei senza rete: ${label.toLowerCase()}. I dati sono salvati qui e partono appena torna la connessione.`,
      )
    },
    [flushPending, queueMany],
  )

  const importData = useCallback<StoreValue['importData']>(
    async (payload) => {
      const merged = mergeContacts(data.contacts, payload.contacts)
      const contactIds = new Set(merged.contacts.map((contact) => contact.id))
      const existingAssignments = new Set(data.assignments.map((assignment) => assignment.id))
      const newAssignments = (payload.assignments ?? []).filter(
        (assignment) =>
          !existingAssignments.has(assignment.id) && contactIds.has(assignment.contactId),
      )
      const next: LocalData = {
        contacts: merged.contacts,
        assignments: [...data.assignments, ...newAssignments],
        settings: { ...data.settings, ...(payload.settings ?? {}) },
      }
      setData(next)
      saveLocal(next)
      await pushEverything(next, 'Import non ancora inviato')
      return {
        added: merged.added,
        updated: merged.updated,
        skipped: merged.skipped,
        assignments: newAssignments.length,
      }
    },
    [data, pushEverything],
  )

  const replaceAll = useCallback(
    async (next: LocalData) => {
      setData(next)
      saveLocal(next)
      await pushEverything(next, 'Ripristino non ancora inviato')
    },
    [pushEverything],
  )

  const connectDb = useCallback(
    async (config: DbConfig | null) => {
      if (!config) {
        saveDbConfig(null)
        setDbConfig(null)
        configRef.current = null
        clientRef.current = null
        setMode('locale')
        setSyncError(null)
        return
      }

      const client = await createDb(config)
      const probe = await client.from('settings').select('id').limit(1)
      if (probe.error) throw new Error(`Database non raggiungibile: ${probe.error.message}`)
      configRef.current = config
      if (!(await hasSession(client))) {
        // config salvata, ma senza login non si legge niente: si passa dall'accesso
        saveDbConfig(config)
        setDbConfig(config)
        clientRef.current = client
        setAuthRequired(true)
        return
      }
      const flushed = await flushPending(client)
      const remote = await pullAll(client)
      saveDbConfig(config)
      setDbConfig(config)
      clientRef.current = client
      setMode('cloud')

      if (remote.contacts.length === 0 && data.contacts.length > 0 && loadOutbox().length === 0) {
        await pushAll(client, data)
      } else {
        adopt(remote)
      }
      setSyncError(
        flushed.remaining.length === 0
          ? null
          : pendingMessage(flushed.remaining.length, flushed.error),
      )
    },
    [data, adopt, flushPending],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      if (!dbConfig) throw new Error('Database non configurato: manca URL o chiave.')
      const client = clientRef.current ?? (await createDb(dbConfig))
      await signIn(client, email, password)
      clientRef.current = client
      configRef.current = dbConfig
      // le modifiche fatte prima dell'accesso partono adesso
      const flushed = await flushPending(client)
      const remote = await pullAll(client)
      const local = loadLocal()
      if (remote.contacts.length === 0 && local.contacts.length > 0 && loadOutbox().length === 0) {
        await pushAll(client, local)
      } else {
        adopt(remote)
      }
      setMode('cloud')
      setAuthRequired(false)
      setSyncError(
        flushed.remaining.length === 0
          ? null
          : pendingMessage(flushed.remaining.length, flushed.error),
      )
    },
    [dbConfig, adopt, flushPending],
  )

  const logout = useCallback(async () => {
    const client = clientRef.current
    setMode('locale')
    setAuthRequired(true)
    setSyncError(null)
    // la coda resta: chi rientra la ritrova
    clientRef.current = null
    if (client) await signOut(client)
  }, [])

  /** Riprova il collegamento e manda quello che è rimasto in coda. */
  const retrySync = useCallback(async () => {
    const config = configRef.current ?? loadDbConfig()
    if (!config) return
    let client = clientRef.current

    try {
      if (!client) {
        client = await createDb(config)
        const probe = await client.from('settings').select('id').limit(1)
        if (probe.error) throw new Error(probe.error.message)
        clientRef.current = client
        configRef.current = config
        if (!(await hasSession(client))) {
          setAuthRequired(true)
          return
        }
      }

      const result = await flushPending(client)
      if (result.remaining.length > 0) {
        setSyncError(pendingMessage(result.remaining.length, result.error))
        return
      }

      const remote = await pullAll(client)
      adopt(remote)
      setMode('cloud')
      setSyncError(null)
    } catch (error) {
      clientRef.current = null
      setSyncError(`Database non raggiungibile: ${describeError(error)}`)
    }
  }, [adopt, flushPending])

  // al ritorno della rete la coda riparte da sola, senza toccare niente
  useEffect(() => {
    const handleOnline = () => {
      void retrySync()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [retrySync])

  const resetAll = useCallback(() => {
    clearLocal()
    saveOutbox([])
    setPending(0)
    setData(emptyData())
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      mode,
      loading,
      syncError,
      pending,
      dbConfig,
      saveContact,
      removeContact,
      saveAssignment,
      removeAssignment,
      saveSettings,
      importData,
      replaceAll,
      connectDb,
      authRequired,
      login,
      logout,
      retrySync,
      resetAll,
    }),
    [
      data,
      mode,
      loading,
      syncError,
      pending,
      dbConfig,
      saveContact,
      removeContact,
      saveAssignment,
      removeAssignment,
      saveSettings,
      importData,
      replaceAll,
      connectDb,
      authRequired,
      login,
      logout,
      retrySync,
      resetAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore deve essere usato dentro StoreProvider')
  return value
}

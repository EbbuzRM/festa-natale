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
  deleteAssignmentRemote,
  deleteContactRemote,
  loadDbConfig,
  loadLocal,
  pullAll,
  pushAll,
  pushAssignment,
  pushContact,
  pushSettings,
  saveDbConfig,
  saveLocal,
  emptyData,
  hasSession,
  signIn,
  signOut,
} from './repo'

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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LocalData>(() => loadLocal())
  const [mode, setMode] = useState<StoreMode>('locale')
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const clientRef = useRef<SupabaseClient | null>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      const config = loadDbConfig()
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
        const remote = await pullAll(client)
        if (cancelled) return
        const local = loadLocal()

        if (remote.contacts.length === 0 && local.contacts.length > 0) {
          // primo collegamento: porto in cloud quello che c'è già sul dispositivo
          await pushAll(client, local)
          if (cancelled) return
        } else {
          setData(remote)
          saveLocal(remote)
        }
        setMode('cloud')
        setSyncError(null)
      } catch (error) {
        if (cancelled) return
        clientRef.current = null
        setMode('locale')
        setSyncError(`Database non raggiungibile: ${describeError(error)}`)
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
  }, [])

  useEffect(() => {
    if (!readyRef.current) return
    saveLocal(data)
  }, [data])

  const push = useCallback(async (action: (client: SupabaseClient) => Promise<void>) => {
    const client = clientRef.current
    if (!client) return
    try {
      await action(client)
      setSyncError(null)
    } catch (error) {
      setSyncError(describeError(error))
    }
  }, [])

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
      await push((client) => pushContact(client, stamped))
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
      await push((client) => deleteContactRemote(client, id))
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
      await push((client) => pushAssignment(client, stamped))
    },
    [push],
  )

  const removeAssignment = useCallback(
    async (id: string) => {
      setData((current) => ({
        ...current,
        assignments: current.assignments.filter((assignment) => assignment.id !== id),
      }))
      await push((client) => deleteAssignmentRemote(client, id))
    },
    [push],
  )

  const saveSettings = useCallback(
    async (settings: Settings) => {
      setData((current) => ({ ...current, settings }))
      await push((client) => pushSettings(client, settings))
    },
    [push],
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
      if (clientRef.current) {
        await push((client) => pushAll(client, next))
      }
      return {
        added: merged.added,
        updated: merged.updated,
        skipped: merged.skipped,
        assignments: newAssignments.length,
      }
    },
    [data, push],
  )

  const replaceAll = useCallback(
    async (next: LocalData) => {
      setData(next)
      saveLocal(next)
      if (clientRef.current) {
        await push((client) => pushAll(client, next))
      }
    },
    [push],
  )

  const connectDb = useCallback(
    async (config: DbConfig | null) => {
      if (!config) {
        saveDbConfig(null)
        setDbConfig(null)
        clientRef.current = null
        setMode('locale')
        setSyncError(null)
        return
      }

      const client = await createDb(config)
      const probe = await client.from('settings').select('id').limit(1)
      if (probe.error) throw new Error(`Database non raggiungibile: ${probe.error.message}`)
      if (!(await hasSession(client))) {
        // config salvata, ma senza login non si legge niente: si passa dall'accesso
        saveDbConfig(config)
        setDbConfig(config)
        clientRef.current = client
        setAuthRequired(true)
        return
      }
      const remote = await pullAll(client)
      saveDbConfig(config)
      setDbConfig(config)
      clientRef.current = client
      setMode('cloud')
      setSyncError(null)

      if (remote.contacts.length === 0 && data.contacts.length > 0) {
        await pushAll(client, data)
      } else {
        setData(remote)
        saveLocal(remote)
      }
    },
    [data],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      if (!dbConfig) throw new Error('Database non configurato: manca URL o chiave.')
      const client = clientRef.current ?? (await createDb(dbConfig))
      await signIn(client, email, password)
      clientRef.current = client
      const remote = await pullAll(client)
      const local = loadLocal()
      if (remote.contacts.length === 0 && local.contacts.length > 0) {
        await pushAll(client, local)
      } else {
        setData(remote)
        saveLocal(remote)
      }
      setMode('cloud')
      setAuthRequired(false)
      setSyncError(null)
    },
    [dbConfig],
  )

  const logout = useCallback(async () => {
    const client = clientRef.current
    setMode('locale')
    setAuthRequired(true)
    setSyncError(null)
    if (client) await signOut(client)
  }, [])

  const retrySync = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    try {
      await pushAll(client, data)
      setSyncError(null)
    } catch (error) {
      setSyncError(describeError(error))
    }
  }, [data])

  const resetAll = useCallback(() => {
    clearLocal()
    setData(emptyData())
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      mode,
      loading,
      syncError,
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

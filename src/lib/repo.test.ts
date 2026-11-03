import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDbConfig, saveDbConfig } from './repo'

const CONFIG_KEY = 'festa-natale.db.v1'

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  }
}

describe('configurazione del database', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage())
    vi.stubGlobal('sessionStorage', fakeStorage())
  })

  it('si ricorda url e chiave dopo la chiusura del browser', () => {
    saveDbConfig({ url: 'https://abc.supabase.co', anonKey: 'chiave' })
    expect(loadDbConfig()).toEqual({ url: 'https://abc.supabase.co', anonKey: 'chiave' })
    expect(localStorage.getItem(CONFIG_KEY)).toContain('abc.supabase.co')
    expect(sessionStorage.getItem(CONFIG_KEY)).toBeNull()
  })

  it('toglie tutto quando si scollega', () => {
    saveDbConfig({ url: 'https://abc.supabase.co', anonKey: 'chiave' })
    saveDbConfig(null)
    expect(loadDbConfig()).toBeNull()
    expect(localStorage.getItem(CONFIG_KEY)).toBeNull()
  })

  it('recupera una configurazione rimasta nella sessione vecchia', () => {
    sessionStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ url: 'https://vecchio.supabase.co', anonKey: 'chiave' }),
    )
    expect(loadDbConfig()?.url).toBe('https://vecchio.supabase.co')
    expect(localStorage.getItem(CONFIG_KEY)).toContain('vecchio.supabase.co')
    expect(sessionStorage.getItem(CONFIG_KEY)).toBeNull()
  })

  it('non si rompe se il salvataggio è scritto male', () => {
    localStorage.setItem(CONFIG_KEY, '{non json')
    expect(loadDbConfig()).toBeNull()
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: 5 }))
    expect(loadDbConfig()).toBeNull()
  })
})

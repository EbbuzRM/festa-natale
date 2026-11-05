import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { LocalData } from '../lib/repo'
import { SCHEMA_SQL } from '../lib/repo'
import { emptyList, type PartyList } from '../lib/types'
import { buildWorkbook, downloadWorkbook, parseWorkbook } from '../lib/excel'
import { dayRunLabel, daysInRange, defaultEventDays, formatAmount, groupDayRuns, money, plural } from '../lib/format'
import { IconClose } from './icons'
import { Banner, Field } from './ui'

interface Props {
  focus?: 'days' | null
}

function downloadJson(filename: string, payload: LocalData) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const MAX_PERIOD_DAYS = 60

export function SettingsView({ focus }: Props) {
  const { data, mode, syncError, dbConfig, saveSettings, importData, connectDb, logout, retrySync, resetAll } =
    useStore()
  const { settings } = data
  const [eventName, setEventName] = useState(settings.eventName)
  const [budget, setBudget] = useState(formatAmount(settings.budgetTotal))
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [newVenue, setNewVenue] = useState('')
  const [newList, setNewList] = useState('')
  const [url, setUrl] = useState(dbConfig?.url ?? '')
  const [anonKey, setAnonKey] = useState(dbConfig?.anonKey ?? '')
  const [dbMessage, setDbMessage] = useState<string | null>(null)
  const [dbBusy, setDbBusy] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const daysRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEventName(settings.eventName)
    setBudget(formatAmount(settings.budgetTotal))
  }, [settings.eventName, settings.budgetTotal])

  useEffect(() => {
    if (focus === 'days') daysRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])

  const commitEvent = () => {
    if (eventName !== settings.eventName) void saveSettings({ ...settings, eventName })
    const parsed = Number(budget.replace(/[^\d,.-]/g, '').replace(',', '.'))
    const nextBudget = Number.isFinite(parsed) ? parsed : 0
    if (nextBudget !== settings.budgetTotal) void saveSettings({ ...settings, budgetTotal: nextBudget })
  }

  const setDays = (days: string[]) => {
    void saveSettings({ ...settings, eventDays: [...new Set(days)].sort() })
  }

  const runs = useMemo(() => groupDayRuns(settings.eventDays), [settings.eventDays])
  const preview = useMemo(
    () => (rangeStart && rangeEnd ? daysInRange(rangeStart, rangeEnd) : []),
    [rangeStart, rangeEnd],
  )

  /** Si scrivono inizio e fine: i giorni in mezzo si ricavano, nessuno da spuntare. */
  const addRange = () => {
    if (!rangeStart || !rangeEnd) return
    if (daysInRange(rangeStart, rangeEnd).length === 0) {
      setRangeError('La fine viene prima dell’inizio: inverti le due date.')
      return
    }
    if (preview.length > MAX_PERIOD_DAYS) {
      setRangeError(`Sono ${preview.length} giorni di fila: controlla le date (massimo ${MAX_PERIOD_DAYS}).`)
      return
    }
    setRangeError(null)
    setDays([...settings.eventDays, ...preview])
    setRangeStart('')
    setRangeEnd('')
  }

  const setVenues = (venues: string[]) => {
    void saveSettings({ ...settings, venues: [...new Set(venues)] })
  }

  const addList = () => {
    const name = newList.trim().replace(/\s+/g, ' ')
    if (!name) return
    setNewList('')
    const exists = settings.lists.some((list) => list.name.toLowerCase() === name.toLowerCase())
    if (exists) return
    void saveSettings({ ...settings, lists: [...settings.lists, emptyList(name)] })
  }

  const removeList = (list: PartyList) => {
    if (
      list.items.length > 0 &&
      !window.confirm(`Togliere «${list.name}» e le ${list.items.length} righe dentro?`)
    ) {
      return
    }
    void saveSettings({ ...settings, lists: settings.lists.filter((item) => item.id !== list.id) })
  }

  const commitTarget = (raw: string) => {
    const parsed = Number(raw.replace(/[^\d]/g, ''))
    const next = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
    if (next !== settings.entertainmentTarget) void saveSettings({ ...settings, entertainmentTarget: next })
  }

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h1>Impostazioni</h1>
          <p className="head-meta">Nome evento, budget, giorni, database e backup.</p>
        </div>
      </div>

      <article className="panel">
        <header className="panel-head">
          <h2>L'evento</h2>
        </header>
        <div className="form-grid">
          <Field label="Nome evento">
            <input
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              onBlur={commitEvent}
              placeholder="Festa di Natale"
            />
          </Field>
          <Field label="Budget disponibile" hint="quello che ti dà il comune o chi finanzia">
            <input
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              onBlur={commitEvent}
              placeholder="3000"
              inputMode="decimal"
            />
          </Field>
        </div>
        <p className="muted small">
          Budget attuale: <strong>{money(settings.budgetTotal)}</strong>
        </p>
      </article>

      <article className="panel" ref={daysRef}>
        <header className="panel-head">
          <h2>Giorni dell'evento</h2>
          <button
            type="button"
            className="link"
            onClick={() => setDays(defaultEventDays(new Date().getFullYear()))}
          >
            ricarica i weekend di dicembre
          </button>
        </header>
        <div className="range-form">
          <Field label="Inizio">
            <input
              type="date"
              value={rangeStart}
              onChange={(event) => {
                setRangeStart(event.target.value)
                setRangeError(null)
              }}
            />
          </Field>
          <Field label="Fine">
            <input
              type="date"
              value={rangeEnd}
              onChange={(event) => {
                setRangeEnd(event.target.value)
                setRangeError(null)
              }}
            />
          </Field>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!rangeStart || !rangeEnd}
            onClick={addRange}
          >
            Aggiungi periodo
          </button>
        </div>

        {rangeError ? (
          <p className="form-error" role="alert">
            {rangeError}
          </p>
        ) : preview.length > 0 ? (
          <p className="form-note">
            {dayRunLabel(groupDayRuns(preview)[0])} · {preview.length}{' '}
            {plural(preview.length, 'giorno', 'giorni')}
          </p>
        ) : (
          <p className="muted small">
            Scrivi solo la data d’inizio e quella di fine: i giorni in mezzo si aggiungono da soli.
          </p>
        )}

        {runs.length > 0 ? (
          <>
            <ul className="period-list">
              {runs.map((run) => (
                <li key={run.start} className="period-row">
                  <span className="period-when">{dayRunLabel(run)}</span>
                  <span className="period-count num">
                    {run.count} {plural(run.count, 'giorno', 'giorni')}
                  </span>
                  <button
                    type="button"
                    className="period-remove"
                    aria-label={`Togli ${dayRunLabel(run)}`}
                    onClick={() =>
                      setDays(settings.eventDays.filter((day) => !run.days.includes(day)))
                    }
                  >
                    <IconClose size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="muted small">
              {settings.eventDays.length} giorni in calendario, in {runs.length}{' '}
              {plural(runs.length, 'periodo', 'periodi')}.
            </p>
          </>
        ) : (
          <p className="muted small">Nessun giorno: l’evento non ha ancora una data.</p>
        )}
      </article>

      <article className="panel">
        <header className="panel-head">
          <h2>Intrattenimento</h2>
          <span className="muted small">slot da riempire e postazioni</span>
        </header>
        <div className="form-grid">
          <Field label="Slot di intrattenimento previsti" hint="quanti ne servono in tutto">
            <input
              key={settings.entertainmentTarget}
              defaultValue={settings.entertainmentTarget}
              inputMode="numeric"
              onBlur={(event) => commitTarget(event.target.value)}
              placeholder="30"
              aria-label="Slot di intrattenimento previsti"
            />
          </Field>
        </div>
        <div className="field">
          <span className="field-label">Postazioni</span>
          <ul className="day-chips">
            {settings.venues.map((venue) => (
              <li key={venue}>
                <span>{venue}</span>
                <button
                  type="button"
                  aria-label={`Togli ${venue}`}
                  onClick={() => setVenues(settings.venues.filter((item) => item !== venue))}
                >
                  <IconClose size={13} />
                </button>
              </li>
            ))}
            {settings.venues.length === 0 ? <li className="muted">Nessuna postazione.</li> : null}
          </ul>
        </div>
        <div className="inline-form">
          <input
            value={newVenue}
            onChange={(event) => setNewVenue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && newVenue.trim()) {
                setVenues([...settings.venues, newVenue.trim()])
                setNewVenue('')
              }
            }}
            placeholder="Limonaia 3, palco esterno…"
            aria-label="Nuova postazione"
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!newVenue.trim()}
            onClick={() => {
              setVenues([...settings.venues, newVenue.trim()])
              setNewVenue('')
            }}
          >
            Aggiungi postazione
          </button>
        </div>
        <p className="muted small">
          Ogni artista messo in calendario riempie uno slot; la postazione dice dove suona.
        </p>
      </article>

      <article className="panel">
        <header className="panel-head">
          <h2>Liste</h2>
          <span className="muted small">acquisti, giochi, cose da portare</span>
        </header>
        <div className="field">
          <span className="field-label">Le tue liste</span>
          <ul className="day-chips">
            {settings.lists.map((list) => (
              <li key={list.id}>
                <span>{list.name}</span>
                <button
                  type="button"
                  aria-label={`Togli ${list.name}`}
                  onClick={() => removeList(list)}
                >
                  <IconClose size={13} />
                </button>
              </li>
            ))}
            {settings.lists.length === 0 ? <li className="muted">Nessuna lista.</li> : null}
          </ul>
        </div>
        <div className="inline-form">
          <input
            value={newList}
            onChange={(event) => setNewList(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addList()
            }}
            placeholder="Acquisti, Giochi di società…"
            aria-label="Nuova lista"
          />
          <button type="button" className="btn btn-ghost" disabled={!newList.trim()} onClick={addList}>
            Aggiungi lista
          </button>
        </div>
        <p className="muted small">
          Qui si creano solo i nomi: le righe e le spunte si gestiscono dalla sezione Liste.
        </p>
      </article>

      {syncError ? (
        <Banner tone="error">
          {syncError}
          <button type="button" className="btn btn-ghost" onClick={() => void retrySync()}>
            Riprova
          </button>
        </Banner>
      ) : null}

      <details className="howto">
        <summary>Database · configurazione (avanzata)</summary>
        <article className="panel">
        <header className="panel-head">
          <h2>Database</h2>
          <span className={`pill ${mode === 'cloud' ? 'pill-ok' : 'pill-off'}`}>
            {mode === 'cloud' ? 'collegato' : 'solo questo dispositivo'}
          </span>
        </header>
        <p className="muted small">
          Con un piccolo database cloud (Supabase, piano gratuito) i contatti restano al sicuro e li vedi
          uguali da telefono e computer. Senza database l'app funziona lo stesso, ma i dati vivono in questo
          browser: esporta il backup.
        </p>

        <div className="form-grid">
          <Field label="Project URL" hint="es. https://abcdefgh.supabase.co">
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…supabase.co" />
          </Field>
          <Field label="Anon key" hint="la chiave pubblica del progetto">
            <input
              value={anonKey}
              onChange={(event) => setAnonKey(event.target.value)}
              placeholder="eyJhbGciOi…"
            />
          </Field>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={dbBusy || !url.trim() || !anonKey.trim()}
            onClick={async () => {
              setDbBusy(true)
              setDbMessage(null)
              try {
                await connectDb({ url: url.trim(), anonKey: anonKey.trim() })
                setDbMessage('Collegato. I dati sono sul database.')
              } catch (error) {
                setDbMessage(error instanceof Error ? error.message : 'Connessione non riuscita')
              } finally {
                setDbBusy(false)
              }
            }}
          >
            {dbBusy ? 'Collego…' : mode === 'cloud' ? 'Ricollega' : 'Collega'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              await connectDb(null)
              setUrl('')
              setAnonKey('')
              setDbMessage('Database scollegato: si torna al salvataggio locale.')
            }}
          >
            Scollega
          </button>
          {mode === 'cloud' ? (
            <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
              Esci
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(SCHEMA_SQL)
                setDbMessage('Schema SQL copiato: incollalo nell’SQL Editor di Supabase e lancialo.')
              } catch {
                setDbMessage('Copia non riuscita: lo schema è nel file supabase/schema.sql del progetto.')
              }
            }}
          >
            Copia schema SQL
          </button>
        </div>
        {dbMessage ? <p className="form-note">{dbMessage}</p> : null}
        <details className="howto">
          <summary>Come creo il database (2 minuti)</summary>
          <ol>
            <li>Entra su supabase.com e crea un progetto gratuito.</li>
            <li>Apri <em>SQL Editor</em>, incolla lo schema (pulsante qui sopra) e premi Run.</li>
            <li>
              In <em>Project Settings → API</em> copia <em>Project URL</em> e la chiave <em>anon public</em>.
            </li>
            <li>Incollali qui e premi Collega.</li>
          </ol>
        </details>
        </article>
      </details>

      <article className="panel">
        <header className="panel-head">
          <h2>Backup e Excel</h2>
        </header>
        <p className="muted small">
          Il file Excel ha tre fogli: Contatti, Calendario, Budget. Si può riaprire e reimportare qui.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const workbook = await buildWorkbook(data.contacts, data.assignments, settings)
              await downloadWorkbook(workbook, 'festa-natale.xlsx')
            }}
          >
            Scarica Excel
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => downloadJson('festa-natale-backup.json', data)}
          >
            Scarica backup JSON
          </button>
          <label className="btn btn-ghost file-btn">
            Importa Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                try {
                  const parsed = await parseWorkbook(await file.arrayBuffer())
                  const summary = await importData(parsed)
                  setImportMessage(
                    `Importati: ${summary.added} nuovi, ${summary.updated} aggiornati, ${summary.skipped} già presenti, ${summary.assignments} appuntamenti.` +
                      (parsed.warnings.length > 0 ? ` Avvisi: ${parsed.warnings.slice(0, 3).join(' ')}` : ''),
                  )
                } catch (error) {
                  setImportMessage(error instanceof Error ? error.message : 'Import non riuscito')
                }
              }}
            />
          </label>
          <label className="btn btn-ghost file-btn">
            Importa JSON
            <input
              type="file"
              accept=".json"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                try {
                  const payload = JSON.parse(await file.text()) as unknown
                  if (!payload || typeof payload !== 'object') throw new Error('File non valido')
                  const obj = payload as { contacts?: unknown; assignments?: unknown; settings?: unknown }
                  if (obj.contacts !== undefined && !Array.isArray(obj.contacts)) throw new Error('contacts non valido')
                  if (obj.assignments !== undefined && !Array.isArray(obj.assignments)) throw new Error('assignments non valido')
                  const summary = await importData({
                    contacts: Array.isArray(obj.contacts) ? obj.contacts : [],
                    assignments: Array.isArray(obj.assignments) ? obj.assignments : [],
                    settings: obj.settings && typeof obj.settings === 'object' ? (obj.settings as LocalData['settings']) : undefined,
                  })
                  setImportMessage(
                    `Ripristinati: ${summary.added} nuovi, ${summary.updated} aggiornati, ${summary.skipped} doppioni saltati.`,
                  )
                } catch (error) {
                  setImportMessage(error instanceof Error ? error.message : 'Backup non valido')
                }
              }}
            />
          </label>
        </div>
        {importMessage ? <p className="form-note">{importMessage}</p> : null}
        <p className="muted small">
          {data.contacts.length} contatti, {data.assignments.length} appuntamenti in memoria.
        </p>
      </article>

      <article className="panel danger-panel">
        <header className="panel-head">
          <h2>Zona rossa</h2>
        </header>
        <p className="muted small">
          Svuota i dati su questo dispositivo. Se il database è collegato, i dati in cloud restano.
        </p>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (!window.confirm('Cancellare tutti i dati locali? Fai prima un backup.')) return
            resetAll()
          }}
        >
          Cancella dati locali
        </button>
      </article>
    </section>
  )
}

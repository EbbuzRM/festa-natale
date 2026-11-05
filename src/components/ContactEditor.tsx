import { useEffect, useState } from 'react'
import type { Category, Contact, Status } from '../lib/types'
import {
  CATEGORIES,
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  SUBTYPES,
  emptyContact,
} from '../lib/types'
import { normalizePeriods, periodLabel } from '../lib/availability'
import { money, parseMoney } from '../lib/format'
import { IconClose } from './icons'
import { Field, Sheet } from './ui'
import { SuggestInput } from './SuggestInput'

interface Props {
  open: boolean
  contact: Contact | null
  onClose: () => void
  onSave: (contact: Contact) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

function waLink(contact: Contact): string | null {
  const raw = contact.whatsapp || contact.phone
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

export function ContactEditor({ open, contact, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Contact>(() => contact ?? emptyContact())
  const [priceText, setPriceText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fromDay, setFromDay] = useState('')
  const [toDay, setToDay] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const next = contact ?? emptyContact()
    // anche un backup vecchio può non avere i periodi: qui si riparte sempre da un elenco
    setDraft({ ...next, available: Array.isArray(next.available) ? next.available : [] })
    setPriceText(next.price === null ? '' : String(next.price).replace('.', ','))
    setError(null)
    setFromDay('')
    setToDay('')
    setRangeError(null)
  }, [open, contact])

  const isNew = contact === null
  const set = <K extends keyof Contact>(key: K, value: Contact[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function addAvailable() {
    if (!fromDay) return
    const to = toDay || fromDay
    if (to < fromDay) {
      setRangeError('La fine viene prima dell’inizio: inverti le due date.')
      return
    }
    set('available', normalizePeriods([...draft.available, { from: fromDay, to }]))
    setFromDay('')
    setToDay('')
    setRangeError(null)
  }

  async function handleSave() {
    if (!draft.name.trim() && !draft.company.trim()) {
      setError('Serve almeno il nome o il nome della compagnia.')
      return
    }
    setBusy(true)
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        surname: draft.surname.trim(),
        company: draft.company.trim(),
        email: draft.email.trim(),
        price: parseMoney(priceText),
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const slider = waLink(draft)

  return (
    <Sheet
      open={open}
      title={isNew ? 'Nuovo contatto' : draft.name || draft.company || 'Contatto'}
      subtitle={isNew ? 'inserimento rapido' : CATEGORY_LABELS[draft.category]}
      onClose={onClose}
      footer={
        <>
          {contact && onDelete ? (
            <button
              type="button"
              className="btn btn-ghost btn-danger"
              onClick={async () => {
                if (!window.confirm(`Eliminare ${draft.name || draft.company}?`)) return
                await onDelete(contact.id)
                onClose()
              }}
            >
              Elimina
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Salvo…' : 'Salva'}
          </button>
        </>
      }
    >
      <div className="picker-row">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={`picker${draft.category === category ? ' is-active' : ''}`}
            onClick={() => set('category', category as Category)}
          >
            <strong>{CATEGORY_LABELS[category]}</strong>
            <span>{CATEGORY_HINTS[category]}</span>
          </button>
        ))}
      </div>

      <div className="form-grid">
        <Field label="Nome" hint="obbligatorio solo questo, il resto dopo">
          <input
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Mario"
            autoComplete="off"
          />
        </Field>
        <Field label="Cognome">
          <input
            value={draft.surname}
            onChange={(event) => set('surname', event.target.value)}
            placeholder="Rossi"
            autoComplete="off"
          />
        </Field>
        <Field label="Compagnia / gruppo">
          <input
            value={draft.company}
            onChange={(event) => set('company', event.target.value)}
            placeholder="Coro di S. Lucia"
            autoComplete="off"
          />
        </Field>
        <Field label="Tipo di servizio" hint="scegli dalla lista o scrivi il tuo">
          <SuggestInput
            value={draft.subtype}
            onChange={(next) => set('subtype', next)}
            options={SUBTYPES[draft.category]}
            placeholder={SUBTYPES[draft.category][0]}
            ariaLabel="Tipo di servizio"
          />
        </Field>
        <Field label="Telefono">
          <input
            value={draft.phone}
            onChange={(event) => set('phone', event.target.value)}
            placeholder="333 1234567"
            inputMode="tel"
            autoComplete="off"
          />
        </Field>
        <Field label="WhatsApp" hint="se diverso dal telefono">
          <input
            value={draft.whatsapp}
            onChange={(event) => set('whatsapp', event.target.value)}
            placeholder="333 1234567"
            inputMode="tel"
            autoComplete="off"
          />
        </Field>
        <Field label="Email" wide>
          <input
            value={draft.email}
            onChange={(event) => set('email', event.target.value)}
            placeholder="mario@esempio.it"
            inputMode="email"
            autoComplete="off"
          />
        </Field>
        <Field label="Prezzo richiesto" hint="per l'evento">
          <input
            value={priceText}
            onChange={(event) => setPriceText(event.target.value)}
            placeholder="350"
            inputMode="decimal"
          />
        </Field>
        <Field label="Nota sul prezzo" hint="es. trattabile, + IVA">
          <input
            value={draft.priceNote}
            onChange={(event) => set('priceNote', event.target.value)}
            placeholder="trattabile"
          />
        </Field>
        <Field label="Chi ha fornito il contatto" hint="fondamentale per ringraziare">
          <input
            value={draft.source}
            onChange={(event) => set('source', event.target.value)}
            placeholder="Giulia"
          />
        </Field>
        <Field label="Da dove viene">
          <input
            value={draft.origin}
            onChange={(event) => set('origin', event.target.value)}
            placeholder="volantino al mercato"
          />
        </Field>
      </div>

      <fieldset className="status-set">
        <legend>Stato</legend>
        <div className="status-row">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`status-option status-${status}${draft.status === status ? ' is-active' : ''}`}
              onClick={() => set('status', status as Status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <span className="field-label">Date in cui PUÒ venire</span>
        <p className="field-hint">
          Sono i giorni in cui è disponibile: fuori da queste date l’app non te lo propone in calendario.
          Se non aggiungi nessuna data, resta disponibile sempre.
        </p>
        <div className="range-form">
          <Field label="Dal">
            <input
              type="date"
              value={fromDay}
              onChange={(event) => {
                setFromDay(event.target.value)
                setRangeError(null)
              }}
            />
          </Field>
          <Field label="Al">
            <input
              type="date"
              value={toDay}
              onChange={(event) => {
                setToDay(event.target.value)
                setRangeError(null)
              }}
            />
          </Field>
          <button type="button" className="btn btn-ghost" disabled={!fromDay} onClick={addAvailable}>
            Aggiungi periodo
          </button>
        </div>
        {rangeError ? <p className="form-error">{rangeError}</p> : null}
        {draft.available.length > 0 ? (
          <ul className="period-list">
            {draft.available.map((period) => (
              <li key={`${period.from}-${period.to}`} className="period-row">
                <span className="period-when">{periodLabel(period)}</span>
                <button
                  type="button"
                  className="period-remove"
                  aria-label={`Togli ${periodLabel(period)}`}
                  onClick={() => set('available', draft.available.filter((item) => item !== period))}
                >
                  <IconClose size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Field label="Note" wide>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
          placeholder="Ha detto che richiama lui, disponibile solo la domenica…"
        />
      </Field>

      {draft.price !== null ? <p className="muted small">{money(draft.price)} al momento del salvataggio</p> : null}

      {error ? <p className="form-error">{error}</p> : null}

      {contact ? (
        <div className="quick-links">
          {draft.phone ? (
            <a className="btn btn-ghost" href={`tel:${draft.phone.replace(/\s/g, '')}`}>
              Chiama
            </a>
          ) : null}
          {slider ? (
            <a className="btn btn-ghost" href={slider} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          {draft.email ? (
            <a className="btn btn-ghost" href={`mailto:${draft.email}`}>
              Email
            </a>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  )
}

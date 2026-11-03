import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Category, Contact, Status } from '../lib/types'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  displayName,
} from '../lib/types'
import { money } from '../lib/format'
import { IconPlus } from './icons'
import { Chip, EmptyState } from './ui'

interface Props {
  onOpenContact: (contact: Contact) => void
  onCreate: () => void
}

function haystack(contact: Contact): string {
  return [
    contact.name,
    contact.surname,
    contact.company,
    contact.subtype,
    contact.phone,
    contact.email,
    contact.source,
    contact.origin,
    contact.notes,
  ]
    .join(' ')
    .toLowerCase()
}

export function ContactsView({ onOpenContact, onCreate }: Props) {
  const { data } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'tutte'>('tutte')
  const [status, setStatus] = useState<Status | 'tutti'>('tutti')

  const counts = useMemo(() => {
    const result: Record<Category, number> = { artisti: 0, materiali: 0, servizi: 0 }
    for (const contact of data.contacts) result[contact.category] += 1
    return result
  }, [data.contacts])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.contacts
      .filter((contact) => (category === 'tutte' ? true : contact.category === category))
      .filter((contact) => (status === 'tutti' ? true : contact.status === status))
      .filter((contact) => (needle ? haystack(contact).includes(needle) : true))
      .sort((a, b) => displayName(a).localeCompare(displayName(b), 'it'))
  }, [data.contacts, category, status, query])

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h1>Contatti</h1>
          <p className="head-meta">
            {data.contacts.length} in lista · {filtered.length} visibili
          </p>
        </div>
        <button type="button" className="btn btn-primary only-desktop" onClick={onCreate}>
          <IconPlus size={16} />
          Nuovo contatto
        </button>
      </div>

      <div className="filters">
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca nome, telefono, chi l'ha passato…"
          aria-label="Cerca contatti"
        />
        <div className="chip-row">
          <Chip active={category === 'tutte'} onClick={() => setCategory('tutte')} count={data.contacts.length}>
            Tutte
          </Chip>
          {CATEGORIES.map((key) => (
            <Chip key={key} active={category === key} onClick={() => setCategory(key)} count={counts[key]}>
              {CATEGORY_LABELS[key]}
            </Chip>
          ))}
        </div>
        <div className="chip-row">
          <Chip active={status === 'tutti'} onClick={() => setStatus('tutti')}>
            Ogni stato
          </Chip>
          {STATUSES.map((key) => (
            <Chip key={key} active={status === key} onClick={() => setStatus(key)}>
              {STATUS_LABELS[key]}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={data.contacts.length === 0 ? 'Rubrica vuota' : 'Nessun contatto con questi filtri'}
          hint={
            data.contacts.length === 0
              ? 'Inserisci il primo fornitore: bastano nome e telefono, il resto si aggiunge dopo.'
              : 'Prova a togliere un filtro o a cercare un altro nome.'
          }
          action={
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              Aggiungi contatto
            </button>
          }
        />
      ) : (
        <ul className="contact-list">
          {filtered.map((contact) => (
            <li key={contact.id}>
              <button type="button" className="contact-card" onClick={() => onOpenContact(contact)}>
                <div className="contact-main">
                  <h3>{displayName(contact)}</h3>
                  <p className="muted small">
                    <span className="contact-cat">{CATEGORY_LABELS[contact.category]}</span>
                    {[contact.company, contact.subtype].filter(Boolean).length > 0
                      ? ` · ${[contact.company, contact.subtype].filter(Boolean).join(' · ')}`
                      : ''}
                  </p>
                  {contact.source ? (
                    <p className="small source-line">passato da {contact.source}</p>
                  ) : null}
                </div>
                <div className="contact-side">
                  <span className={`stamp stamp-${contact.status}`}>{STATUS_LABELS[contact.status]}</span>
                  <span className="price">{money(contact.price)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

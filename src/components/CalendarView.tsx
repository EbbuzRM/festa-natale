import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Assignment, Contact, Slot } from '../lib/types'
import { SLOTS, SLOT_LABELS, displayName, newId } from '../lib/types'
import { boardRows, filledCells } from '../lib/board'
import { duplicatedContactIds, visibleAssignments } from '../lib/budget'
import { entertainmentStats } from '../lib/entertainment'
import { assignmentsOutsideAvailability, isAvailable } from '../lib/availability'
import { dayLabel, daysInRange, parseDay, relativeLabel, todayIso } from '../lib/format'
import { EntertainmentCount } from './Entertainment'
import { IconChevron, IconClose, IconPlus } from './icons'
import { Banner, Chip, EmptyState, Sheet } from './ui'

interface Props {
  onOpenContact: (contact: Contact) => void
  onEditDays: () => void
}

const WEEK_HEAD = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export function CalendarView({ onOpenContact, onEditDays }: Props) {
  const { data, saveAssignment, removeAssignment } = useStore()
  const { contacts, assignments, settings } = data
  const [selected, setSelected] = useState<string | null>(null)
  const [picking, setPicking] = useState<{ day: string; slot: Slot; venue: string } | null>(null)
  const [query, setQuery] = useState('')

  const days = useMemo(() => [...settings.eventDays].sort(), [settings.eventDays])
  // gli scartati restano in rubrica: qui non si vedono e non contano nel costo
  const visible = useMemo(() => visibleAssignments(assignments, contacts), [assignments, contacts])
  const duplicates = useMemo(() => new Set(duplicatedContactIds(visible)), [visible])
  const clashes = useMemo(() => assignmentsOutsideAvailability(visible, contacts), [visible, contacts])
  const entStats = useMemo(
    () => entertainmentStats(visible, contacts, settings),
    [visible, contacts, settings],
  )

  // il giorno che si sta guardando: quello scelto, o il primo che deve ancora venire
  const active = useMemo(() => {
    if (selected && days.includes(selected)) return selected
    return days.find((day) => day >= todayIso()) ?? days[0] ?? null
  }, [selected, days])
  const activeIndex = active ? days.indexOf(active) : -1

  const occupancy = useMemo(() => {
    const map = new Map<string, Set<Slot>>()
    for (const assignment of visible) {
      const used = map.get(assignment.day) ?? new Set<Slot>()
      used.add(assignment.slot)
      map.set(assignment.day, used)
    }
    return map
  }, [visible])

  const weeks = useMemo(() => {
    if (days.length === 0) return []
    const cells: (string | null)[] = []
    const offset = (parseDay(days[0]).getDay() + 6) % 7
    for (let index = 0; index < offset; index += 1) cells.push(null)
    cells.push(...daysInRange(days[0], days[days.length - 1]))
    while (cells.length % 7 !== 0) cells.push(null)
    const rows: (string | null)[][] = []
    for (let index = 0; index < cells.length; index += 7) rows.push(cells.slice(index, index + 7))
    return rows
  }, [days])

  const dayAssignments = useMemo(
    () => (active ? visible.filter((assignment) => assignment.day === active) : []),
    [visible, active],
  )
  const rows = useMemo(
    () => boardRows(settings.venues, dayAssignments, contacts),
    [settings.venues, dayAssignments, contacts],
  )
  const cellsUsed = filledCells(rows)

  const pickerContacts = useMemo(() => {
    const target = picking
    if (!target) return []
    const needle = query.trim().toLowerCase()
    const taken = new Set(
      visible
        .filter(
          (assignment) =>
            assignment.day === target.day &&
            assignment.slot === target.slot &&
            (assignment.venue ?? '').trim() === target.venue.trim(),
        )
        .map((assignment) => assignment.contactId),
    )
    return contacts
      .filter((contact) => contact.status !== 'scartato')
      .filter((contact) => !taken.has(contact.id))
      .filter((contact) =>
        needle ? `${displayName(contact)} ${contact.company}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => {
        // prima chi può venire quel giorno, poi gli altri
        const off = Number(isAvailable(b, target.day)) - Number(isAvailable(a, target.day))
        if (off !== 0) return off
        const weight = (contact: Contact) => (contact.status === 'confermato' ? 0 : 1)
        return weight(a) - weight(b) || displayName(a).localeCompare(displayName(b), 'it')
      })
  }, [visible, contacts, picking, query])

  function openPicker(day: string, slot: Slot, venue: string) {
    setPicking({ day, slot, venue })
    setQuery('')
  }

  async function assign(contact: Contact) {
    if (!picking) return
    const assignment: Assignment = {
      id: newId(),
      contactId: contact.id,
      day: picking.day,
      slot: picking.slot,
      venue: picking.venue,
      note: '',
      createdAt: '',
      updatedAt: '',
    }
    await saveAssignment(assignment)
    setQuery('')
  }

  if (days.length === 0) {
    return (
      <section className="view">
        <div className="view-head">
          <div>
            <h1>Giorni dell'evento</h1>
          </div>
        </div>
        <EmptyState
          title="Nessun giorno impostato"
          hint="Imposta la data d’inizio e quella di fine: i giorni della festa si aggiungono da soli."
          action={
            <button type="button" className="btn btn-primary" onClick={onEditDays}>
              Imposta le date
            </button>
          }
        />
      </section>
    )
  }

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h1>Chi suona quando</h1>
          <p className="head-meta">{days.length} giorni</p>
        </div>
        <button type="button" className="btn btn-ghost only-desktop" onClick={onEditDays}>
          Modifica giorni
        </button>
      </div>

      <EntertainmentCount stats={entStats} />

      {duplicates.size > 0 ? (
        <Banner tone="warn">
          {duplicates.size} contatti sono in più giorni: controlla di non pagare due volte lo stesso.
        </Banner>
      ) : null}
      {clashes.length > 0 ? (
        <Banner tone="warn">
          {clashes.length === 1 ? 'Un appuntamento cade' : `${clashes.length} appuntamenti cadono`} fuori
          dalle date in cui il contatto ha detto di poter venire.
        </Banner>
      ) : null}
      {active ? (
        <>
          <div className="board-head">
            <div>
              <h2 className="board-title">{dayLabel(active)}</h2>
              <p className="board-meta">
                {dayAssignments.length} {dayAssignments.length === 1 ? 'appuntamento' : 'appuntamenti'} ·{' '}
                {relativeLabel(active)}
              </p>
            </div>
            <div className="board-nav">
              <button
                type="button"
                aria-label="Giorno prima"
                disabled={activeIndex <= 0}
                onClick={() => setSelected(days[activeIndex - 1] ?? null)}
              >
                <IconChevron direction="left" size={16} />
              </button>
              <button
                type="button"
                aria-label="Giorno dopo"
                disabled={activeIndex < 0 || activeIndex >= days.length - 1}
                onClick={() => setSelected(days[activeIndex + 1] ?? null)}
              >
                <IconChevron direction="right" size={16} />
              </button>
            </div>
          </div>

          <div className="board" aria-label={`Tabellone di ${dayLabel(active)}`}>
            <div className="board-corner" aria-hidden="true">
              posto
            </div>
            {SLOTS.map((slot) => (
              <div key={slot} className="board-slot">
                {SLOT_LABELS[slot]}
              </div>
            ))}
            {rows.map((row) => (
              <Fragment key={row.venue}>
                <div className="board-place">{row.label}</div>
                {SLOTS.map((slot) => (
                  <div key={slot} className="board-cell">
                    {row.cells[slot].map(({ assignment, contact }) => (
                      <div key={assignment.id} className="board-entry">
                        <div className="board-entry-head">
                          <button
                            type="button"
                            className="board-name"
                            onClick={() => onOpenContact(contact)}
                          >
                            {displayName(contact)}
                          </button>
                          <button
                            type="button"
                            className="board-remove"
                            aria-label={`Togli ${displayName(contact)} da ${row.label}, ${SLOT_LABELS[slot]} del ${dayLabel(active)}`}
                            onClick={() => void removeAssignment(assignment.id)}
                          >
                            <IconClose size={11} />
                          </button>
                        </div>
                        {!isAvailable(contact, active) ? (
                          <span className="day-off">fuori dalle sue date</span>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="board-add"
                      aria-label={`Aggiungi a ${row.label}, ${SLOT_LABELS[slot]}, ${dayLabel(active)}`}
                      onClick={() => openPicker(active, slot, row.venue)}
                    >
                      <IconPlus size={12} />
                      aggiungi
                    </button>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>

          <div className="board-foot">
            <p className="muted small">
              {cellsUsed === 1 ? '1 casella usata' : `${cellsUsed} caselle usate`} su{' '}
              {rows.length * SLOTS.length} · {venuesLabel(rows.length)}
            </p>
          </div>

          <details className="index">
            <summary>Tutti i giorni dell'evento ({days.length})</summary>
            <div className="week-row week-head" aria-hidden="true">
              {WEEK_HEAD.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="week-row">
                {week.map((day, position) => {
                  if (!day) return <span key={`b-${position}`} className="index-blank" />
                  if (!settings.eventDays.includes(day)) {
                    return (
                      <span key={day} className="index-day is-closed">
                        <span className="num">{parseDay(day).getDate()}</span>
                      </span>
                    )
                  }
                  const used = occupancy.get(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`index-day is-event${day === active ? ' is-selected' : ''}`}
                      aria-current={day === active ? 'date' : undefined}
                      aria-label={dayLabel(day)}
                      onClick={() => setSelected(day)}
                    >
                      <span className="num">{parseDay(day).getDate()}</span>
                      <span className="bars" aria-hidden="true">
                        {SLOTS.map((slot) => (
                          <i key={slot} className={`bar${used?.has(slot) ? ' is-on' : ''}`} />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </details>
        </>
      ) : null}

      <Sheet
        open={picking !== null}
        title="Chi metto?"
        subtitle={
          picking
            ? `${dayLabel(picking.day)} · ${SLOT_LABELS[picking.slot]} · ${picking.venue || 'senza postazione'}`
            : undefined
        }
        onClose={() => setPicking(null)}
      >
        <div className="picker-field">
          <p className="field-label">Fascia</p>
          <div className="slot-picker" role="group" aria-label="Fascia della giornata">
            {SLOTS.map((candidate) => (
              <Chip
                key={candidate}
                active={picking?.slot === candidate}
                onClick={() => setPicking((current) => (current ? { ...current, slot: candidate } : current))}
              >
                {SLOT_LABELS[candidate]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="picker-field">
          <p className="field-label">Postazione</p>
          <div className="slot-picker" role="group" aria-label="Postazione">
            <Chip
              active={picking?.venue === ''}
              onClick={() => setPicking((current) => (current ? { ...current, venue: '' } : current))}
            >
              non decisa
            </Chip>
            {settings.venues.map((candidate) => (
              <Chip
                key={candidate}
                active={picking?.venue === candidate}
                onClick={() => setPicking((current) => (current ? { ...current, venue: candidate } : current))}
              >
                {candidate}
              </Chip>
            ))}
          </div>
        </div>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca un contatto…"
          aria-label="Cerca contatto da assegnare"
        />
        {pickerContacts.length === 0 ? (
          <p className="muted">
            Nessun contatto disponibile. Se la rubrica è vuota, inseriscine uno dalla sezione Contatti.
          </p>
        ) : (
          <ul className="pick-list">
            {pickerContacts.map((contact) => {
              const off = picking ? !isAvailable(contact, picking.day) : false
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="pick-row"
                    disabled={off}
                    aria-label={`${displayName(contact)}${off ? ', non disponibile' : ''}`}
                    onClick={() => void assign(contact)}
                  >
                    <span>
                      <strong>{displayName(contact)}</strong>
                      <em className="muted small">
                        {contact.subtype || contact.company || 'senza tipo'} · {contact.status}
                      </em>
                      {off ? <em className="day-off">fuori dalle sue date</em> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>
    </section>
  )
}

function venuesLabel(count: number): string {
  return count === 1 ? '1 postazione' : `${count} postazioni`
}

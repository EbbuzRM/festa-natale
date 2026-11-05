import { useState } from 'react'
import type { Note } from '../lib/types'
import { emptyNote, nowIso } from '../lib/types'
import { dayLabel, plural } from '../lib/format'

/** Appunti di riunioni e telefonate: restano insieme all'evento, senza una voce di menù in più. */
export function NotesPanel({
  notes,
  onChange,
}: {
  notes: Note[]
  onChange: (notes: Note[]) => void
}) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  function reset() {
    setTitle('')
    setText('')
    setEditing(null)
  }

  function save() {
    const body = text.trim()
    const head = title.trim() || body.split('\n')[0].slice(0, 50)
    if (!head && !body) return

    if (editing) {
      onChange(
        notes.map((note) =>
          note.id === editing
            ? { ...note, title: head || 'Senza titolo', text: body, updatedAt: nowIso() }
            : note,
        ),
      )
    } else {
      onChange([emptyNote(head || 'Senza titolo', body), ...notes])
    }
    reset()
  }

  function startEdit(note: Note) {
    setEditing(note.id)
    setTitle(note.title)
    setText(note.text)
  }

  return (
    <article className="panel">
      <header className="panel-head">
        <h2>Appunti</h2>
        <span className="muted small">
          {notes.length === 0
            ? 'ancora niente'
            : `${notes.length} ${plural(notes.length, 'appunto', 'appunti')}`}
        </span>
      </header>

      <div className="note-form">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titolo — riunione con il comune"
          aria-label="Titolo dell'appunto"
        />
        <textarea
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Cosa si è detto, cosa resta da fare…"
          aria-label="Testo dell'appunto"
        />
        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={!title.trim() && !text.trim()}
          >
            {editing ? 'Salva modifiche' : 'Aggiungi appunto'}
          </button>
          {editing ? (
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Annulla
            </button>
          ) : null}
        </div>
      </div>

      {sorted.length > 0 ? (
        <ul className="note-list">
          {sorted.map((note) => (
            <li key={note.id} className="note-card">
              <header className="note-head">
                <h3>{note.title}</h3>
                <span className="muted small">{dayLabel(note.createdAt.slice(0, 10))}</span>
              </header>
              {note.text ? <p className="note-text">{note.text}</p> : null}
              <div className="note-actions">
                <button type="button" className="link" onClick={() => startEdit(note)}>
                  Modifica
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    if (editing === note.id) reset()
                    onChange(notes.filter((item) => item.id !== note.id))
                  }}
                >
                  Elimina
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">
          Riunioni, telefonate, idee da non perdere: scrivile qui, restano insieme alla festa.
        </p>
      )}
    </article>
  )
}

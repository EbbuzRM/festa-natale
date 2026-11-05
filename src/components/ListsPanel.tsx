import { useState, type FormEvent } from 'react'
import type { PartyList } from '../lib/types'
import { emptyListItem } from '../lib/types'
import { plural } from '../lib/format'
import { IconClose, IconPlus } from './icons'

function isLink(text: string): boolean {
  return /^https?:\/\//i.test(text)
}

/** Le liste si creano dalle Impostazioni (solo nomi); qui si riempiono e si spuntano. */
export function ListsPanel({
  lists,
  onChange,
}: {
  lists: PartyList[]
  onChange: (lists: PartyList[]) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  function add(list: PartyList, event: FormEvent) {
    event.preventDefault()
    const label = (drafts[list.id] ?? '').trim()
    if (!label) return
    onChange(
      lists.map((item) =>
        item.id === list.id ? { ...item, items: [...item.items, emptyListItem(label)] } : item,
      ),
    )
    setDrafts((current) => ({ ...current, [list.id]: '' }))
  }

  function toggle(listId: string, itemId: string) {
    onChange(
      lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item,
              ),
            }
          : list,
      ),
    )
  }

  function remove(listId: string, itemId: string) {
    onChange(
      lists.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
          : list,
      ),
    )
  }

  const open = lists.reduce((count, list) => count + list.items.filter((item) => !item.done).length, 0)

  return (
    <article className="panel">
      <header className="panel-head">
        <h2>Liste</h2>
        <span className="muted small">
          {lists.length === 0 ? 'nessuna lista' : `${open} ${plural(open, 'cosa aperta', 'cose aperte')}`}
        </span>
      </header>

      {lists.length === 0 ? (
        <p className="muted small">
          Crea le liste dalle Impostazioni — acquisti, giochi, cose da portare — e qui le riempi.
        </p>
      ) : (
        <div className="list-stack">
          {lists.map((list) => (
            <section key={list.id} className="list-block">
              <header className="list-head">
                <h3>{list.name}</h3>
                <span className="muted small num">
                  {list.items.filter((item) => item.done).length}/{list.items.length}
                </span>
              </header>

              {list.items.length > 0 ? (
                <ul className="todo-list">
                  {list.items.map((item) => (
                    <li key={item.id} className={item.done ? 'is-done' : ''}>
                      <label className="todo-check">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggle(list.id, item.id)}
                          aria-label={`Fatto: ${item.text}`}
                        />
                        {isLink(item.text) ? (
                          <a
                            className="todo-link"
                            href={item.text}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {item.text}
                          </a>
                        ) : (
                          <span>{item.text}</span>
                        )}
                      </label>
                      <button
                        type="button"
                        className="todo-remove"
                        aria-label={`Togli ${item.text}`}
                        onClick={() => remove(list.id, item.id)}
                      >
                        <IconClose size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Ancora niente dentro.</p>
              )}

              <form className="inline-form list-add" onSubmit={(event) => add(list, event)}>
                <input
                  value={drafts[list.id] ?? ''}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [list.id]: event.target.value }))
                  }
                  placeholder="una riga o un link"
                  aria-label={`Aggiungi a ${list.name}`}
                />
                <button
                  type="submit"
                  className="btn btn-ghost btn-add"
                  disabled={!(drafts[list.id] ?? '').trim()}
                >
                  <IconPlus size={14} />
                  Aggiungi
                </button>
              </form>
            </section>
          ))}
        </div>
      )}
    </article>
  )
}

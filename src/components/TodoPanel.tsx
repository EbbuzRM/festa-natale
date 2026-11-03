import { useState } from 'react'
import type { Todo } from '../lib/types'
import { emptyTodo } from '../lib/types'
import { IconClose, IconPlus } from './icons'

/** Lista delle cose da fare, tenuta insieme all'evento (e quindi al backup). */
export function TodoPanel({
  todos,
  onChange,
}: {
  todos: Todo[]
  onChange: (todos: Todo[]) => void
}) {
  const [text, setText] = useState('')
  const pending = todos.filter((todo) => !todo.done).length

  function add() {
    const label = text.trim()
    if (!label) return
    onChange([...todos, emptyTodo(label)])
    setText('')
  }

  function toggle(id: string) {
    onChange(todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)))
  }

  return (
    <article className="panel">
      <header className="panel-head">
        <h2>Cose da fare</h2>
        <span className="muted small">
          {todos.length === 0 ? 'lista vuota' : pending === 0 ? 'tutto fatto' : `${pending} aperte`}
        </span>
      </header>

      {todos.length > 0 ? (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.done ? 'is-done' : ''}>
              <label className="todo-check">
                <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
                <span>{todo.text}</span>
              </label>
              <button
                type="button"
                className="todo-remove"
                aria-label={`Togli ${todo.text}`}
                onClick={() => onChange(todos.filter((item) => item.id !== todo.id))}
              >
                <IconClose size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">
          Annota qui quello che non va dimenticato: «chiamare il forno», «chiedere il permesso per il
          palco».
        </p>
      )}

      <div className="inline-form">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') add()
          }}
          placeholder="chiamare il forno"
          aria-label="Nuova cosa da fare"
        />
        <button type="button" className="btn btn-ghost btn-add" onClick={add} disabled={!text.trim()}>
          <IconPlus size={14} />
          Aggiungi
        </button>
      </div>
    </article>
  )
}

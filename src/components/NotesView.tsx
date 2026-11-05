import { useStore } from '../lib/store'
import { plural } from '../lib/format'
import { NotesPanel } from './NotesPanel'

/** Sezione Appunti: riunioni, telefonate e idee tenute insieme all'evento. */
export function NotesView() {
  const { data, saveSettings } = useStore()
  const { notes } = data.settings

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h1>Appunti</h1>
          <p className="head-meta">
            {notes.length === 0
              ? 'riunioni, telefonate, idee da non perdere'
              : `${notes.length} ${plural(notes.length, 'appunto', 'appunti')}`}
          </p>
        </div>
      </div>

      <NotesPanel
        notes={notes}
        onChange={(next) => void saveSettings({ ...data.settings, notes: next })}
      />
    </section>
  )
}

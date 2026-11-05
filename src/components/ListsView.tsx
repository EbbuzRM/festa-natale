import { useStore } from '../lib/store'
import { plural } from '../lib/format'
import { ListsPanel } from './ListsPanel'

/** Sezione Liste: qui si riempiono le liste create dalle Impostazioni. */
export function ListsView() {
  const { data, saveSettings } = useStore()
  const { lists } = data.settings
  const open = lists.reduce((count, list) => count + list.items.filter((item) => !item.done).length, 0)

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h1>Liste</h1>
          <p className="head-meta">
            {lists.length === 0
              ? 'nessuna lista: i nomi si creano dalle Impostazioni'
              : `${lists.length} ${plural(lists.length, 'lista', 'liste')} · ${open} ${plural(open, 'cosa aperta', 'cose aperte')}`}
          </p>
        </div>
      </div>

      <ListsPanel
        lists={lists}
        onChange={(next) => void saveSettings({ ...data.settings, lists: next })}
      />
    </section>
  )
}

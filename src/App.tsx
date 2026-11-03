import { useState, type ComponentType } from 'react'
import { Dashboard } from './components/Dashboard'
import { ContactsView } from './components/ContactsView'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { ContactEditor } from './components/ContactEditor'
import { LoginScreen } from './components/LoginScreen'
import { IconBook, IconCalendar, IconLedger, IconPlus, IconSliders } from './components/icons'
import { useStore } from './lib/store'
import type { Contact } from './lib/types'

type View = 'dashboard' | 'contatti' | 'calendario' | 'impostazioni'

const NAV: { view: View; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { view: 'dashboard', label: 'Regia', Icon: IconLedger },
  { view: 'contatti', label: 'Contatti', Icon: IconBook },
  { view: 'calendario', label: 'Calendario', Icon: IconCalendar },
  { view: 'impostazioni', label: 'Impostazioni', Icon: IconSliders },
]

export default function App() {
  const { data, loading, mode, syncError, authRequired, saveContact, removeContact } = useStore()
  const [view, setView] = useState<View>('dashboard')
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined)
  const [daysFocus, setDaysFocus] = useState<'days' | null>(null)

  const openNew = () => setEditing(null)
  const openContact = (contact: Contact) => setEditing(contact)
  const closeEditor = () => setEditing(undefined)

  if (authRequired) return <LoginScreen />

  const eventName = data.settings.eventName || 'Festa di Natale'
  const counts = `${data.contacts.length} contatti · ${data.settings.eventDays.length} giorni`

  return (
    <div className="app">
      <aside className="rail">
        <div className="rail-brand">
          <p className="wordmark">{eventName}</p>
          <p className="wordmark-sub">{counts}</p>
        </div>

        <nav className="rail-nav" aria-label="Sezioni">
          {NAV.map((item) => (
            <button
              key={item.view}
              type="button"
              className={`nav-item${view === item.view ? ' is-active' : ''}`}
              onClick={() => setView(item.view)}
              aria-current={view === item.view ? 'page' : undefined}
            >
              <item.Icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="rail-cta" onClick={openNew}>
          <IconPlus size={16} />
          Nuovo contatto
        </button>

        <p className={`rail-status ${mode === 'cloud' ? 'is-cloud' : 'is-local'}`}>
          <span className="dot-status" aria-hidden="true" />
          {mode === 'cloud' ? 'salvato sul database' : 'solo su questo dispositivo'}
        </p>
      </aside>

      <header className="topbar">
        <div className="topbar-brand">
          <p className="topbar-section">{NAV.find((item) => item.view === view)?.label}</p>
        </div>
        <div className="topbar-actions">
          <span className={`pill ${mode === 'cloud' ? 'pill-ok' : 'pill-off'}`}>
            {mode === 'cloud' ? 'cloud' : 'locale'}
          </span>
          <button
            type="button"
            className="icon-btn only-mobile"
            onClick={openNew}
            aria-label="Nuovo contatto"
          >
            <IconPlus size={18} />
          </button>
        </div>
      </header>

      <main className="main">
        {syncError ? (
          <div className="banner banner-error app-banner">
            <p>{syncError}</p>
          </div>
        ) : null}
        {loading ? (
          <p className="muted loading-line">Carico i contatti…</p>
        ) : view === 'dashboard' ? (
          <Dashboard
            onNavigate={(target) => {
              setDaysFocus(null)
              setView(target)
            }}
            onCreate={openNew}
          />
        ) : view === 'contatti' ? (
          <ContactsView onOpenContact={openContact} onCreate={openNew} />
        ) : view === 'calendario' ? (
          <CalendarView
            onOpenContact={openContact}
            onEditDays={() => {
              setDaysFocus('days')
              setView('impostazioni')
            }}
          />
        ) : (
          <SettingsView focus={daysFocus} />
        )}
      </main>

      <nav className="tabbar" aria-label="Sezioni">
        {NAV.map((item) => (
          <button
            key={item.view}
            type="button"
            className={`tab${view === item.view ? ' is-active' : ''}`}
            onClick={() => setView(item.view)}
            aria-current={view === item.view ? 'page' : undefined}
          >
            <item.Icon size={19} />
            {item.label}
          </button>
        ))}
      </nav>

      <ContactEditor
        open={editing !== undefined}
        contact={editing ?? null}
        onClose={closeEditor}
        onSave={saveContact}
        onDelete={removeContact}
      />
    </div>
  )
}

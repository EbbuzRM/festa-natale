import { useMemo } from 'react'
import { useStore } from '../lib/store'
import {
  clippedPercent,
  duplicatedContactIds,
  scheduledCost,
  summarize,
  unscheduledContacts,
  visibleAssignments,
} from '../lib/budget'
import { CATEGORIES, CATEGORY_HINTS, CATEGORY_LABELS, STATUS_LABELS, STATUSES } from '../lib/types'
import { entertainmentStats } from '../lib/entertainment'
import { dayLabel, daysBetween, formatAmount, money, plural, relativeLabel, todayIso } from '../lib/format'
import { EntertainmentPanel } from './Entertainment'
import { IconPlus } from './icons'
import { TodoPanel } from './TodoPanel'
import { Banner, EmptyState } from './ui'

interface Props {
  onNavigate: (view: 'contatti' | 'calendario' | 'impostazioni') => void
  onCreate: () => void
}

export function Dashboard({ onNavigate, onCreate }: Props) {
  const { data, saveSettings } = useStore()
  const { contacts, assignments, settings } = data

  const summary = useMemo(() => summarize(contacts, settings.budgetTotal), [contacts, settings.budgetTotal])
  const nextDay = useMemo(() => {
    const today = todayIso()
    const future = settings.eventDays.filter((day) => day >= today).sort()
    return future[0] ?? [...settings.eventDays].sort()[0] ?? null
  }, [settings.eventDays])
  // quello che si vede fuori dalla rubrica: gli scartati restano solo nei Contatti
  const visible = useMemo(() => visibleAssignments(assignments, contacts), [assignments, contacts])
  const missing = useMemo(() => unscheduledContacts(contacts, visible), [contacts, visible])
  const duplicates = useMemo(() => duplicatedContactIds(visible), [visible])
  const planned = useMemo(() => scheduledCost(visible, contacts), [visible, contacts])
  const entertainment = useMemo(
    () => entertainmentStats(visible, contacts, settings),
    [visible, contacts, settings],
  )

  const confirmedWidth = clippedPercent(summary.usedPercent)
  const estimateWidth = clippedPercent(
    summary.totalBudget > 0 ? (summary.estimatedCost / summary.totalBudget) * 100 : 0,
  )

  const gaps: string[] = []
  if (missing.length > 0) gaps.push(`${missing.length} confermati senza un giorno in calendario`)
  if (summary.confirmedWithoutPrice > 0)
    gaps.push(`${summary.confirmedWithoutPrice} confermati senza prezzo`)
  if (duplicates.length > 0) gaps.push(`${duplicates.length} contatti messi in più giorni`)

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h1>{settings.eventName || 'Festa di Natale'}</h1>
          <p className="head-meta">
            {settings.eventDays.length} giorni
            {nextDay ? ` · prossimo ${dayLabel(nextDay)}, ${relativeLabel(nextDay)}` : ''}
          </p>
        </div>
        <button type="button" className="btn btn-primary only-desktop" onClick={onCreate}>
          <IconPlus size={16} />
          Nuovo contatto
        </button>
      </div>

      {settings.budgetTotal === 0 ? (
        <Banner tone="info">
          Imposta il budget disponibile per far quadrare i conti: anche solo «3.000 € dal comune».
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate('impostazioni')}>
            Vai alle impostazioni
          </button>
        </Banner>
      ) : null}

      <div className="hero-grid">
        <article className="panel">
          <header className="panel-head">
            <h2>Conto della festa</h2>
            <label className="inline-money">
              <span>budget</span>
              <input
                type="text"
                inputMode="decimal"
                key={settings.budgetTotal}
                defaultValue={formatAmount(settings.budgetTotal)}
                onBlur={(event) => {
                  const value = Number(event.target.value.replace(/[^\d,.-]/g, '').replace(',', '.'))
                  const next = Number.isFinite(value) ? value : 0
                  if (next !== settings.budgetTotal) void saveSettings({ ...settings, budgetTotal: next })
                }}
                placeholder="3.000"
                aria-label="Budget disponibile in euro"
              />
            </label>
          </header>

          <dl className="ledger">
            <div className="ledger-row">
              <dt>Disponibile</dt>
              <span className="leader" aria-hidden="true" />
              <dd>{money(summary.totalBudget)}</dd>
            </div>
            <div className="ledger-row">
              <dt>
                Impegnati
                {summary.confirmedCount > 0
                  ? `, ${summary.confirmedCount} ${plural(summary.confirmedCount, 'confermato', 'confermati')}`
                  : ''}
              </dt>
              <span className="leader" aria-hidden="true" />
              <dd>{money(summary.confirmedCost)}</dd>
            </div>
            <div className="ledger-row">
              <dt>Previsione, contattati compresi</dt>
              <span className="leader" aria-hidden="true" />
              <dd>{money(summary.estimatedCost)}</dd>
            </div>
            <div className="ledger-row is-total">
              <dt>Restano</dt>
              <span className="leader" aria-hidden="true" />
              <dd className={summary.remaining < 0 ? 'neg' : ''}>{money(summary.remaining)}</dd>
            </div>
          </dl>

          <div>
            <div className="meter" role="img" aria-label={`Budget usato al ${summary.usedPercent}%`}>
              <div className="meter-used" style={{ width: `${confirmedWidth}%` }} />
              <div
                className="meter-forecast"
                style={{ width: `${Math.max(0, estimateWidth - confirmedWidth)}%` }}
              />
            </div>
            <ul className="legend" style={{ marginTop: '0.65rem' }}>
              <li>
                <span className="dot dot-confirmed" aria-hidden="true" />
                {summary.confirmedCount} {plural(summary.confirmedCount, 'confermato', 'confermati')},{' '}
                {summary.usedPercent}% del budget
              </li>
              <li>
                <span className="dot dot-estimate" aria-hidden="true" />
                previsione {money(summary.estimatedCost)}
              </li>
              <li>
                <span className="dot dot-planned" aria-hidden="true" />
                in calendario {money(planned)}
              </li>
            </ul>
          </div>

          {summary.overBudget ? (
            <Banner tone="error">
              Sei sopra il budget di {money(summary.confirmedCost - summary.totalBudget)}. Serve tagliare o
              trovare altri soldi.
            </Banner>
          ) : null}
          {!summary.overBudget && summary.remainingAfterEstimates < 0 ? (
            <Banner tone="warn">
              Se chiudi anche i contattati vai fuori di {money(Math.abs(summary.remainingAfterEstimates))}.
            </Banner>
          ) : null}
        </article>

        <article className="panel">
          <header className="panel-head">
            <h2>Chi serve</h2>
            <button type="button" className="link" onClick={() => onNavigate('calendario')}>
              Calendario
            </button>
          </header>
          <div className="serve-list">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className="serve-row"
                onClick={() => onNavigate('contatti')}
              >
                <span className="serve-count">{summary.byCategory[category].total}</span>
                <span className="serve-name">{CATEGORY_LABELS[category]}</span>
                <span className="serve-meta">
                  {summary.byCategory[category].confirmed}{' '}
                  {plural(summary.byCategory[category].confirmed, 'confermato', 'confermati')} ·{' '}
                  {CATEGORY_HINTS[category]}
                </span>
              </button>
            ))}
          </div>

          <div className="count-grid">
            {STATUSES.map((status) => (
              <div key={status} className={`count-cell status-${status}`}>
                <span className="count-value">{summary.counts[status]}</span>
                <span className="count-label">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="hero-grid">
        <EntertainmentPanel stats={entertainment} onNavigate={() => onNavigate('calendario')} />
        <TodoPanel
          todos={settings.todos}
          onChange={(todos) => void saveSettings({ ...settings, todos })}
        />
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="Si parte dalla rubrica"
          hint="Il primo passo è buttare dentro i contatti che avete già: nome, telefono e chi ve l'ha passato. Il resto lo si riempie chiamando."
          action={
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              Inserisci il primo contatto
            </button>
          }
        />
      ) : (
        <article className="panel">
          <header className="panel-head">
            <h2>Cose da sistemare</h2>
            <span className="muted small">
              {gaps.length === 0 ? 'Tutto in ordine' : `${gaps.length} ${plural(gaps.length, 'punto', 'punti')}`}
            </span>
          </header>
          {gaps.length === 0 ? (
            <p className="muted">
              Niente da segnalare: i confermati hanno un giorno e un prezzo.
            </p>
          ) : (
            <ul className="gaps">
              {missing.length > 0 ? (
                <li>
                  <strong>{missing.length}</strong>{' '}
                  {plural(missing.length, 'confermato senza', 'confermati senza')} un giorno in calendario
                  <button type="button" className="link" onClick={() => onNavigate('calendario')}>
                    sistema
                  </button>
                </li>
              ) : null}
              {summary.confirmedWithoutPrice > 0 ? (
                <li>
                  <strong>{summary.confirmedWithoutPrice}</strong>{' '}
                  {plural(
                    summary.confirmedWithoutPrice,
                    'confermato senza prezzo: il budget resta una stima',
                    'confermati senza prezzo: il budget resta una stima',
                  )}
                  <button type="button" className="link" onClick={() => onNavigate('contatti')}>
                    controlla
                  </button>
                </li>
              ) : null}
              {duplicates.length > 0 ? (
                <li>
                  <strong>{duplicates.length}</strong>{' '}
                  {plural(
                    duplicates.length,
                    'contatto messo in più di un giorno',
                    'contatti messi in più di un giorno',
                  )}
                  <button type="button" className="link" onClick={() => onNavigate('calendario')}>
                    vedi
                  </button>
                </li>
              ) : null}
            </ul>
          )}
        </article>
      )}

      {nextDay ? (
        <p className="next-line">
          Mancano {Math.max(0, daysBetween(todayIso(), nextDay))} giorni a {dayLabel(nextDay)}.
        </p>
      ) : null}
    </section>
  )
}

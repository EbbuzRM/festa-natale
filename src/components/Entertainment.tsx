import type { EntertainmentStats } from '../lib/entertainment'

/** Il conto degli slot di intrattenimento: quanti sono pieni e dove. */
export function EntertainmentPanel({
  stats,
  onNavigate,
}: {
  stats: EntertainmentStats
  onNavigate: () => void
}) {
  const state =
    stats.target === 0
      ? 'Imposta quanti slot servono'
      : stats.complete
        ? 'Slot tutti riempiti'
        : `Mancano ${stats.remaining} slot`

  return (
    <article className="panel">
      <header className="panel-head">
        <h2>Intrattenimento</h2>
        <button type="button" className="link" onClick={onNavigate}>
          Calendario
        </button>
      </header>

      <div className="ent-head">
        <p className="ent-count num">
          <strong>{stats.filled}</strong> su {stats.target}
        </p>
        <p className="muted small">{state}</p>
      </div>

      <div
        className="meter"
        role="img"
        aria-label={`Intrattenimento: ${stats.filled} slot riempiti su ${stats.target}`}
      >
        <div className="meter-used" style={{ width: `${stats.percent}%` }} />
      </div>

      {stats.byVenue.length > 0 || stats.withoutVenue > 0 ? (
        <dl className="venue-list">
          {stats.byVenue.map((item) => (
            <div key={item.venue} className="venue-row">
              <dt>{item.venue}</dt>
              <span className="leader" aria-hidden="true" />
              <dd className="num">{item.filled}</dd>
            </div>
          ))}
          {stats.withoutVenue > 0 ? (
            <div className="venue-row">
              <dt>Postazione da decidere</dt>
              <span className="leader" aria-hidden="true" />
              <dd className="num">{stats.withoutVenue}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <p className="muted small">
        Conta ogni artista messo in calendario, scartati esclusi. La postazione si sceglie quando lo
        aggiungi.
      </p>
    </article>
  )
}

/** Versione stretta per la testata del calendario. */
export function EntertainmentCount({ stats }: { stats: EntertainmentStats }) {
  const used = stats.byVenue.filter((item) => item.filled > 0)

  return (
    <div className="ent-strip">
      <p className="ent-strip-count">
        Intrattenimento <strong className="num">{stats.filled}</strong> su {stats.target}
        <span className="muted">
          {' · '}
          {stats.complete ? 'tutti riempiti' : `mancano ${stats.remaining}`}
        </span>
      </p>
      <div
        className="meter"
        role="img"
        aria-label={`Intrattenimento: ${stats.filled} slot riempiti su ${stats.target}`}
      >
        <div className="meter-used" style={{ width: `${stats.percent}%` }} />
      </div>
      {used.length > 0 || stats.withoutVenue > 0 ? (
        <p className="muted small">
          {used.map((item) => `${item.venue} ${item.filled}`).join(' · ')}
          {used.length > 0 && stats.withoutVenue > 0 ? ' · ' : ''}
          {stats.withoutVenue > 0 ? `senza postazione ${stats.withoutVenue}` : ''}
        </p>
      ) : null}
    </div>
  )
}

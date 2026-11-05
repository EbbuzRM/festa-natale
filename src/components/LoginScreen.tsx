import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { Field } from './ui'

export function LoginScreen() {
  const { login, dbConfig, sessionNotice } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Accesso non riuscito.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <p className="wordmark">Festa di Natale</p>
        <h1>Entra</h1>
        <p className="muted small">
          I dati stanno sul database condiviso. Serve l’account creato in Supabase, in
          <em> Authentication → Users</em>: così da questo browser si vede la stessa festa.
        </p>

        {sessionNotice ? (
          <p className="form-note" role="status">
            {sessionNotice}
          </p>
        ) : null}

        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="nome@esempio.it"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={busy || !email.trim() || !password}>
          {busy ? 'Entro…' : 'Entra'}
        </button>

        {dbConfig ? <p className="muted small">{dbConfig.url.replace(/^https?:\/\//, '')}</p> : null}
      </form>
    </div>
  )
}

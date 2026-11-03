import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

export function Sheet({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button[data-autofocus]',
    )
    focusable?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  // Nel body: dentro una vista con animazione (transform) un figlio fixed si
  // aggancia alla sezione invece che allo schermo, e la scheda finisce fuori posto.
  return createPortal(
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sheet-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p className="sheet-sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Chiudi">
            <IconClose size={16} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <footer className="sheet-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

export function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
  count?: number
}) {
  return (
    <button type="button" className={`chip${active ? ' is-active' : ''}`} onClick={onClick}>
      {children}
      {count !== undefined ? <span className="chip-count num">{count}</span> : null}
    </button>
  )
}

export function Stamp({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`stamp stamp-${tone}`}>{children}</span>
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{hint}</p>
      {action}
    </div>
  )
}

export function Banner({
  tone = 'warn',
  children,
  action,
}: {
  tone?: 'warn' | 'info' | 'error'
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={`banner banner-${tone}`}>
      <p>{children}</p>
      {action}
    </div>
  )
}

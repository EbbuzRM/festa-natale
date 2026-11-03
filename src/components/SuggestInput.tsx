import { useEffect, useId, useMemo, useRef, useState } from 'react'

/**
 * Campo con suggerimenti al posto del datalist nativo, che ha l'aspetto del browser
 * e non si può vestire. La lista resta nel flusso del foglio, così non viene tagliata
 * dai bordi della scheda su telefono.
 */
export function SuggestInput({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.toLowerCase().includes(needle))
  }, [options, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="combo" ref={wrapRef}>
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => {
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((index) => Math.min(index + 1, matches.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          } else if (event.key === 'Enter') {
            if (open && matches[active]) {
              event.preventDefault()
              choose(matches[active])
            }
          } else if (event.key === 'Escape' && open) {
            event.stopPropagation()
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
      />
      {open && matches.length > 0 ? (
        <ul className="combo-list" id={listId} role="listbox" aria-label="Suggerimenti">
          {matches.map((option, index) => (
            <li key={option} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`combo-option${index === active ? ' is-active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

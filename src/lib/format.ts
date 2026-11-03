const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
]

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    // senza useGrouping alcune versioni di ICU perdono il separatore delle migliaia
    useGrouping: true,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

/** Tollera "3.000", "1.200,50", "1,200.50" e le virgole di troppo. */
export function parseMoney(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null

  let cleaned = raw.replace(/[^\d,.-]/g, '').trim()
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.'
    const thousand = decimal === ',' ? '.' : ','
    cleaned = cleaned.split(thousand).join('')
    cleaned = cleaned.replace(decimal, '.')
  } else if (lastComma >= 0) {
    cleaned = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.split(',').join('')
  } else if (lastDot >= 0) {
    const dots = cleaned.split('.').length - 1
    const looksLikeThousands = dots > 1 || /\.\d{3}$/.test(cleaned)
    if (looksLikeThousands) cleaned = cleaned.split('.').join('')
  }

  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** Interpreta "2026-12-06" come mezzanotte locale, non UTC. */
export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return new Date(iso)
  return new Date(year, month - 1, day)
}

export function toIsoDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayIso(): string {
  return toIsoDay(new Date())
}

/** Importo senza simbolo, con separatore delle migliaia: 3000 -> "3.000". */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2, useGrouping: true }).format(value)
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

export function weekdayLabel(iso: string): string {
  return WEEKDAYS[parseDay(iso).getDay()]
}

export function dayLabel(iso: string): string {
  const date = parseDay(iso)
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`
}

export function dayLabelShort(iso: string): string {
  const date = parseDay(iso)
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()}`
}

export function dayNumber(iso: string): string {
  return `${parseDay(iso).getDate()}`
}

export function monthLabel(iso: string): string {
  const date = parseDay(iso)
  return MONTHS[date.getMonth()]
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseDay(fromIso)
  const to = parseDay(toIso)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/** Primi weekend di dicembre + dal 23 al 28, come raccontato da lei. */
export function defaultEventDays(year: number): string[] {
  const days: string[] = []
  for (const day of [5, 6, 7, 12, 13, 14, 19, 20, 21, 23, 24, 26, 27, 28]) {
    days.push(`${year}-12-${`${day}`.padStart(2, '0')}`)
  }
  return days
}

export function sortDays(days: string[]): string[] {
  return [...days].sort()
}

/** Tutti i giorni da `fromIso` a `toIso`, estremi compresi. Vuoto se le date sono invertite. */
export function daysInRange(fromIso: string, toIso: string): string[] {
  if (!fromIso || !toIso) return []
  const span = daysBetween(fromIso, toIso)
  if (span < 0) return []
  const start = parseDay(fromIso)
  const days: string[] = []
  for (let offset = 0; offset <= span; offset += 1) {
    days.push(toIsoDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)))
  }
  return days
}

/** Un periodo di giorni consecutivi. */
export interface DayRun {
  start: string
  end: string
  count: number
  days: string[]
}

/** Raggruppa i giorni consecutivi: 5,6,7,12 -> due periodi. */
export function groupDayRuns(days: string[]): DayRun[] {
  const runs: DayRun[] = []
  for (const day of sortDays([...new Set(days)])) {
    const last = runs[runs.length - 1]
    if (last && daysBetween(last.end, day) === 1) {
      last.end = day
      last.count += 1
      last.days.push(day)
      continue
    }
    runs.push({ start: day, end: day, count: 1, days: [day] })
  }
  return runs
}

/** "5–7 dicembre 2026", "30 nov – 2 dic 2026", "3 dicembre 2026". */
export function dayRunLabel(run: DayRun): string {
  const from = parseDay(run.start)
  const to = parseDay(run.end)
  const year = from.getFullYear()
  if (run.count === 1) return `${from.getDate()} ${MONTHS[from.getMonth()]} ${year}`
  if (year !== to.getFullYear()) {
    const head = `${from.getDate()} ${MONTHS[from.getMonth()].slice(0, 3)} ${year}`
    return `${head} – ${to.getDate()} ${MONTHS[to.getMonth()].slice(0, 3)} ${to.getFullYear()}`
  }
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]} ${year}`
  }
  return `${from.getDate()} ${MONTHS[from.getMonth()].slice(0, 3)} – ${to.getDate()} ${MONTHS[to.getMonth()].slice(0, 3)} ${year}`
}

export function relativeLabel(iso: string): string {
  const diff = daysBetween(todayIso(), iso)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'domani'
  if (diff === -1) return 'ieri'
  if (diff > 1) return `tra ${diff} giorni`
  return `${Math.abs(diff)} giorni fa`
}

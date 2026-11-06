const API_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Midnight, local time. `new Date('Y-m-d')` would read the string as UTC. */
export function parseApiDate(date: string): Date {
  const match = API_DATE.exec(date)

  if (!match) {
    throw new RangeError(`Invalid API date: ${date}`)
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const dateFormat = new Intl.DateTimeFormat('fr-FR')

export function formatDate(date: string): string {
  return dateFormat.format(parseApiDate(date))
}

const shortDateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })

export function formatShortDate(date: string): string {
  return shortDateFormat.format(parseApiDate(date))
}

/** Today as Y-m-d, local time. `toISOString()` would give the UTC day. */
export function todayApiDate(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function utcDay(date: string): number {
  const local = parseApiDate(date)

  return Date.UTC(local.getFullYear(), local.getMonth(), local.getDate())
}

/** Calendar days from `from` to `to`, unaffected by daylight saving changes. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / 86_400_000)
}

/** Completed months between two dates. */
export function ageInMonths(birthDate: string, on: string): number {
  const birth = parseApiDate(birthDate)
  const date = parseApiDate(on)
  const months = (date.getFullYear() - birth.getFullYear()) * 12 + date.getMonth() - birth.getMonth()

  return date.getDate() < birth.getDate() ? months - 1 : months
}

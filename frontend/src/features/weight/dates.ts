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

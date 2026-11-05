const DEFAULT_TARGET = '/'

/**
 * Keeps only a path of this application. Parsing it the way a browser does also
 * catches what looks like a path but leaves the origin, such as "/\evil.example"
 * or a tab inserted between the two slashes.
 */
export function safeRedirectTarget(from: unknown): string {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return DEFAULT_TARGET
  }

  try {
    const { origin } = window.location

    return new URL(from, origin).origin === origin ? from : DEFAULT_TARGET
  } catch {
    return DEFAULT_TARGET
  }
}

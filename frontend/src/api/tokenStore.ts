// The access token lives in this module only: never in localStorage,
// sessionStorage or IndexedDB, and never logged.
let accessToken: string | null = null

// Changes when a session starts or ends, but not when its token is renewed: an
// operation started under an older session must not touch the current one.
let sessionGeneration = 0

export function getAccessToken(): string | null {
  return accessToken
}

export function getSessionGeneration(): number {
  return sessionGeneration
}

export function startSession(token: string): void {
  sessionGeneration += 1
  accessToken = token
}

export function renewAccessToken(token: string): void {
  accessToken = token
}

export function endSession(): void {
  sessionGeneration += 1
  accessToken = null
}

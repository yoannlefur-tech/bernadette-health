const LOGOUT_MESSAGE = 'logout'

// A single instance: a BroadcastChannel does not receive its own messages, so
// the tab that logs out is not notified of its own logout.
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('auth-session')

export function broadcastLogout(): void {
  channel?.postMessage(LOGOUT_MESSAGE)
}

export function onLogoutBroadcast(listener: () => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data === LOGOUT_MESSAGE) {
      listener()
    }
  }

  channel?.addEventListener('message', handleMessage)

  return () => {
    channel?.removeEventListener('message', handleMessage)
  }
}

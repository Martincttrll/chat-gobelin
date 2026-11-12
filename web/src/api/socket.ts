import { useUserStore } from '@/stores/user'
import { API_URL, NAMESPACE } from './client'

export interface SocketEvent {
  operation?: string
  [key: string]: unknown
}

const RECONNECT_DELAY = 2000 // ms

// Écoute les événements des channels. Renvoie la fonction qui ferme la connexion.
// onOpen est rappelé à chaque (re)connexion : de quoi recharger ce qu'on a pu manquer pendant la coupure.
export function listenChannels(
  channelIds: number[],
  onEvent: (event: SocketEvent) => void,
  onOpen?: () => void,
): () => void {
  const userStore = useUserStore()
  let socket: WebSocket | undefined
  let stopped = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  function connect() {
    const url = new URL('/channel/socket', API_URL.replace(/^http/, 'ws'))
    channelIds.forEach((id) => url.searchParams.append('channel', String(id)))
    // Le navigateur ne permet pas d'envoyer un header Authorization avec un WebSocket.
    url.searchParams.set('authorization', userStore.token ?? '')
    url.searchParams.set('namespace', NAMESPACE)

    socket = new WebSocket(url)
    socket.onopen = () => onOpen?.()
    socket.onmessage = ({ data }) => {
      // Le back regroupe parfois plusieurs événements dans une même trame, séparés par \n.
      for (const line of String(data).split('\n')) {
        if (!line.trim()) continue
        try {
          onEvent(JSON.parse(line))
        } catch {
          console.warn('[socket] événement illisible', line)
        }
      }
    }
    socket.onclose = () => {
      if (!stopped) retryTimer = setTimeout(connect, RECONNECT_DELAY)
    }
  }

  connect()

  return () => {
    stopped = true
    clearTimeout(retryTimer)
    socket?.close()
  }
}

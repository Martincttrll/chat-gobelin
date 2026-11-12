import { onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { editMessage, sendMessage } from '@/api/messages'
import { getConnectedUsers } from '@/api/channels'
import type { Message, MessageMetadata, Presence } from '@/types/api'
import type { Point } from './physics'
import type { World } from './world'

// Contournement : le back ne relaie pas encore les événements des clients sur le WebSocket.
// Chaque joueur a donc un message caché (toShow: false), posté dans le channel technique ws-checkup,
// qu'il modifie quand il bouge ; les autres reçoivent la modification par message.edited.
// messages : ceux de ws-checkup, qui mélangent la présence de tous les channels de jeu.

// Valeurs provisoires.
const SEND_INTERVAL = 200 // ms entre deux envois de position (au plus)
const MIN_MOVE = 0.002 // déplacement minimal (map 0–1) pour renvoyer la position
const HEARTBEAT = 10_000 // ms : renvoi même immobile, pour prouver qu'on est toujours là
const STALE = 25_000 // ms sans nouvelle d'un joueur : on le retire
const CONNECTED_POLL = 3000 // ms : le back n'envoie pas d'événement quand quelqu'un se déconnecte

export function usePresence(world: World, channelId: number, messages: () => Message[]) {
  const userStore = useUserStore()
  const myId = userStore.me!.id
  const systemId = userStore.systemChannel?.id

  let presenceId: number | undefined
  let sending = false
  let lastSent: (Point & { time: number }) | null = null
  let connected = new Set<number>()
  // Dernière présence reçue de chaque joueur, et l'heure locale de réception.
  const updates = new Map<number, { presence: Presence; time: number }>()
  let sendTimer: ReturnType<typeof setInterval>
  let pollTimer: ReturnType<typeof setInterval>

  function metadata(left?: boolean): MessageMetadata {
    const { me } = world
    return {
      mood: 'neutral',
      typingSpeed: 0,
      pauses: [],
      toShow: false,
      presence: {
        channelId,
        userId: myId,
        name: me.name,
        avatar: me.avatar,
        x: me.x,
        y: me.y,
        left,
      },
    }
  }

  async function sendPosition() {
    if (sending || presenceId === undefined) return
    const { x, y } = world.me
    const now = Date.now()
    const moved = !lastSent || Math.hypot(x - lastSent.x, y - lastSent.y) >= MIN_MOVE
    if (!moved && now - lastSent!.time < HEARTBEAT) return

    sending = true
    lastSent = { x, y, time: now }
    try {
      await editMessage(presenceId, '', metadata())
    } catch {
      lastSent = null
    } finally {
      sending = false
    }
  }

  function presenceIn(message: Message): Presence | undefined {
    const presence = message.metadata?.presence
    return presence?.channelId === channelId ? presence : undefined
  }

  // Un seul message de présence par joueur et par channel de jeu : on réutilise le sien s'il est chargé.
  async function announce() {
    if (systemId === undefined) return
    const mine = [...messages()].reverse().find((m) => presenceIn(m)?.userId === myId)
    if (mine) {
      presenceId = mine.id
      await sendPosition()
    } else {
      presenceId = (await sendMessage(systemId, '.', metadata())).id
    }
  }

  function syncPlayers() {
    const now = Date.now()
    for (const message of messages()) {
      const presence = presenceIn(message)
      if (!presence || presence.userId === myId) continue
      if (updates.get(presence.userId)?.presence !== presence) {
        updates.set(presence.userId, { presence, time: now })
      }
    }

    const active = new Set<string>()
    for (const [userId, { presence, time }] of updates) {
      if (presence.left || !connected.has(userId) || now - time > STALE) continue

      const id = `user-${userId}`
      active.add(id)
      const player = world.players.find((p) => p.id === id)
      if (player) {
        player.target = { x: presence.x, y: presence.y }
      } else {
        world.players.push({
          id,
          name: presence.name,
          avatar: presence.avatar,
          x: presence.x,
          y: presence.y,
          target: null,
          remote: true,
        })
      }
    }
    world.players = world.players.filter((p) => !p.remote || active.has(p.id))
  }

  async function pollConnected() {
    try {
      connected = new Set((await getConnectedUsers(channelId)).map((user) => user.id))
      syncPlayers()
    } catch {
      // On garde la liste précédente jusqu'au prochain essai.
    }
  }

  watch(messages, syncPlayers)

  onMounted(() => {
    announce().catch(() => console.warn('[presence] annonce impossible'))
    pollConnected()
    sendTimer = setInterval(sendPosition, SEND_INTERVAL)
    pollTimer = setInterval(pollConnected, CONNECTED_POLL)
  })

  onUnmounted(() => {
    clearInterval(sendTimer)
    clearInterval(pollTimer)
    if (presenceId !== undefined) editMessage(presenceId, '', metadata(true)).catch(() => {})
  })
}

import type { Message } from '@/types/api'

// Au-delà, un joueur qui n'a pas renvoyé sa position (au moins toutes les 10 s) est considéré parti.
export const PRESENCE_STALE = 25_000 // ms

// Channels où quelqu'un d'autre que moi est en train de jouer, d'après les messages de présence de ws-checkup.
export function channelsWithPlayers(presenceMessages: Message[], myId?: number, now = Date.now()) {
  const ids = new Set<number>()
  for (const message of presenceMessages) {
    const presence = message.metadata?.presence
    if (!presence || presence.userId === myId || presence.left || !presence.sentAt) continue
    if (now - presence.sentAt < PRESENCE_STALE) ids.add(presence.channelId)
  }
  return ids
}

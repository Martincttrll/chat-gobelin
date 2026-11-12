import { useUserStore } from '@/stores/user'
import { editMessage, getMessages, sendMessage } from './messages'
import type { Message, MessageMetadata } from '@/types/api'

// Contournement : le back ne donne pas le nombre de membres d'un channel. Chaque channel a donc
// un message caché dans ws-checkup avec la liste de ses membres, retrouvé par le nom du channel
// (on peut le lire avant d'avoir rejoint le channel).
export const MAX_MEMBERS = 10

function rosterMetadata(channel: string, members: number[]): MessageMetadata {
  return { mood: 'neutral', typingSpeed: 0, pauses: [], toShow: false, roster: { channel, members } }
}

function systemChannelId(): number {
  const id = useUserStore().systemChannel?.id
  if (id === undefined) throw new Error('ws-checkup non rejoint')
  return id
}

export async function findRoster(channel: string): Promise<Message | undefined> {
  const messages = await getMessages(systemChannelId())
  return messages.reverse().find((m) => m.metadata?.roster?.channel === channel)
}

export function isFull(roster: Message | undefined, userId: number): boolean {
  const members = roster?.metadata?.roster?.members ?? []
  return !members.includes(userId) && members.length >= MAX_MEMBERS
}

export async function addToRoster(roster: Message, userId: number) {
  const { channel, members } = roster.metadata!.roster!
  if (members.includes(userId)) return
  await editMessage(roster.id, '', rosterMetadata(channel, [...members, userId]))
}

export async function createRoster(channel: string, members: number[]) {
  await sendMessage(systemChannelId(), '.', rosterMetadata(channel, members))
}

// Channel d'avant la liste des membres : on l'estime avec les auteurs de messages et les joueurs
// déjà venus sur la map (ceux qui n'ont rien fait ne sont pas comptés).
export async function estimateMembers(channelId: number): Promise<number[]> {
  const [messages, system] = await Promise.all([
    getMessages(channelId),
    getMessages(systemChannelId()),
  ])
  const ids = new Set(messages.map((m) => m.user_id))
  for (const m of system) {
    const presence = m.metadata?.presence
    if (presence?.channelId === channelId) ids.add(presence.userId)
  }
  return [...ids]
}

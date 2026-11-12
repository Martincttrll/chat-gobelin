import { request } from './client'
import type { Channel, CreateChannelPayload, EnterChannelPayload, User } from '@/types/api'

// Channel technique de l'app : les messages de présence (positions des joueurs) y sont postés,
// pour ne pas remplir les channels de discussion. Caché dans l'app.
export const SYSTEM_CHANNEL = 'ws-checkup'

export function createChannel(name: string): Promise<Channel> {
  const body: CreateChannelPayload = { name, metadata: {} }
  return request<Channel>('POST', '/channel', body)
}

export function enterChannel(name: string): Promise<Channel> {
  const body: EnterChannelPayload = { channel: name }
  return request<Channel>('POST', '/channel/enter', body)
}

// Utilisateurs qui ont un WebSocket ouvert sur le channel (dans le jeu ou sur l'accueil).
export async function getConnectedUsers(channelId: number): Promise<User[]> {
  return (await request<User[] | null>('GET', `/channel/connected?channel=${channelId}`)) ?? []
}

import { NAMESPACE, request } from './client'
import type {
  ApiMessage,
  ApiMessageList,
  CreateMessagePayload,
  EditMessagePayload,
  Message,
  MessageMetadata,
} from '@/types/api'

function toMessage({ metadata, ...message }: ApiMessage): Message {
  // Messages d'autres clients ou du back (horloge) : pas de metadata dans notre namespace.
  const ours = metadata?.[NAMESPACE] as MessageMetadata | undefined
  return { ...message, metadata: ours }
}

// L'API renvoie les 100 derniers messages du plus récent au plus ancien : on remet l'ordre chronologique.
// L'id départage les messages qui ont le même posted_at.
function chronological(a: ApiMessage, b: ApiMessage): number {
  return Date.parse(a.posted_at) - Date.parse(b.posted_at) || a.id - b.id
}

export async function getMessages(channelId: number): Promise<Message[]> {
  const messages = await request<ApiMessageList>('GET', `/channel/message?channel=${channelId}`)
  return (messages ?? []).sort(chronological).map(toMessage)
}

export async function sendMessage(
  channelId: number,
  text: string,
  metadata: MessageMetadata,
): Promise<Message> {
  const body: CreateMessagePayload = { content: text, channel: channelId, metadata }
  return toMessage(await request<ApiMessage>('POST', '/channel/message', body))
}

export async function editMessage(
  id: number,
  text: string,
  metadata?: MessageMetadata,
): Promise<Message> {
  const body: EditMessagePayload = { id, content: text, metadata }
  return toMessage(await request<ApiMessage>('PUT', '/channel/message', body))
}

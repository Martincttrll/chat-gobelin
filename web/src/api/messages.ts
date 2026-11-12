import { NAMESPACE, request } from './client'
import type { SocketEvent } from './socket'
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

export function isVisible(message: Message): boolean {
  return message.metadata?.toShow !== false
}

// Applique un événement du socket à la liste des messages d'un channel (renvoie une nouvelle liste).
export function applyMessageEvent(messages: Message[], event: SocketEvent): Message[] {
  if (event.operation === 'message.created') {
    const created = toMessage(event as unknown as ApiMessage)
    if (messages.some((message) => message.id === created.id)) return messages
    return [...messages, created]
  }
  if (event.operation === 'message.edited') {
    // Le back ne renvoie que id, channel_id, content et metadata : on garde le reste.
    const edited = toMessage(event as unknown as ApiMessage)
    // Message de présence plus ancien que les 100 messages chargés : ses metadata se suffisent.
    if (!isVisible(edited) && !messages.some((message) => message.id === edited.id)) {
      return [...messages, edited]
    }
    return messages.map((message) =>
      message.id === edited.id
        ? { ...message, content: edited.content || message.content, metadata: edited.metadata }
        : message,
    )
  }
  return messages
}

import { request } from './client'
import type { CreateMessagePayload, Message, MessageList, MessageMetadata } from '@/types/api'

// En attendant le champ metadata côté back, les métadonnées voyagent en JSON dans content.
function encodeContent(text: string, metadata: MessageMetadata): string {
  return JSON.stringify({ text, metadata })
}

function decodeMessage(message: Message): Message {
  try {
    const parsed = JSON.parse(message.content)
    if (typeof parsed?.text === 'string') {
      return { ...message, content: parsed.text, metadata: parsed.metadata }
    }
  } catch {
    // Message en texte brut (ancien message, ou envoyé par un autre client).
  }
  return message
}

export async function getMessages(channelId: number): Promise<Message[]> {
  const messages = await request<MessageList>('GET', `/channel/message?channel=${channelId}`)
  return (messages ?? []).map(decodeMessage)
}

export async function sendMessage(
  channelId: number,
  text: string,
  metadata: MessageMetadata,
): Promise<Message> {
  const body: CreateMessagePayload = { content: encodeContent(text, metadata), channel: channelId }
  const message = await request<Message>('POST', '/channel/message', body)
  return decodeMessage(message)
}

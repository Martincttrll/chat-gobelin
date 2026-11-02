import { request } from './client'
import type { CreateMessagePayload, Message, MessageList } from '@/types/api'

export async function getMessages(channelId: number): Promise<Message[]> {
  const messages = await request<MessageList>('GET', `/channel/message?channel=${channelId}`)
  return messages ?? []
}

export function sendMessage(channelId: number, content: string): Promise<Message> {
  const body: CreateMessagePayload = { content, channel: channelId }
  return request<Message>('POST', '/channel/message', body)
}

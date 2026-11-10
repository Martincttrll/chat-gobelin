import { request } from './client'
import type { Channel, CreateChannelPayload, EnterChannelPayload } from '@/types/api'

export function createChannel(name: string): Promise<Channel> {
  const body: CreateChannelPayload = { name, metadata: {} }
  return request<Channel>('POST', '/channel', body)
}

export function enterChannel(name: string): Promise<Channel> {
  const body: EnterChannelPayload = { channel: name }
  return request<Channel>('POST', '/channel/enter', body)
}

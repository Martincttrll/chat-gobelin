import { API_URL, request } from './client'
import type { Credentials, Me, User } from '@/types/api'

// /login renvoie le token en texte brut : on ne passe pas par request(), qui parse du JSON.
export async function login(credentials: Credentials): Promise<string> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error(`POST /login : ${response.status}`)
  }

  return response.text()
}

export function createUser(credentials: Credentials): Promise<User> {
  return request<User>('POST', '/user', credentials)
}

export function getCurrentUser(): Promise<Me> {
  return request<Me>('GET', '/me')
}

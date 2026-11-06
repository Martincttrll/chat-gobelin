import { useUserStore } from '@/stores/user'

// Même hôte que la page : permet de tester depuis un téléphone sur le réseau local.
export const API_URL = `http://${window.location.hostname}:4000`

export async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const userStore = useUserStore()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (userStore.token) {
    headers.Authorization = `Bearer ${userStore.token}`
  }

  const response = await fetch(API_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    userStore.logout()
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} : ${response.status}`)
  }

  return response.json()
}

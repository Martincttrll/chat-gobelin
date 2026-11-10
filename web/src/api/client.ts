import { useUserStore } from '@/stores/user'

// Même hôte que la page : permet de tester depuis un téléphone sur le réseau local.
export const API_URL = `http://${window.location.hostname}:4000`

// Espace des metadata de l'app. Le changer rendrait les metadata déjà enregistrées introuvables.
export const NAMESPACE = 'type-swap'

// Le namespace passe en paramètre d'URL : l'API accepte aussi un en-tête Namespace,
// mais ne l'autorise pas en CORS (Access-Control-Allow-Headers).
export function apiUrl(path: string): string {
  const url = new URL(path, API_URL)
  url.searchParams.set('namespace', NAMESPACE)
  return url.toString()
}

export async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const userStore = useUserStore()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (userStore.token) {
    headers.Authorization = `Bearer ${userStore.token}`
  }

  const response = await fetch(apiUrl(path), {
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

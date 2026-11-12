import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser, login as apiLogin } from '@/api/users'
import { createChannel, enterChannel, SYSTEM_CHANNEL } from '@/api/channels'
import { NAMESPACE } from '@/api/client'
import type { Credentials, Me, UserMetadata } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const me = ref<Me | null>(null)
  const profile = computed(() => (me.value?.metadata?.[NAMESPACE] ?? {}) as UserMetadata)
  // Channels affichés dans l'app : tous sauf le channel technique.
  const channels = computed(() => me.value?.channels.filter((c) => c.name !== SYSTEM_CHANNEL) ?? [])
  const systemChannel = computed(() => me.value?.channels.find((c) => c.name === SYSTEM_CHANNEL))

  async function login(credentials: Credentials) {
    token.value = await apiLogin(credentials)
    localStorage.setItem('token', token.value)
    await fetchMe()
  }

  // Nouveaux comptes comme anciens : on rejoint le channel technique au premier chargement,
  // avant d'exposer me (les vues s'appuient sur systemChannel dès que me existe).
  async function fetchMe() {
    let current = await getCurrentUser()
    if (!current.channels.some((c) => c.name === SYSTEM_CHANNEL)) {
      await joinSystemChannel()
      current = await getCurrentUser()
    }
    me.value = current
  }

  async function joinSystemChannel() {
    try {
      await enterChannel(SYSTEM_CHANNEL)
    } catch {
      // N'existe pas encore (enter renvoie une erreur) : le premier joueur le crée.
      // Si un autre l'a créé entre-temps (nom unique en base), la création échoue : on retente d'entrer.
      await createChannel(SYSTEM_CHANNEL).catch(() => enterChannel(SYSTEM_CHANNEL).catch(() => {}))
    }
  }

  function logout() {
    token.value = null
    me.value = null
    localStorage.removeItem('token')
  }

  return { token, me, profile, channels, systemChannel, login, fetchMe, logout }
})

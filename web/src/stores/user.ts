import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser, login as apiLogin } from '@/api/users'
import { NAMESPACE } from '@/api/client'
import type { Credentials, Me, UserMetadata } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const me = ref<Me | null>(null)
  const profile = computed(() => (me.value?.metadata?.[NAMESPACE] ?? {}) as UserMetadata)

  async function login(credentials: Credentials) {
    token.value = await apiLogin(credentials)
    localStorage.setItem('token', token.value)
    await fetchMe()
  }

  async function fetchMe() {
    me.value = await getCurrentUser()
  }

  function logout() {
    token.value = null
    me.value = null
    localStorage.removeItem('token')
  }

  return { token, me, profile, login, fetchMe, logout }
})

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser, login as apiLogin } from '@/api/users'
import type { Credentials, Me } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const me = ref<Me | null>(null)

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

  return { token, me, login, fetchMe, logout }
})

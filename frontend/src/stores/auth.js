import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/axios'
import socketService from '../api/socket'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)

  async function register(username, email, password) {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password
      })

      user.value = response.data.user
      token.value = response.data.token
      localStorage.setItem('token', response.data.token)

      // Connect to socket
      socketService.connect(response.data.token)

      router.push('/')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message }
    }
  }

  async function login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      })

      user.value = response.data.user
      token.value = response.data.token
      localStorage.setItem('token', response.data.token)

      // Connect to socket
      socketService.connect(response.data.token)

      router.push('/')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message }
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      user.value = null
      token.value = null
      localStorage.removeItem('token')
      socketService.disconnect()
      router.push('/login')
    }
  }

  async function restoreSession() {
    if (!token.value) return

    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
      socketService.connect(token.value)
    } catch (error) {
      console.error('Session restore failed:', error)
      logout()
    }
  }

  async function updateProfile(data) {
    try {
      const response = await api.patch('/users/me', data)
      user.value = response.data.user
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    register,
    login,
    logout,
    restoreSession,
    updateProfile
  }
})

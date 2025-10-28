import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/axios'
import socketService from '../api/socket'

export const useChatStore = defineStore('chat', () => {
  const chats = ref([])
  const currentChat = ref(null)
  const messages = ref({}) // { chatId: [...messages] }
  const typingUsers = ref({}) // { chatId: [userId1, userId2, ...] }

  const sortedChats = computed(() => {
    return [...chats.value].sort((a, b) => {
      const aTime = new Date(a.updatedAt)
      const bTime = new Date(b.updatedAt)
      return bTime - aTime
    })
  })

  async function fetchChats() {
    try {
      const response = await api.get('/chats')
      chats.value = response.data.chats
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function createChat(participantIds, isGroup = false, name = '') {
    try {
      const response = await api.post('/chats', {
        participantIds,
        isGroup,
        name
      })

      const chat = response.data.chat

      // Add to chats if not already there
      const existingIndex = chats.value.findIndex(c => c._id === chat._id)
      if (existingIndex === -1) {
        chats.value.unshift(chat)
      }

      return { success: true, chat }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function updateChat(chatId, data) {
    try {
      const response = await api.patch(`/chats/${chatId}`, data)

      const index = chats.value.findIndex(c => c._id === chatId)
      if (index !== -1) {
        chats.value[index] = response.data.chat
      }

      if (currentChat.value?._id === chatId) {
        currentChat.value = response.data.chat
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function deleteChat(chatId) {
    try {
      await api.delete(`/chats/${chatId}`)

      chats.value = chats.value.filter(c => c._id !== chatId)
      if (currentChat.value?._id === chatId) {
        currentChat.value = null
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function fetchMessages(chatId, limit = 50, before = null) {
    try {
      const params = { limit }
      if (before) params.before = before

      const response = await api.get(`/chats/${chatId}/messages`, { params })

      if (!messages.value[chatId]) {
        messages.value[chatId] = []
      }

      messages.value[chatId] = response.data.messages

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  function sendMessage(chatId, content, type = 'text') {
    socketService.emit('message:send', { chatId, content, type })
  }

  function startTyping(chatId) {
    socketService.emit('typing:start', { chatId })
  }

  function stopTyping(chatId) {
    socketService.emit('typing:stop', { chatId })
  }

  function addMessage(chatId, message) {
    if (!messages.value[chatId]) {
      messages.value[chatId] = []
    }

    messages.value[chatId].push(message)

    // Update chat's last message
    const chat = chats.value.find(c => c._id === chatId)
    if (chat) {
      chat.lastMessage = message
      chat.updatedAt = message.createdAt
    }
  }

  function setCurrentChat(chat) {
    currentChat.value = chat
    if (chat) {
      socketService.emit('chat:join', chat._id)
      fetchMessages(chat._id)
    }
  }

  function handleTyping(data) {
    const { chatId, userId, isTyping } = data

    if (!typingUsers.value[chatId]) {
      typingUsers.value[chatId] = []
    }

    if (isTyping) {
      if (!typingUsers.value[chatId].includes(userId)) {
        typingUsers.value[chatId].push(userId)
      }
    } else {
      typingUsers.value[chatId] = typingUsers.value[chatId].filter(id => id !== userId)
    }
  }

  // Setup socket listeners
  function setupSocketListeners() {
    socketService.on('message:new', ({ message, chatId }) => {
      addMessage(chatId, message)
    })

    socketService.on('typing:user', (data) => {
      handleTyping(data)
    })

    socketService.on('chat:joined', ({ chatId }) => {
      console.log('Joined chat:', chatId)
    })
  }

  return {
    chats,
    currentChat,
    messages,
    typingUsers,
    sortedChats,
    fetchChats,
    createChat,
    updateChat,
    deleteChat,
    fetchMessages,
    sendMessage,
    startTyping,
    stopTyping,
    setCurrentChat,
    addMessage,
    setupSocketListeners
  }
})

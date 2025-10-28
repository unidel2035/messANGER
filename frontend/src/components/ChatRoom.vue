<template>
  <div class="chat-room" v-if="currentChat">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="chat-header-info">
        <el-avatar :size="40">
          {{ chatName.charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="header-text">
          <h3>{{ chatName }}</h3>
          <span class="participants-count" v-if="currentChat.isGroup">
            {{ currentChat.participants?.length }} members
          </span>
          <span class="user-status" v-else>
            {{ otherUserStatus }}
          </span>
        </div>
      </div>

      <div class="chat-header-actions">
        <el-button
          circle
          :icon="VideoCamera"
          @click="startVideoCall"
          title="Video Call"
        />
        <el-button
          circle
          :icon="Phone"
          @click="startVoiceCall"
          title="Voice Call"
        />
        <el-dropdown @command="handleChatMenu" v-if="currentChat.isGroup">
          <el-button circle :icon="MoreFilled" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">Rename Group</el-dropdown-item>
              <el-dropdown-item command="delete" divided>Delete Group</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="message in currentMessages"
        :key="message._id"
        class="message"
        :class="{ own: message.sender._id === authStore.user?.id }"
      >
        <el-avatar :size="32" v-if="message.sender._id !== authStore.user?.id">
          {{ message.sender.username.charAt(0).toUpperCase() }}
        </el-avatar>

        <div class="message-content">
          <div class="message-header" v-if="currentChat.isGroup && message.sender._id !== authStore.user?.id">
            <span class="sender-name">{{ message.sender.username }}</span>
          </div>
          <div class="message-bubble">
            {{ message.content }}
          </div>
          <div class="message-time">
            {{ formatMessageTime(message.createdAt) }}
          </div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="typingUsersText" class="typing-indicator">
        <span>{{ typingUsersText }}</span>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input">
      <el-input
        v-model="messageText"
        placeholder="Type a message..."
        @keyup.enter="sendMessage"
        @input="handleTyping"
        size="large"
      >
        <template #append>
          <el-button :icon="Promotion" @click="sendMessage" type="primary">
            Send
          </el-button>
        </template>
      </el-input>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { VideoCamera, Phone, MoreFilled, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useCallStore } from '../stores/call'

const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()
const callStore = useCallStore()

const messageText = ref('')
const messagesContainer = ref(null)
let typingTimer = null

const currentChat = computed(() => chatStore.currentChat)

const currentMessages = computed(() => {
  if (!currentChat.value) return []
  return chatStore.messages[currentChat.value._id] || []
})

const chatName = computed(() => {
  if (!currentChat.value) return ''

  if (currentChat.value.isGroup) {
    return currentChat.value.name || 'Group Chat'
  }

  const otherParticipant = currentChat.value.participants?.find(
    p => p._id !== authStore.user?.id
  )

  return otherParticipant?.username || 'Unknown'
})

const otherUserStatus = computed(() => {
  if (!currentChat.value || currentChat.value.isGroup) return ''

  const otherParticipant = currentChat.value.participants?.find(
    p => p._id !== authStore.user?.id
  )

  if (!otherParticipant) return 'offline'

  return otherParticipant.status === 'online' ? 'Online' : 'Offline'
})

const typingUsersText = computed(() => {
  if (!currentChat.value) return ''

  const typingUsers = chatStore.typingUsers[currentChat.value._id] || []
  const filtered = typingUsers.filter(userId => userId !== authStore.user?.id)

  if (filtered.length === 0) return ''
  if (filtered.length === 1) return 'Someone is typing...'
  return `${filtered.length} people are typing...`
})

function sendMessage() {
  if (!messageText.value.trim()) return

  chatStore.sendMessage(currentChat.value._id, messageText.value)
  messageText.value = ''
  chatStore.stopTyping(currentChat.value._id)

  nextTick(() => {
    scrollToBottom()
  })
}

function handleTyping() {
  chatStore.startTyping(currentChat.value._id)

  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    chatStore.stopTyping(currentChat.value._id)
  }, 1000)
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatMessageTime(date) {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

async function startVoiceCall() {
  if (currentChat.value.isGroup) {
    ElMessage.warning('Group calls are not supported yet')
    return
  }

  const otherParticipant = currentChat.value.participants?.find(
    p => p._id !== authStore.user?.id
  )

  if (otherParticipant) {
    await callStore.initiateCall(otherParticipant._id, false)
  }
}

async function startVideoCall() {
  if (currentChat.value.isGroup) {
    ElMessage.warning('Group calls are not supported yet')
    return
  }

  const otherParticipant = currentChat.value.participants?.find(
    p => p._id !== authStore.user?.id
  )

  if (otherParticipant) {
    await callStore.initiateCall(otherParticipant._id, true)
  }
}

async function handleChatMenu(command) {
  if (command === 'rename') {
    const { value } = await ElMessageBox.prompt('Enter new group name', 'Rename Group', {
      confirmButtonText: 'Rename',
      cancelButtonText: 'Cancel',
      inputValue: currentChat.value.name
    })

    if (value) {
      const result = await chatStore.updateChat(currentChat.value._id, { name: value })
      if (result.success) {
        ElMessage.success('Group renamed successfully')
      }
    }
  } else if (command === 'delete') {
    try {
      await ElMessageBox.confirm(
        'This will permanently delete the group. Continue?',
        'Warning',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning'
        }
      )

      const result = await chatStore.deleteChat(currentChat.value._id)
      if (result.success) {
        ElMessage.success('Group deleted successfully')
      }
    } catch {
      // User cancelled
    }
  }
}

// Load chat when route changes
watch(() => route.params.chatId, async (chatId) => {
  if (chatId) {
    const chat = chatStore.chats.find(c => c._id === chatId)
    if (chat) {
      chatStore.setCurrentChat(chat)
      await nextTick()
      scrollToBottom()
    }
  }
}, { immediate: true })

// Auto-scroll when new messages arrive
watch(currentMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.participants-count,
.user-status {
  font-size: 12px;
  color: #909399;
}

.chat-header-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f7fa;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.message.own {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 60%;
}

.message.own .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-header {
  margin-bottom: 4px;
}

.sender-name {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
}

.message.own .message-bubble {
  background: #667eea;
  color: white;
}

.message-time {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
}

.typing-indicator {
  padding: 10px;
  color: #909399;
  font-size: 13px;
  font-style: italic;
}

.message-input {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
}
</style>

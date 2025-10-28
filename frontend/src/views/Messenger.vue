<template>
  <div class="messenger-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>messANGER</h2>
        <div class="header-actions">
          <el-button
            circle
            :icon="Plus"
            @click="showNewChatDialog = true"
            size="small"
          />
          <el-dropdown @command="handleUserMenu">
            <el-avatar :size="32">{{ userInitials }}</el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">Profile</el-dropdown-item>
                <el-dropdown-item command="logout" divided>Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="Search chats..."
          :prefix-icon="Search"
          clearable
        />
      </div>

      <div class="chat-list">
        <div
          v-for="chat in filteredChats"
          :key="chat._id"
          class="chat-item"
          :class="{ active: currentChat?._id === chat._id }"
          @click="selectChat(chat)"
        >
          <el-avatar :size="48">
            {{ getChatName(chat).charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="chat-info">
            <div class="chat-name">{{ getChatName(chat) }}</div>
            <div class="chat-last-message">
              {{ chat.lastMessage?.content || 'No messages yet' }}
            </div>
          </div>
          <div class="chat-meta">
            <span class="chat-time" v-if="chat.updatedAt">
              {{ formatTime(chat.updatedAt) }}
            </span>
          </div>
        </div>

        <div v-if="filteredChats.length === 0" class="empty-state">
          <p>No chats found</p>
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <div class="chat-area">
      <router-view />
    </div>

    <!-- New Chat Dialog -->
    <el-dialog
      v-model="showNewChatDialog"
      title="New Chat"
      width="400px"
    >
      <el-form>
        <el-form-item label="Search Users">
          <el-input
            v-model="userSearchQuery"
            placeholder="Search by username or email"
            @input="searchUsers"
          />
        </el-form-item>

        <el-form-item label="Type">
          <el-radio-group v-model="newChatType">
            <el-radio label="private">Private Chat</el-radio>
            <el-radio label="group">Group Chat</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Group Name" v-if="newChatType === 'group'">
          <el-input v-model="newChatName" placeholder="Enter group name" />
        </el-form-item>

        <el-form-item label="Participants">
          <div class="user-list">
            <div
              v-for="user in searchResults"
              :key="user._id"
              class="user-item"
              @click="toggleUserSelection(user)"
            >
              <el-checkbox :model-value="isUserSelected(user._id)" />
              <el-avatar :size="32">{{ user.username.charAt(0).toUpperCase() }}</el-avatar>
              <span>{{ user.username }}</span>
            </div>

            <div v-if="searchResults.length === 0 && userSearchQuery" class="empty-state">
              <p>No users found</p>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showNewChatDialog = false">Cancel</el-button>
        <el-button type="primary" @click="createNewChat" :disabled="selectedUsers.length === 0">
          Create Chat
        </el-button>
      </template>
    </el-dialog>

    <!-- Incoming Call Dialog -->
    <IncomingCallDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useCallStore } from '../stores/call'
import api from '../api/axios'
import IncomingCallDialog from '../components/IncomingCallDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const callStore = useCallStore()

const searchQuery = ref('')
const showNewChatDialog = ref(false)
const userSearchQuery = ref('')
const searchResults = ref([])
const selectedUsers = ref([])
const newChatType = ref('private')
const newChatName = ref('')

const userInitials = computed(() => {
  return authStore.user?.username?.charAt(0).toUpperCase() || 'U'
})

const currentChat = computed(() => chatStore.currentChat)

const filteredChats = computed(() => {
  if (!searchQuery.value) {
    return chatStore.sortedChats
  }

  return chatStore.sortedChats.filter(chat => {
    const chatName = getChatName(chat).toLowerCase()
    return chatName.includes(searchQuery.value.toLowerCase())
  })
})

function getChatName(chat) {
  if (chat.isGroup) {
    return chat.name || 'Group Chat'
  }

  const otherParticipant = chat.participants?.find(
    p => p._id !== authStore.user?.id
  )

  return otherParticipant?.username || 'Unknown'
}

function formatTime(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  if (diff < 86400000) { // Less than 24 hours
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } else if (diff < 604800000) { // Less than 7 days
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function selectChat(chat) {
  chatStore.setCurrentChat(chat)
  router.push(`/chat/${chat._id}`)
}

async function searchUsers() {
  if (userSearchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  try {
    const response = await api.get('/users/search', {
      params: { query: userSearchQuery.value }
    })
    searchResults.value = response.data.users
  } catch (error) {
    console.error('Error searching users:', error)
  }
}

function toggleUserSelection(user) {
  const index = selectedUsers.value.findIndex(u => u._id === user._id)
  if (index === -1) {
    if (newChatType.value === 'private' && selectedUsers.value.length > 0) {
      selectedUsers.value = [user]
    } else {
      selectedUsers.value.push(user)
    }
  } else {
    selectedUsers.value.splice(index, 1)
  }
}

function isUserSelected(userId) {
  return selectedUsers.value.some(u => u._id === userId)
}

async function createNewChat() {
  if (selectedUsers.value.length === 0) {
    return
  }

  if (newChatType.value === 'group' && !newChatName.value) {
    ElMessage.error('Please enter a group name')
    return
  }

  const participantIds = selectedUsers.value.map(u => u._id)
  const result = await chatStore.createChat(
    participantIds,
    newChatType.value === 'group',
    newChatName.value
  )

  if (result.success) {
    ElMessage.success('Chat created successfully')
    showNewChatDialog.value = false
    selectedUsers.value = []
    newChatName.value = ''
    userSearchQuery.value = ''
    searchResults.value = []

    if (result.chat) {
      selectChat(result.chat)
    }
  }
}

function handleUserMenu(command) {
  if (command === 'logout') {
    authStore.logout()
  } else if (command === 'profile') {
    // TODO: Implement profile view
    ElMessage.info('Profile feature coming soon')
  }
}

onMounted(async () => {
  await chatStore.fetchChats()
  chatStore.setupSocketListeners()
  callStore.setupSocketListeners()
})

watch(newChatType, () => {
  if (newChatType.value === 'private') {
    if (selectedUsers.value.length > 1) {
      selectedUsers.value = [selectedUsers.value[0]]
    }
  }
})
</script>

<style scoped>
.messenger-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 350px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-box {
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f5f7fa;
}

.chat-item:hover {
  background: #f5f7fa;
}

.chat-item.active {
  background: #ecf5ff;
}

.chat-info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.chat-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.chat-last-message {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.chat-time {
  font-size: 12px;
  color: #909399;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #909399;
}

.user-list {
  max-height: 300px;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f5f7fa;
}
</style>

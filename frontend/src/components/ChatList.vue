<template>
  <div class="chat-list-placeholder">
    <div class="placeholder-content">
      <el-icon :size="80" color="#909399">
        <ChatDotRound />
      </el-icon>
      <h3>Select a chat to start messaging</h3>
      <p>Choose from your existing conversations or start a new one</p>
    </div>
  </div>
</template>

<script setup>
import { ChatDotRound } from '@element-plus/icons-vue'
</script>

<style scoped>
.chat-list-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f7fa;
}

.placeholder-content {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.placeholder-content h3 {
  margin: 20px 0 10px;
  color: #303133;
  font-size: 20px;
}

.placeholder-content p {
  color: #909399;
  font-size: 14px;
}
</style>

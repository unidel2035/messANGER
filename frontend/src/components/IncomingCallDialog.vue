<template>
  <div>
    <!-- Incoming Call Dialog -->
    <el-dialog
      v-model="showIncomingCall"
      title="Incoming Call"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="incoming-call-content" v-if="callStore.incomingCall">
        <el-avatar :size="80">
          {{ callStore.incomingCall.caller.username.charAt(0).toUpperCase() }}
        </el-avatar>
        <h3>{{ callStore.incomingCall.caller.username }}</h3>
        <p>{{ callStore.incomingCall.isVideo ? 'Video' : 'Voice' }} Call</p>
      </div>

      <template #footer>
        <div class="call-actions">
          <el-button
            type="danger"
            circle
            :icon="Close"
            size="large"
            @click="rejectCall"
          />
          <el-button
            type="success"
            circle
            :icon="Check"
            size="large"
            @click="answerCall"
          />
        </div>
      </template>
    </el-dialog>

    <!-- Active Call Dialog -->
    <el-dialog
      v-model="showActiveCall"
      :title="callTitle"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="endCall"
    >
      <div class="call-content">
        <div class="video-container" v-if="callStore.activeCall?.isVideo">
          <video
            ref="remoteVideo"
            autoplay
            playsinline
            class="remote-video"
          />
          <video
            ref="localVideo"
            autoplay
            playsinline
            muted
            class="local-video"
          />
        </div>

        <div class="audio-call-placeholder" v-else>
          <el-icon :size="80">
            <Phone />
          </el-icon>
          <p>{{ callStatus }}</p>
        </div>
      </div>

      <template #footer>
        <div class="call-controls">
          <el-button
            :type="audioEnabled ? 'primary' : 'info'"
            circle
            :icon="audioEnabled ? Microphone : MicrophoneSlash"
            @click="toggleAudio"
          />
          <el-button
            v-if="callStore.activeCall?.isVideo"
            :type="videoEnabled ? 'primary' : 'info'"
            circle
            :icon="videoEnabled ? VideoCamera : VideoCameraSlash"
            @click="toggleVideo"
          />
          <el-button
            type="danger"
            circle
            :icon="PhoneFilled"
            @click="endCall"
          />
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  Phone,
  PhoneFilled,
  VideoCamera,
  Close,
  Check,
  Microphone,
  MicrophoneSlash,
  VideoCameraSlash
} from '@element-plus/icons-vue'
import { useCallStore } from '../stores/call'

const callStore = useCallStore()

const remoteVideo = ref(null)
const localVideo = ref(null)
const audioEnabled = ref(true)
const videoEnabled = ref(true)

const showIncomingCall = computed(() => !!callStore.incomingCall)
const showActiveCall = computed(() => !!callStore.activeCall)

const callTitle = computed(() => {
  if (!callStore.activeCall) return ''
  return callStore.activeCall.isVideo ? 'Video Call' : 'Voice Call'
})

const callStatus = computed(() => {
  if (!callStore.activeCall) return ''
  return callStore.activeCall.status === 'calling' ? 'Calling...' : 'Connected'
})

async function answerCall() {
  if (callStore.incomingCall) {
    await callStore.answerCall(callStore.incomingCall)
  }
}

function rejectCall() {
  if (callStore.incomingCall) {
    callStore.rejectCall(callStore.incomingCall.callId)
  }
}

function endCall() {
  callStore.endCall()
}

function toggleAudio() {
  audioEnabled.value = callStore.toggleAudio()
}

function toggleVideo() {
  videoEnabled.value = callStore.toggleVideo()
}

// Watch for local and remote streams
watch(() => callStore.localStream, (stream) => {
  if (stream && localVideo.value) {
    localVideo.value.srcObject = stream
  }
})

watch(() => callStore.remoteStream, (stream) => {
  if (stream && remoteVideo.value) {
    remoteVideo.value.srcObject = stream
  }
})
</script>

<style scoped>
.incoming-call-content {
  text-align: center;
  padding: 20px;
}

.incoming-call-content h3 {
  margin: 20px 0 10px;
  font-size: 24px;
}

.incoming-call-content p {
  color: #909399;
  font-size: 16px;
}

.call-actions {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.call-content {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
}

.video-container {
  position: relative;
  width: 100%;
  height: 400px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-video {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 150px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid white;
}

.audio-call-placeholder {
  text-align: center;
}

.audio-call-placeholder p {
  margin-top: 20px;
  font-size: 18px;
  color: #606266;
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>

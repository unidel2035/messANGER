import { defineStore } from 'pinia'
import { ref } from 'vue'
import socketService from '../api/socket'

export const useCallStore = defineStore('call', () => {
  const activeCall = ref(null)
  const incomingCall = ref(null)
  const localStream = ref(null)
  const remoteStream = ref(null)
  const peerConnection = ref(null)

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  async function initiateCall(calleeId, isVideo = false) {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: isVideo
      }

      localStream.value = await navigator.mediaDevices.getUserMedia(constraints)

      // Create peer connection
      peerConnection.value = new RTCPeerConnection(iceServers)

      // Add local stream tracks
      localStream.value.getTracks().forEach(track => {
        peerConnection.value.addTrack(track, localStream.value)
      })

      // Handle ICE candidates
      peerConnection.value.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('call:ice-candidate', {
            callId: activeCall.value?.callId,
            candidate: event.candidate,
            to: calleeId
          })
        }
      }

      // Handle remote stream
      peerConnection.value.ontrack = (event) => {
        remoteStream.value = event.streams[0]
      }

      // Create offer
      const offer = await peerConnection.value.createOffer()
      await peerConnection.value.setLocalDescription(offer)

      // Send offer via socket
      socketService.emit('call:initiate', {
        calleeId,
        offer,
        isVideo
      })

      activeCall.value = {
        calleeId,
        isVideo,
        status: 'calling'
      }

      return { success: true }
    } catch (error) {
      console.error('Error initiating call:', error)
      endCall()
      return { success: false, error: error.message }
    }
  }

  async function answerCall(call) {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: call.isVideo
      }

      localStream.value = await navigator.mediaDevices.getUserMedia(constraints)

      // Create peer connection
      peerConnection.value = new RTCPeerConnection(iceServers)

      // Add local stream tracks
      localStream.value.getTracks().forEach(track => {
        peerConnection.value.addTrack(track, localStream.value)
      })

      // Handle ICE candidates
      peerConnection.value.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('call:ice-candidate', {
            callId: call.callId,
            candidate: event.candidate,
            to: call.caller.id
          })
        }
      }

      // Handle remote stream
      peerConnection.value.ontrack = (event) => {
        remoteStream.value = event.streams[0]
      }

      // Set remote description
      await peerConnection.value.setRemoteDescription(new RTCSessionDescription(call.offer))

      // Create answer
      const answer = await peerConnection.value.createAnswer()
      await peerConnection.value.setLocalDescription(answer)

      // Send answer via socket
      socketService.emit('call:answer', {
        callId: call.callId,
        answer
      })

      activeCall.value = {
        callId: call.callId,
        callerId: call.caller.id,
        isVideo: call.isVideo,
        status: 'active'
      }

      incomingCall.value = null

      return { success: true }
    } catch (error) {
      console.error('Error answering call:', error)
      rejectCall(call.callId)
      return { success: false, error: error.message }
    }
  }

  function rejectCall(callId) {
    socketService.emit('call:reject', { callId })
    incomingCall.value = null
  }

  function endCall() {
    if (activeCall.value?.callId) {
      socketService.emit('call:end', { callId: activeCall.value.callId })
    }

    cleanup()
  }

  function cleanup() {
    // Stop all tracks
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }

    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach(track => track.stop())
      remoteStream.value = null
    }

    // Close peer connection
    if (peerConnection.value) {
      peerConnection.value.close()
      peerConnection.value = null
    }

    activeCall.value = null
    incomingCall.value = null
  }

  function toggleAudio() {
    if (localStream.value) {
      const audioTrack = localStream.value.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return audioTrack.enabled
      }
    }
    return false
  }

  function toggleVideo() {
    if (localStream.value) {
      const videoTrack = localStream.value.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return videoTrack.enabled
      }
    }
    return false
  }

  // Setup socket listeners
  function setupSocketListeners() {
    socketService.on('call:incoming', (call) => {
      incomingCall.value = call
    })

    socketService.on('call:answered', async ({ callId, answer }) => {
      if (activeCall.value?.callId === callId && peerConnection.value) {
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer))
        activeCall.value.status = 'active'
      }
    })

    socketService.on('call:ice-candidate', async ({ candidate }) => {
      if (peerConnection.value) {
        await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate))
      }
    })

    socketService.on('call:rejected', () => {
      cleanup()
    })

    socketService.on('call:ended', () => {
      cleanup()
    })

    socketService.on('call:error', (error) => {
      console.error('Call error:', error)
      cleanup()
    })
  }

  return {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    setupSocketListeners
  }
})

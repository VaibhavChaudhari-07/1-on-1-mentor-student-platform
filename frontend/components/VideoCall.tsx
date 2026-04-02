'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'

interface VideoCallProps {
  socket: Socket
  sessionId: string
  userId: string
  userRole: 'mentor' | 'student'
}

export default function VideoCall({ socket, sessionId, userId, userRole }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [remoteUserRole, setRemoteUserRole] = useState<'mentor' | 'student' | null>(null)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected')
  const [error, setError] = useState<string | null>(null)

  // ICE servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
    // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
  ]

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers,
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          sessionId
        })
      }
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setIsConnected(true)
        setConnectionState('connected')
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      switch (pc.connectionState) {
        case 'connected':
          setConnectionState('connected')
          setIsInCall(true)
          break
        case 'disconnected':
        case 'failed':
          setConnectionState('failed')
          setIsInCall(false)
          setIsConnected(false)
          break
        case 'closed':
          setConnectionState('disconnected')
          setIsInCall(false)
          setIsConnected(false)
          break
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState)
    }

    return pc
  }, [socket, sessionId])

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (err) {
      console.error('Error accessing media devices:', err)
      setError('Failed to access camera and microphone')
      throw err
    }
  }, [])

  const createOffer = useCallback(async () => {
    if (!peerConnectionRef.current) return

    try {
      const offer = await peerConnectionRef.current.createOffer()
      await peerConnectionRef.current.setLocalDescription(offer)

      socket.emit('webrtc-offer', {
        offer,
        sessionId
      })

      console.log('Offer created and sent')
    } catch (err) {
      console.error('Error creating offer:', err)
      setError('Failed to create call offer')
    }
  }, [socket, sessionId])

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)

      socket.emit('webrtc-answer', {
        answer,
        sessionId
      })

      console.log('Answer created and sent')
    } catch (err) {
      console.error('Error creating answer:', err)
      setError('Failed to create call answer')
    }
  }, [socket, sessionId])

  const initializeCall = useCallback(async () => {
    try {
      setError(null)
      setConnectionState('connecting')

      // Get local media stream
      const stream = await startLocalStream()

      // Create peer connection
      peerConnectionRef.current = createPeerConnection()

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream)
        }
      })

      // If mentor, create offer. If student, wait for offer
      if (userRole === 'mentor') {
        setTimeout(() => createOffer(), 1000)
      }

    } catch (err) {
      console.error('Error initializing call:', err)
      setConnectionState('failed')
      setError('Failed to initialize video call')
    }
  }, [userRole, startLocalStream, createPeerConnection, createOffer])

  const endCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    // Reset state
    setIsConnected(false)
    setIsInCall(false)
    setConnectionState('disconnected')
    setRemoteUserRole(null)
    setError(null)

    console.log('Call ended')
  }, [])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOff(!videoTrack.enabled)
      }
    }
  }, [])

  // Socket event handlers
  useEffect(() => {
    const handleOffer = async (data: any) => {
      console.log('Received offer:', data)
      setRemoteUserRole(data.role)

      if (!peerConnectionRef.current) {
        await initializeCall()
      }

      await createAnswer(data.offer)
    }

    const handleAnswer = async (data: any) => {
      console.log('Received answer:', data)
      setRemoteUserRole(data.role)

      if (peerConnectionRef.current && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        } catch (err) {
          console.error('Error setting remote description:', err)
          setError('Failed to establish connection')
        }
      }
    }

    const handleIceCandidate = async (data: any) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (err) {
          console.error('Error adding ICE candidate:', err)
        }
      }
    }

    socket.on('webrtc-offer', handleOffer)
    socket.on('webrtc-answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)

    return () => {
      socket.off('webrtc-offer', handleOffer)
      socket.off('webrtc-answer', handleAnswer)
      socket.off('ice-candidate', handleIceCandidate)
    }
  }, [socket, initializeCall, createAnswer])

  // Initialize call when component mounts (only if both users are in session)
  useEffect(() => {
    // Wait a bit for both users to join before starting call
    const timer = setTimeout(() => {
      if (!isInCall && !peerConnectionRef.current) {
        initializeCall()
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [initializeCall, isInCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall()
    }
  }, [endCall])

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'failed': return 'Connection Failed'
      default: return 'Disconnected'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Video Call</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
          <span className="text-sm text-gray-600">{getConnectionStatusText()}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Local Video */}
        <div className="relative">
          <h3 className="text-sm font-medium mb-2">
            You ({userRole})
            {isMuted && <span className="text-red-500 ml-1">🔇</span>}
            {isCameraOff && <span className="text-red-500 ml-1">📷</span>}
          </h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 bg-gray-200 rounded-lg object-cover"
          />
          {!localStreamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl mb-2">📹</div>
                <div className="text-sm text-gray-600">Initializing camera...</div>
              </div>
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div className="relative">
          <h3 className="text-sm font-medium mb-2">
            {remoteUserRole ? `${remoteUserRole === 'mentor' ? 'Mentor' : 'Student'}` : 'Waiting for peer...'}
          </h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-48 bg-gray-200 rounded-lg object-cover"
          />
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm text-gray-600">
                  {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for peer to join'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={toggleMute}
          disabled={!isInCall}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isMuted
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isMuted ? '🔇 Unmute' : '🎤 Mute'}
        </button>

        <button
          onClick={toggleCamera}
          disabled={!isInCall}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isCameraOff
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isCameraOff ? '📷 Turn On Camera' : '📹 Turn Off Camera'}
        </button>

        <button
          onClick={endCall}
          disabled={!isInCall && connectionState === 'disconnected'}
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📞 End Call
        </button>
      </div>

      {/* Call Status */}
      {isInCall && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Call in progress with {remoteUserRole === 'mentor' ? 'mentor' : 'student'}
        </div>
      )}
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

interface VideoCallProps {
  socket: Socket
  sessionId: string
  userId: string
}

export default function VideoCall({ socket, sessionId, userId }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const initWebRTC = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })

      peerConnectionRef.current = pc

      // Get local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
      } catch (error) {
        console.error('Error accessing media devices:', error)
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setIsConnected(true)
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', event.candidate)
        }
      }

      // Listen for signaling
      socket.on('offer', async (offer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('answer', answer)
      })

      socket.on('answer', async (answer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      })

      socket.on('ice-candidate', async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error('Error adding ICE candidate:', error)
        }
      })

      // Create offer if mentor
      // For simplicity, assume mentor initiates
      setTimeout(async () => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('offer', offer)
      }, 1000)
    }

    initWebRTC()

    return () => {
      peerConnectionRef.current?.close()
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
    }
  }, [socket, sessionId])

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold mb-4">Video Call</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">You</h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-48 bg-gray-200 rounded"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">
            {isConnected ? 'Peer' : 'Waiting for connection...'}
          </h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-48 bg-gray-200 rounded"
          />
        </div>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'

export default function WebRTCTest() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })

        setStream(mediaStream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error('Error accessing media:', err)
        setError('Failed to access camera and microphone')
      }
    }

    getMedia()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WebRTC Camera Test</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-64 bg-gray-200 rounded-lg"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleMute}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Mute
        </button>

        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Toggle Camera
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Test Results:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ Camera/Microphone access: {stream ? 'Working' : 'Failed'}</li>
          <li>✅ Video element: {localVideoRef.current ? 'Rendered' : 'Not rendered'}</li>
          <li>✅ Audio tracks: {stream?.getAudioTracks().length || 0}</li>
          <li>✅ Video tracks: {stream?.getVideoTracks().length || 0}</li>
        </ul>
      </div>
    </div>
  )
}
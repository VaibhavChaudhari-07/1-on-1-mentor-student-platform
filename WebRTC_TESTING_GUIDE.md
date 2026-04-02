# WebRTC Video Call Testing Guide

## Overview
The 1-on-1 mentor-student platform now includes a complete WebRTC video calling system with the following features:

### Frontend Features ✅
- **getUserMedia**: Access camera and microphone
- **Local Video Display**: Shows user's own video stream
- **Remote Video Display**: Shows peer's video stream
- **Mute Button**: Toggle microphone on/off
- **Camera Toggle**: Turn camera on/off
- **Leave Call**: End the video call
- **Connection Status**: Visual indicators for connection state

### Backend Features ✅
- **WebRTC Signaling**: Socket.io handles offer/answer/ICE candidates
- **Session-Based Rooms**: Uses sessionId as room identifier
- **Role-Based Calling**: Mentor initiates, student responds
- **2-User Limit**: Enforced by session participant limits

## How It Works

### Connection Flow
1. **User joins session** → Socket.io connects to session room
2. **VideoCall component mounts** → Requests camera/microphone access
3. **Mentor creates offer** → Sends WebRTC offer via Socket.io
4. **Student receives offer** → Creates and sends answer
5. **ICE candidates exchanged** → Peer-to-peer connection established
6. **Video streams connected** → Call active

### Signaling Messages
- `webrtc-offer`: SDP offer with sessionId
- `webrtc-answer`: SDP answer with sessionId
- `ice-candidate`: ICE candidates for NAT traversal

## Testing Instructions

### Prerequisites
- Two browser tabs/windows
- Camera and microphone permissions granted
- Backend server running on port 3001
- Frontend server running on port 3002

### Test Steps

1. **Open two browser tabs** to `http://localhost:3002`

2. **Login as different users**:
   - Tab 1: Login as mentor
   - Tab 2: Login as student

3. **Create session** (mentor):
   - Go to dashboard
   - Click "Create Session"
   - Copy session ID

4. **Join session** (student):
   - Go to dashboard
   - Enter session ID and join

5. **Enter session room**:
   - Both users navigate to their respective session rooms
   - Video call should initialize automatically

6. **Test features**:
   - **Video streams**: Both local and remote video should appear
   - **Mute button**: Click to mute/unmute microphone
   - **Camera toggle**: Click to turn camera on/off
   - **Connection status**: Green indicator when connected
   - **End call**: Click to terminate the call

### Expected Behavior

#### Normal Operation
- ✅ Local video shows immediately after permissions granted
- ✅ Remote video appears when peer connects
- ✅ Audio/video controls work instantly
- ✅ Connection status updates in real-time
- ✅ Call ends cleanly when "End Call" clicked

#### Error Handling
- ❌ No camera/microphone: Error message displayed
- ❌ Network issues: Connection status shows "failed"
- ❌ Peer disconnects: Remote video disappears
- ❌ Permission denied: Error message with instructions

### Troubleshooting

#### Common Issues

1. **"Failed to access camera and microphone"**
   - Check browser permissions
   - Ensure camera/microphone not used by other apps
   - Try refreshing the page

2. **Videos not connecting**
   - Check browser console for WebRTC errors
   - Verify both users are in the same session
   - Check network connectivity

3. **Audio/video not working**
   - Check mute/camera toggle states
   - Verify media permissions
   - Test with browser's built-in camera check

#### Debug Information
- Open browser DevTools → Console
- Look for WebRTC-related log messages
- Check Network tab for Socket.io connections
- Monitor connection state changes

### Browser Compatibility
- ✅ Chrome 72+
- ✅ Firefox 68+
- ✅ Safari 12+
- ✅ Edge 79+

### Network Requirements
- WebRTC requires direct peer-to-peer connection
- STUN servers provided for NAT traversal
- TURN servers recommended for production (behind firewalls)

## Code Structure

### Frontend (`VideoCall.tsx`)
```typescript
// Key components:
- useRef hooks for video elements and peer connection
- useState for call state management
- useCallback for WebRTC functions
- Socket.io event handlers for signaling
- Media controls (mute/camera/end call)
```

### Backend (`socketHandler.js`)
```javascript
// WebRTC signaling handlers:
- 'webrtc-offer': Broadcast to session room
- 'webrtc-answer': Broadcast to session room
- 'ice-candidate': Broadcast to session room
```

## Production Considerations

### Security
- Add user authentication checks
- Validate session membership before signaling
- Implement rate limiting for signaling messages

### Performance
- Add TURN servers for firewall traversal
- Implement connection quality monitoring
- Add bandwidth adaptation

### Reliability
- Handle network interruptions gracefully
- Implement reconnection logic
- Add call recording capabilities (optional)

---

**Status**: ✅ **COMPLETE AND TESTED**
The WebRTC video calling system is fully implemented and ready for use!
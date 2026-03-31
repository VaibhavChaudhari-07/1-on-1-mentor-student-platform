# Mentor-Student Platform

A production-ready 1-on-1 mentor-student platform with real-time collaboration, chat, and video calling.

## Features

- **Authentication**: Role-based auth (mentor/student) using Supabase
- **Session Management**: Mentors create sessions, students join via link
- **Real-time Editor**: Collaborative coding with Monaco Editor
- **Chat System**: Real-time messaging between mentor and student
- **Video Calling**: 1-on-1 video calls using WebRTC
- **Only 2 users per session**: Enforced mentor-student pairing

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Monaco Editor
- Socket.io Client

### Backend
- Node.js + Express
- Socket.io (real-time communication)
- MongoDB with Mongoose
- JWT Authentication
- WebRTC signaling

### Database
- MongoDB (local or MongoDB Atlas)

## Authentication

The platform uses JWT-based authentication with role-based access control.

### Setup

1. Set JWT secret in backend `.env`
2. MongoDB connection for user storage
3. Run the MongoDB schema script

### Features

- **Signup**: Users select role (mentor/student) during registration
- **Login**: Standard email/password authentication
- **Protected Routes**: Dashboard requires authentication
- **Session Persistence**: JWT tokens stored in localStorage
- **Middleware**: Server-side route protection

### Pages

- `/login` - Login page
- `/signup` - Signup with role selection
- `/dashboard` - Protected dashboard (redirects based on role)

### Auth Flow

1. Unauthenticated users redirected to `/login`
2. Signup creates user account and profile with role
3. Login persists session and redirects to `/dashboard`
4. Authenticated users cannot access login/signup pages

## Deployment

### Backend
Deploy to services like Heroku, Railway, or Vercel Functions.

### Frontend
Deploy to Vercel or Netlify.

### Database
MongoDB Atlas for cloud deployment or self-hosted MongoDB.

## Architecture

- **Frontend**: React components for UI, Socket.io for real-time features
- **Backend**: Express server with Socket.io for WebSocket connections and WebRTC signaling
- **Database**: MongoDB for user, session, and message data
- **Authentication**: JWT-based auth with role management
- **Real-time**: Socket.io handles editor sync, chat, and WebRTC signaling

## Database Schema

### Collections

#### Users
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: "mentor" | "student",
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Sessions
```javascript
{
  _id: ObjectId,
  mentor_id: ObjectId (ref to users),
  student_id: ObjectId (ref to users, optional),
  status: "active" | "ended",
  title: String,
  createdAt: Date,
  updatedAt: Date,
  ended_at: Date
}
```

#### Messages
```javascript
{
  _id: ObjectId,
  session_id: ObjectId (ref to sessions),
  sender_id: ObjectId (ref to users),
  content: String,
  message_type: "text" | "code" | "system",
  timestamp: Date
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/sessions` - Create session (mentor only)
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/join` - Join session (student only)
- `POST /api/sessions/:id/end` - End session (mentor only)

## Security

- JWT authentication via Supabase
- Row Level Security (RLS) on database tables
- CORS configured for frontend origin
- Input validation on API endpoints

## Development

- Use `npm run dev` for development
- Build with `npm run build`
- Lint with `npm run lint`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
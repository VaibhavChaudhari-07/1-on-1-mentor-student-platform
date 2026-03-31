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
- WebRTC signaling

### Database
- PostgreSQL via Supabase

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Go to Settings > API to get your project URL and anon key
3. Run the SQL schema in `database/schema.sql` in your Supabase SQL editor

### 3. Environment Variables

#### Backend (.env)
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 4. Run the Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Deployment

### Backend
Deploy to services like Heroku, Railway, or Vercel Functions.

### Frontend
Deploy to Vercel or Netlify.

### Database
Supabase handles the database.

## Architecture

- **Frontend**: React components for UI, Socket.io for real-time features
- **Backend**: Express server with Socket.io for WebSocket connections and WebRTC signaling
- **Database**: Supabase for auth and session data
- **Real-time**: Socket.io handles editor sync, chat, and WebRTC signaling

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
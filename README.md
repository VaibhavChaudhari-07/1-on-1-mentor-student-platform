# Mentor-Student Platform

A complete 1-on-1 mentor-student platform with real-time collaboration, chat, and video calling.

## 🚀 Overview

This repository contains a full-stack application for live mentoring sessions. A mentor creates a session and a student joins by link. Both users share:

- 1-on-1 video call (WebRTC)
- Live collaborative code editor (Monaco + Yjs + y-websocket)
- Socket.io chat
- Run code output (JS runtime sandbox in the browser)

## 🧩 Tech Stack

### Frontend
- Next.js 14 (App Router)
- React + functional components
- TypeScript
- Tailwind CSS
- `@monaco-editor/react` (code editor)
- `yjs`, `y-websocket`, `y-monaco` (CRDT real-time sync)
- `socket.io-client` (chat + signaling)
- `next/dynamic` for SSR-safe Monaco loading

### Backend
- Node.js + Express
- `socket.io` (real-time events and WebRTC signaling)
- `ws` + `y-websocket` (CRDT document sync server)
- MongoDB + Mongoose (user/session data)
- JSON Web Tokens (JWT) for auth
- Middleware for protected routes

### Database
- MongoDB (local or Atlas)

## 📁 Repo Structure

- `/frontend` - Next.js app
- `/backend` - Express API + Socket.io + y-websocket server
- `/backend/routes` - API route handlers
- `/backend/controllers` - app logic for sessions and auth
- `/backend/socket` - Socket.io event handlers

## ⚙️ Prerequisites

- Node.js v18+ installed
- npm or yarn
- MongoDB running locally or Atlas URI

## 🔧 Setup

### 1. Backend

1. Copy `.env.example` to `.env` inside `/backend`
2. Set these values:
   - `PORT=3001`
   - `MONGODB_URI=your-mongodb-uri`
   - `JWT_SECRET=your_jwt_secret`
3. Install deps:
   - `cd backend && npm install`
4. Start server:
   - `npm run dev`

### 2. Frontend

1. Copy `.env.example` to `.env.local` inside `/frontend`
2. Set:
   - `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`
3. Install deps:
   - `cd frontend && npm install`
4. Start frontend:
   - `npm run dev`

### 3. Open app

- Visit `http://localhost:3000`
- Signup as mentor or student (students can join existing sessions only)
- Mentor creates a session and shares URL
- Student joins, then both can collaborate

## 📦 Useful npm scripts

### Frontend
- `npm run dev` – start Next.js dev server
- `npm run build` – production build
- `npm run lint` – lint code

### Backend
- `npm run dev` – start Express + Socket.io + y-websocket in dev mode
- `npm run start` – production start

## 🛠️ Features

- Role-based auth (mentor/student)
- Mentors create sessions, students join by session ID URL
- Socket.io 1-on-1 Chat
- Video call with WebRTC (offer/answer + ICE via socket events)
- Collaborative editor using Monaco + Yjs (document shared via y-websocket)
- Run JS code in browser, output console logs
- Mentor can end sessions

## 🧹 .gitignore check

Verified and good:
- Node modules, build artifacts (`/node_modules`, `.next`, `dist`, `build`)
- Env files (`.env*`)
- OS/editor temp files (`.DS_Store`, `.vscode`, etc.)
- Log and cache files

No changes required unless new generated paths are introduced later.

## 🧾 API Endpoints

### Auth
- `POST /api/auth/register` - register new user
- `POST /api/auth/login` - login and get JWT
- `GET /api/auth/me` - get current user

### Sessions
- `POST /api/sessions` - mentor creates session
- `GET /api/sessions/:id` - get session details
- `POST /api/sessions/join` - student joins session
- `POST /api/sessions/end` - mentor ends session

## 🧹 Notes on version-specific implementation

- `y-websocket` server is mounted on backend as `/y-websocket`
- Frontend `Editor` connects to this path using `NEXT_PUBLIC_BACKEND_URL` via ws/wss and binds Monaco text to shared `Y.Doc`
- `page.tsx` handles session loading, role resolution, and Socket.io connection
- `VideoCall` component uses socket for WebRTC signaling and media controls

## 🔍 Troubleshooting

- Ensure MongoDB URI is reachable
- Ensure backend and frontend base URLs match
- Check browser console for socket errors
- Check backend logs for `y-websocket` connections

## ✅ Contribution

1. Fork
2. New branch
3. Implement + test
4. PR with description

---

*This README is now aligned with the repository's actual code and architecture.*
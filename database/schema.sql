-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT CHECK (role IN ('mentor', 'student')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  mentor_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('waiting', 'active', 'ended')) DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies for sessions
CREATE POLICY "Mentors can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = mentor_id);

CREATE POLICY "Students can view sessions they're part of" ON sessions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Mentors can create sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update their sessions" ON sessions
  FOR UPDATE USING (auth.uid() = mentor_id);
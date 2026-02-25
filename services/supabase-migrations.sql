-- Migration for FAI System Setup

-- Create profiles table
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fai table
CREATE TABLE fai (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fai ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY select_profiles ON profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY insert_profiles ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY update_profiles ON profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY delete_profiles ON profiles
FOR DELETE
USING (auth.uid() = id);

-- Create RLS policies for fai
CREATE POLICY select_fai ON fai
FOR SELECT
USING (profile_id = (SELECT id FROM profiles WHERE username = auth.uid()));

CREATE POLICY insert_fai ON fai
FOR INSERT
WITH CHECK (profile_id = (SELECT id FROM profiles WHERE username = auth.uid()));

CREATE POLICY update_fai ON fai
FOR UPDATE
USING (profile_id = (SELECT id FROM profiles WHERE username = auth.uid()));

CREATE POLICY delete_fai ON fai
FOR DELETE
USING (profile_id = (SELECT id FROM profiles WHERE username = auth.uid()));

-- Triggers can be added here as needed.
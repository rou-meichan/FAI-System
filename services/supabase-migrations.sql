-- Migration for FAI System Setup (Resilient Development Version)

-- 0. Cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.fai;
DROP TABLE IF EXISTS public.profiles;

-- 1. Create profiles table
-- Using TEXT for ID to support both real UUIDs and dummy string IDs
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY, 
    name TEXT,
    organization TEXT,
    role TEXT DEFAULT 'SUPPLIER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, organization, role)
  VALUES (
    NEW.id::text, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'organization', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'SUPPLIER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Extremely important: prevent signup failure if profile creation fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Create fai table
-- Using TEXT for user_id to allow dummy data (e.g. 'S1') and real UUIDs
CREATE TABLE public.fai (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT, 
    "supplierName" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "revision" TEXT,
    "timestamp" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "aiAnalysis" JSONB,
    "iqaRemarks" TEXT,
    "isNewVerdict" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fai ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "IQA can view all profiles" ON public.profiles
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'IQA');

CREATE POLICY "Users can update own profile or IQA can update all" ON public.profiles
    FOR UPDATE USING (
        -- Condition A: The user owns the profile
        auth.uid()::text = id 
        OR 
        -- Condition B: The user is an IQA
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'IQA'
    );    

-- 7. RLS Policies for fai table
-- Note: We use auth.uid()::text to match our TEXT user_id

CREATE POLICY "Users can view their own submissions" ON public.fai
    FOR SELECT USING (auth.uid()::text = "user_id");

CREATE POLICY "IQA can view all submissions" ON public.fai
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'IQA'
    );

CREATE POLICY "Users can insert submissions" ON public.fai
    FOR INSERT WITH CHECK (auth.uid()::text = "user_id");

CREATE POLICY "Users can update their own submissions" ON public.fai
    FOR UPDATE USING (auth.uid()::text = "user_id");

CREATE POLICY "IQA can update any submission" ON public.fai
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'IQA'
    );

-- 8. Grants
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.fai FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fai TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.fai TO service_role;

-- 9. Storage Setup
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('fai-artifacts', 'fai-artifacts', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = false WHERE id = 'fai-artifacts';

-- Storage Policies
-- Allow users to view their own files or IQA to view all
CREATE POLICY "Folder Isolation Select" ON storage.objects FOR SELECT USING (
    bucket_id = 'fai-artifacts' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'IQA'
    )
);

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Folder Isolation Insert" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'fai-artifacts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own uploads
CREATE POLICY "Folder Isolation Update" ON storage.objects FOR UPDATE USING (
    bucket_id = 'fai-artifacts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own uploads
CREATE POLICY "Folder Isolation Delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'fai-artifacts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

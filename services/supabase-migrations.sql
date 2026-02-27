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
    id TEXT PRIMARY KEY,
    user_id TEXT, 
    supplierName TEXT NOT NULL,
    partNumber TEXT NOT NULL,
    revision TEXT,
    timestamp BIGINT NOT NULL,
    status TEXT NOT NULL,
    files JSONB NOT NULL DEFAULT '[]',
    aiAnalysis JSONB,
    iqaRemarks TEXT,
    isNewVerdict BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fai ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid()::text = id);

-- 7. RLS Policies for fai table
-- Note: We use auth.uid()::text to match our TEXT user_id

CREATE POLICY "Users can view their own submissions" ON public.fai
    FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "IQA can view all submissions" ON public.fai
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text
            AND role = 'IQA'
        )
    );

CREATE POLICY "Users can insert submissions" ON public.fai
    FOR INSERT WITH CHECK (true); -- Allow inserts, RLS will handle visibility

CREATE POLICY "Users can update their own submissions" ON public.fai
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "IQA can update any submission" ON public.fai
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text
            AND role = 'IQA'
        )
    );

-- 8. Grants
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.fai TO anon, authenticated, service_role;

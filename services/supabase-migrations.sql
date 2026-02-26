-- Final Migration for FAI System Setup
-- Run this in the Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('supplier', 'iqa')) NOT NULL DEFAULT 'supplier',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create fai table
CREATE TABLE public.fai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT CHECK (status IN ('pending_ai', 'ai_reviewing', 'pending_review', 'approved', 'rejected', 'submitted')) NOT NULL DEFAULT 'pending_ai',
  remarks TEXT,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fai ENABLE ROW LEVEL SECURITY;

-- 4. Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. FAI Policies
CREATE POLICY "Suppliers can view own FAIs." ON public.fai
  FOR SELECT USING (
    auth.uid() = supplier_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'iqa')
  );

CREATE POLICY "Suppliers can insert own FAIs." ON public.fai
  FOR INSERT WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "IQA can update FAI status." ON public.fai
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'iqa')
  );

-- 6. Function to handle new user signup and assign role
-- This function will be triggered by Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'role', 'supplier'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger to call the function on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

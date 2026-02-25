import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper types for the database
export type Profile = {
  id: string;
  role: 'supplier' | 'iqa';
  updated_at?: string;
};

export type FAI = {
  id: string;
  supplier_id: string;
  title: string;
  submission_date: string;
  status: 'submitted' | 'approved' | 'rejected';
  remarks?: string;
  created_at?: string;
};

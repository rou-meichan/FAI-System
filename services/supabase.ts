/// <reference types="vite/client" />
// Importing necessary packages
import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';
  
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    // Return a mock client to prevent crashes
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({ limit: async () => ({ data: [], error: null }) }),
          }),
        }),
        insert: () => ({ select: async () => ({ data: null, error: { message: 'Mock client: Insert failed - Supabase not initialized correctly' } }) }),
        update: () => ({ eq: () => ({ select: async () => ({ data: null, error: { message: 'Mock client: Update failed - Supabase not initialized correctly' } }) }) }),
        delete: () => ({ eq: async () => ({ error: { message: 'Mock client: Delete failed - Supabase not initialized correctly' } }) }),
      }),
    };
  }
};

export const supabase = getSupabase();

// Function for signing up a user
export const signUpUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
};

// Function for logging in a user
export const loginUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
};

// Function to insert FAI
export const insertFAI = async (faiData: any) => {
    const { data, error } = await supabase
        .from('fai')
        .insert([faiData])
        .select();
    if (error) throw error;
    return data;
};

// Function to fetch FAIs with RLS policies
export const fetchFAIs = async () => {
    const { data, error } = await supabase
        .from('fai')
        .select('*');
    if (error) throw error;
    return data;
};

/// <reference types="vite/client" />
// Importing necessary packages
import { createClient } from '@supabase/supabase-js';

// Creating the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

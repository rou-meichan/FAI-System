// Importing necessary packages
import { createClient } from '@supabase/supabase-js';

// Creating the Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function for signing up a user
export const signUpUser = async (email, password) => {
    const { user, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return user;
};

// Function for logging in a user
export const loginUser = async (email, password) => {
    const { user, error } = await supabase.auth.signIn({ email, password });
    if (error) throw error;
    return user;
};

// Function to insert FAI
export const insertFAI = async (faiData) => {
    const { data, error } = await supabase
        .from('FAIs')
        .insert([faiData]);
    if (error) throw error;
    return data;
};

// Function to fetch FAIs with RLS policies
export const fetchFAIs = async () => {
    const { data, error } = await supabase
        .from('FAIs')
        .select('*');
    if (error) throw error;
    return data;
};
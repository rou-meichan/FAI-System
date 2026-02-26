import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

console.log('Initializing Supabase with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function for signing up a user
export const signUpUser = async (email: string, password: string, role: 'supplier' | 'iqa' = 'supplier') => {
    console.log('Attempting signup for:', email);
    const { data, error } = await Promise.race([
        supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { role }
            }
        }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Signup request timed out')), 10000))
    ]);
    if (error) throw error;
    return data;
};

// Function for logging in a user
export const loginUser = async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Login request timed out')), 10000))
    ]);
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

// Function to fetch FAIs
export const fetchFAIs = async () => {
    console.log('Fetching FAIs...');
    const { data, error } = await Promise.race([
        supabase
            .from('fai')
            .select('*')
            .order('submission_date', { ascending: false }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Fetch FAIs timed out')), 10000))
    ]);
    if (error) throw error;
    return data;
};

export const updateFAIStatus = async (id: string, status: string, remarks: string) => {
    const { data, error } = await supabase
        .from('fai')
        .update({ status, remarks })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
};

export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
};

// Storage functions
export const uploadFAIFile = async (userId: string, file: File) => {
    const filePath = `${userId}/${file.name}`;
    const { data, error } = await supabase.storage
        .from('fai-documents')
        .upload(filePath, file, {
            upsert: true
        });
    if (error) throw error;
    return data.path;
};

export const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
        .from('fai-documents')
        .createSignedUrl(filePath, 3600); // 1 hour
    if (error) throw error;
    return data.signedUrl;
};

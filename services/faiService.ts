// faiService.ts
import { supabase } from './supabase';

// Insert function for FAI submissions
export const insertFAISubmission = async (submissionData: any) => {
    // Clean up undefined values and strip large base64 data from files
    const cleanData = { ...submissionData };
    delete cleanData.supplierName;
    delete cleanData.profiles;

    // Ensure user_id is present for RLS
    if (!cleanData.user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            cleanData.user_id = user.id;
        } else {
            console.error("User not authenticated, cannot insert submission");
            throw new Error("User not authenticated");
        }
    }

    if (cleanData.files && Array.isArray(cleanData.files)) {
        cleanData.files = cleanData.files.map((f: any) => {
            const { data, url, ...rest } = f;
            return rest;
        });
    }

    const filteredData = Object.fromEntries(
        Object.entries(cleanData).filter(([_, v]) => v !== undefined)
    );

    console.log('Attempting Supabase Insert with data (stripped):', filteredData);
    console.log('User ID for insert:', cleanData.user_id);
    const { data, error } = await supabase
        .from('fai')
        .insert([filteredData])
        .select();
    if (error) {
        console.error('Supabase Insert Error:', error);
        throw error;
    }
    return data;
};

// Fetch function for FAI submissions
export const fetchFAISubmissions = async (userId?: string) => {
    let query = supabase.from('fai').select('*, profiles(organization)');
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Supabase Fetch Error:', error);
        throw error;
    }
    // Map profiles.organization to supplierName for UI compatibility
    return data.map((item: any) => ({
        ...item,
        supplierName: item.profiles?.organization || 'Unknown Entity'
    }));
};

// Update function for FAI submissions
export const updateFAISubmission = async (id: string, updatedData: any) => {
    // Clean up undefined values and strip base64 data
    const cleanData = { ...updatedData };
    delete cleanData.supplierName;
    delete cleanData.profiles;
    if (cleanData.files && Array.isArray(cleanData.files)) {
        cleanData.files = cleanData.files.map((f: any) => {
            const { data, url, ...rest } = f;
            return rest;
        });
    }

    const filteredData = Object.fromEntries(
        Object.entries(cleanData).filter(([_, v]) => v !== undefined)
    );

    console.log(`Attempting Supabase Update for ID ${id} with data (stripped):`, filteredData);
    const { data, error } = await supabase
        .from('fai')
        .update(filteredData)
        .eq('id', id)
        .select();
    if (error) {
        console.error('Supabase Update Error:', error);
        throw error;
    }
    return data;
};

// Delete function for FAI submissions
export const deleteFAISubmission = async (id: string) => {
    const { error } = await supabase
        .from('fai')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// Profile functions
export const fetchProfile = async (id: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

export const updateProfile = async (id: string, updatedData: any) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
};

export const fetchAllProfiles = async (role?: string) => {
    let query = supabase.from('profiles').select('*');
    if (role) {
        query = query.eq('role', role);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
};


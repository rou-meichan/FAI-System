// faiService.ts
import { supabase } from './supabase';

// Insert function for FAI submissions
export const insertFAISubmission = async (submissionData: any) => {
    // Clean up undefined values which can cause Supabase 400 errors
    const cleanData = Object.fromEntries(
        Object.entries(submissionData).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
        .from('fai')
        .insert([cleanData])
        .select();
    if (error) {
        console.error('Supabase Insert Error:', error);
        throw error;
    }
    return data;
};

// Fetch function for FAI submissions
export const fetchFAISubmissions = async (userId?: string) => {
    let query = supabase.from('fai').select('*');
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Supabase Fetch Error:', error);
        throw error;
    }
    return data;
};

// Update function for FAI submissions
export const updateFAISubmission = async (id: string, updatedData: any) => {
    // Clean up undefined values
    const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
        .from('fai')
        .update(cleanData)
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


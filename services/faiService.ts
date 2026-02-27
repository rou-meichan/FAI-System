// faiService.ts
import { supabase } from './supabase';

// Insert function for FAI submissions
export const insertFAISubmission = async (submissionData: any) => {
    const { data, error } = await supabase
        .from('fai')
        .insert([submissionData])
        .select();
    if (error) throw error;
    return data;
};

// Fetch function for FAI submissions
export const fetchFAISubmissions = async (userId?: string) => {
    let query = supabase.from('fai').select('*');
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

// Update function for FAI submissions
export const updateFAISubmission = async (id: string, updatedData: any) => {
    const { data, error } = await supabase
        .from('fai')
        .update(updatedData)
        .eq('id', id)
        .select();
    if (error) throw error;
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


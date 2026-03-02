// faiService.ts
import { supabase } from './supabase';

// Insert function for FAI submissions
export const insertFAISubmission = async (submissionData: any) => {
    // Clean up undefined values and strip large base64 data from files
    const cleanData = { ...submissionData };
    if (cleanData.files && Array.isArray(cleanData.files)) {
        cleanData.files = cleanData.files.map((f: any) => {
            const { data, ...rest } = f;
            return rest;
        });
    }

    const filteredData = Object.fromEntries(
        Object.entries(cleanData).filter(([_, v]) => v !== undefined)
    );

    console.log('Attempting Supabase Insert with data (stripped):', filteredData);
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
    // Clean up undefined values and strip base64 data
    const cleanData = { ...updatedData };
    if (cleanData.files && Array.isArray(cleanData.files)) {
        cleanData.files = cleanData.files.map((f: any) => {
            const { data, ...rest } = f;
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


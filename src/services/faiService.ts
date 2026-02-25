// faiService.ts

import { db } from '../database'; // Assuming a database instance is exported from a database module

// Insert function for FAI submissions
export const insertFAISubmission = async (submissionData) => {
    // Check RLS policies if necessary
    return await db('fai_submissions').insert(submissionData);
};

// Fetch function for FAI submissions
export const fetchFAISubmissions = async (userId) => {
    // Check RLS policies to ensure the user only fetches allowable submissions
    return await db('fai_submissions').where({ user_id: userId }).select();
};

// Update function for FAI submissions
export const updateFAISubmission = async (id, updatedData) => {
    // Check RLS policies if necessary
    return await db('fai_submissions').where({ id }).update(updatedData);
};

// Delete function for FAI submissions
export const deleteFAISubmission = async (id) => {
    // Check RLS policies if necessary
    return await db('fai_submissions').where({ id }).del();
};

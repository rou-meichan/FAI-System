// src/services/authService.ts
import { supabase } from './supabase';

class AuthService {
    async signUp(email: string, password: string, metadata?: any) {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: metadata
            }
        });
        if (error) throw error;
        return data;
    }

    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    }

    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    }
}

export default new AuthService();

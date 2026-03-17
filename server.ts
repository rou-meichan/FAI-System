import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let supabaseAdmin: any = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('MISSING SUPABASE ENVIRONMENT VARIABLES');
    return null;
  }

  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    return supabaseAdmin;
  } catch (err) {
    console.error('Failed to initialize Supabase Admin:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // API Route to check if email exists
  app.post("/api/check-email", async (req, res) => {
    const { email } = req.body;
    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(500).json({ success: false, error: 'Database connection not configured' });
    }
    try {
      const { data, error } = await admin
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      res.json({ exists: !!data });
    } catch (error: any) {
      console.error('Check email error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // API Route for Admin Registration
  app.post("/api/register", async (req, res) => {
    const { email, metadata, redirectTo } = req.body;
    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(500).json({ success: false, error: 'Database connection not configured' });
    }

    try {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: metadata,
        redirectTo: redirectTo
      });

      if (error) throw error;

      // Upsert into profiles table to store extended metadata
      const { error: profileError } = await admin
        .from('profiles')
        .upsert([{
          id: data.user.id,
          name: metadata.name,
          email: email,
          role: metadata.role,
          organization: metadata.organization,
          gender: metadata.gender || null,
          date_of_birth: metadata.date_of_birth || null,
          phone_number: metadata.phone_number || null
        }], { onConflict: 'id' });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      res.json({ success: true, user: data.user });
    } catch (error: any) {
      console.error('Admin registration error:', error);
      const status = error.status === 429 ? 429 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SERVER_READY: Server running on http://0.0.0.0:${PORT}`);
  });
}

console.log('BOOTSTRAP: Starting server initialization...');
startServer().then(() => {
  console.log('BOOTSTRAP: startServer() promise resolved');
}).catch(err => {
  console.error('BOOTSTRAP_ERROR: Failed to start server:', err);
});

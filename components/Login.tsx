
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import authService from '../services/authService';
import { fetchProfile } from '../services/faiService';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = 'SUPPLIER'; // Default role, will be overridden by profile data
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    try {
      const authData = await authService.login(email, password);
      if (authData?.user) {
        let profileData: any = {};
        try {
          profileData = await fetchProfile(authData.user.id);
        } catch (e) {
          console.error('Failed to fetch user profile:', e);
        }

        if (profileData?.status === 'DEACTIVATED') {
          await authService.logout();
          throw new Error('Your account has been deactivated. Please contact the administrator.');
        }

        const userRole = profileData?.role || authData.user.app_metadata?.role || authData.user.user_metadata?.role || role;
        const user: User = {
          id: authData.user.id,
          name: profileData?.name || authData.user.user_metadata?.name || email.split('@')[0],
          email: authData.user.email || email,
          role: userRole,
          organization: profileData?.organization || authData.user.user_metadata?.organization || (userRole === 'SUPPLIER' ? 'ABC Manufacturing' : 'Global IQA Office'),
          createdDate: profileData?.created_at ? new Date(profileData.created_at).getTime() : new Date(authData.user.created_at).getTime(),
          gender: profileData?.gender || authData.user.user_metadata?.gender,
          date_of_birth: profileData?.date_of_birth || authData.user.user_metadata?.date_of_birth,
          phone_number: profileData?.phone_number || authData.user.user_metadata?.phone_number
        };
        onLogin(user);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Handle Supabase rate limit errors (status 429)
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = emailRef.current?.value;
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Check if email exists in the database
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!data.exists) {
        setError('No account found with this email address.');
        return;
      }

      // 2. If exists, send password reset
      await authService.resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Too many reset attempts. Please wait a few minutes before trying again.');
      } else {
        setError(err.message || 'Failed to send reset email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans overflow-hidden">
      <div className="max-w-md w-full py-4">
        <div className="text-center mb-4">
          <div className="inline-flex bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-200 mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">FAI Digital Agent</h1>
          <p className="text-slate-500 text-xs font-medium">Enterprise Quality Assurance Management</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Sign in to your account
            </h2>
            
            {resetSent ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Reset Email Sent</h3>
                <p className="text-xs text-slate-500 font-medium">Please check your inbox for instructions to reset your password.</p>
                <button 
                  onClick={() => setResetSent(false)}
                  className="text-indigo-600 text-xs font-bold uppercase tracking-widest hover:underline"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4 md:space-y-5">
                <div className="space-y-3">
                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-bold text-rose-600 uppercase tracking-tight">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                    <input 
                      type="email" 
                      ref={emailRef}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="abc123@gmail.com"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        ref={passwordRef}
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      Sign In to Dashboard
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Contact IQA Administrator for account access
            </p>
          </div>
        </div>
        
        <p className="mt-6 text-center text-slate-400 text-[10px] font-medium">
          Protected by AES-256 Digital Vault Encryption
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

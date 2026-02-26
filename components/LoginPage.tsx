
import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, signUpUser, resetPassword, supabase } from '../services/supabase';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<'supplier' | 'iqa'>('supplier');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      if (mode === 'LOGIN') {
        console.log('Login successful, fetching profile...');
        const authUser = await loginUser(email, password);
        if (authUser) {
          const { data: profile, error: profileError } = await Promise.race([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Profile fetch timed out')), 5000))
          ]);

          if (profileError) throw profileError;
          
          if (!profile) {
            throw new Error('User profile not found. Please ensure you have completed registration or contact admin.');
          }

          console.log('Profile fetched successfully:', profile.role);

          const user: User = {
            id: authUser.id,
            name: authUser.user_metadata?.name || email.split('@')[0],
            role: profile.role.toUpperCase() as any,
            organization: authUser.user_metadata?.organization || (profile.role === 'supplier' ? 'Supplier Org' : 'IQA Office'),
          };
          onLogin(user);
        }
      } else if (mode === 'SIGNUP') {
        const { user: authUser, session } = await signUpUser(email, password, role);
        
        if (session) {
          // If email confirmation is off, Supabase might return a session immediately
          console.log('Signup successful, session returned. Fetching profile...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser?.id)
            .maybeSingle();

          if (profileError) throw profileError;
          
          if (profile && authUser) {
            const user: User = {
              id: authUser.id,
              name: authUser.user_metadata?.name || email.split('@')[0],
              role: profile.role.toUpperCase() as any,
              organization: authUser.user_metadata?.organization || (profile.role === 'supplier' ? 'Supplier Org' : 'IQA Office'),
            };
            onLogin(user);
            return;
          }
        }
        
        setMessage('Registration successful! You can now sign in with your credentials.');
        setMode('LOGIN');
      } else if (mode === 'FORGOT_PASSWORD') {
        await resetPassword(email);
        setMessage('Password reset link sent! Please check your email.');
        setMode('LOGIN');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication');
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
              {mode === 'LOGIN' ? 'Sign in to your account' : 
               mode === 'SIGNUP' ? 'Create a new account' : 
               'Reset your password'}
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div className="space-y-3">
                {mode === 'SIGNUP' && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setRole('supplier')}
                        className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                          role === 'supplier' 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        Supplier
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('iqa')}
                        className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                          role === 'iqa' 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        IQA Office
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                        placeholder="John Doe"
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Work Email</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="name@company.com"
                  />
                </div>

                {mode !== 'FORGOT_PASSWORD' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                )}
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
                    {mode === 'LOGIN' ? 'Sign In to Dashboard' : 
                     mode === 'SIGNUP' ? 'Create Account' : 
                     'Send Reset Link'}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-2 text-center">
              {mode === 'LOGIN' ? (
                <>
                  <button 
                    onClick={() => setMode('SIGNUP')}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Don't have an account? Sign Up
                  </button>
                  <button 
                    onClick={() => setMode('FORGOT_PASSWORD')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setMode('LOGIN')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Back to Login
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium">Protected by AES-256 Digital Vault Encryption</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

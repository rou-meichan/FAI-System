
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>('SUPPLIER');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const user: User = {
        id: role === 'SUPPLIER' ? 'U-8821' : 'U-1102',
        name: role === 'SUPPLIER' ? 'John Supplier' : 'Sarah Inspector',
        role: role,
        organization: role === 'SUPPLIER' ? 'ABC Manufacturing' : 'Global IQA Office',
      };
      onLogin(user);
      setIsLoading(false);
    }, 800);
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
            <h2 className="text-lg font-bold text-slate-900 mb-4">Sign in to your account</h2>
            
            <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Portal Access</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('SUPPLIER')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                      role === 'SUPPLIER' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    Supplier
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('IQA')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                      role === 'IQA' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    IQA Office
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Work Email</label>
                  <input 
                    type="email" 
                    defaultValue={role === 'SUPPLIER' ? 'admin@abcmfg.com' : 'inspector@iqa.gov'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <input 
                    type="password" 
                    defaultValue="password"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
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
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium">Protected by AES-256 Digital Vault Encryption</p>
          </div>
        </div>
        
        <p className="mt-6 text-center text-slate-400 text-[10px] font-medium">
          Forgot your credentials? <a href="#" className="text-indigo-600 hover:underline">Contact System Admin</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

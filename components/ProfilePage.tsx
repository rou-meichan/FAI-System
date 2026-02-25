
import React, { useState } from 'react';
import { User } from '../types';

interface ProfilePageProps {
  user: User;
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack }) => {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [errors, setErrors] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!minLength) return 'Min 8 characters required';
    if (!hasUpper) return 'Upper case missing';
    if (!hasLower) return 'Lower case missing';
    if (!hasNumber) return 'Numeric digit missing';
    if (!hasSpecial) return 'Special symbol missing';
    
    return null;
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = { current: '', new: '', confirm: '' };
    let hasError = false;

    if (!passwords.current) {
      newErrors.current = 'Authentication required';
      hasError = true;
    }

    const complexityError = validatePassword(passwords.new);
    if (complexityError) {
      newErrors.new = complexityError;
      hasError = true;
    }

    if (passwords.new !== passwords.confirm) {
      newErrors.confirm = 'Security mismatch: non-matching';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }
    
    setIsUpdating(true);
    setErrors({ current: '', new: '', confirm: '' });

    setTimeout(() => {
      setIsUpdating(false);
      setShowSuccess(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1200);
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileUpdating(true);
    setTimeout(() => {
      setIsProfileUpdating(false);
      setShowProfileSuccess(true);
      setTimeout(() => setShowProfileSuccess(false), 3000);
    }, 1000);
  };

  const updatePasswordState = (field: keyof typeof passwords, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const passwordRequirements = [
    { label: '8+ Characters', met: passwords.new.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(passwords.new) },
    { label: 'Lowercase', met: /[a-z]/.test(passwords.new) },
    { label: 'Digit (0-9)', met: /[0-9]/.test(passwords.new) },
    { label: 'Special Symbol', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwords.new) }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 hover:bg-slate-200 rounded-full transition-all text-slate-600 active:scale-90">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Identity Management</h1>
          <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Configure profile artifacts and secure credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
        {/* Profile Card Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden group">
            <div className="h-28 bg-slate-900 relative overflow-hidden">
               <div className="absolute inset-0 bg-indigo-600 opacity-20 group-hover:opacity-30 transition-opacity"></div>
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
            </div>
            <div className="px-6 pb-8 -mt-12 text-center relative z-10">
              <div className="w-24 h-24 rounded-3xl bg-white p-1.5 mx-auto shadow-2xl transition-transform group-hover:scale-105 duration-500">
                <div className="w-full h-full rounded-[1.25rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black border-4 border-slate-50">
                  {user.name[0]}
                </div>
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-900 tracking-tight leading-tight uppercase">{user.name}</h2>
              <div className="mt-2 flex justify-center items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role} Authority</p>
              </div>
            </div>
            <div className="border-t border-slate-50 p-6 space-y-4 bg-slate-50/30">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-black uppercase tracking-[0.15em]">Registry ID</span>
                <span className="text-slate-900 font-black bg-white px-2 py-0.5 rounded-md border border-slate-200">{user.id}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-black uppercase tracking-[0.15em]">Organization</span>
                <span className="text-slate-900 font-black truncate ml-4 text-right">{user.organization}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Security Audit</h3>
             </div>
             <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                All profile modifications are immutable and recorded in the system governance logs for compliance review.
             </p>
          </div>
        </div>

        {/* Form Area */}
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          {/* Identity Information Card */}
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rounded-full opacity-50"></div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                Profile Artifacts
              </h3>
              {showProfileSuccess && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                  Profile Synchronized
                </span>
              )}
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Full Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      defaultValue={user.name}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-sm shadow-inner"
                    />
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    Primary Correspondence
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </label>
                  <input 
                    type="email" 
                    readOnly
                    defaultValue={user.role === 'SUPPLIER' ? 'admin@abcmfg.com' : 'inspector@iqa.gov'}
                    className="w-full px-4 py-3 bg-slate-100/60 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-inner cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Designation</label>
                  <input 
                    type="text" 
                    defaultValue={user.role === 'SUPPLIER' ? 'Lead Supply Manager' : 'Senior Quality Auditor'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telecommunications</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-sm shadow-inner"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-6 border-t border-slate-50">
                 <button 
                  type="submit"
                  disabled={isProfileUpdating}
                  className="bg-slate-900 text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-100 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                 >
                   {isProfileUpdating ? 'Synchronizing...' : 'Update Information'}
                 </button>
              </div>
            </form>
          </div>

          {/* Security & Access Credentials Card */}
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                Access Credentials
              </h3>
              {showSuccess && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                  Credentials Updated
                </span>
              )}
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              {/* Fields Column */}
              <div className="lg:col-span-3 space-y-5">
                <div className="space-y-2">
                  <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${errors.current ? 'text-rose-500' : 'text-slate-400'}`}>Current Authorization Key</label>
                  <input 
                    type="password" 
                    value={passwords.current}
                    onChange={e => updatePasswordState('current', e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${
                      errors.current ? 'border-rose-500 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                    }`}
                  />
                  {errors.current && <p className="text-[9px] font-black text-rose-500 uppercase mt-1.5 ml-1">{errors.current}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${errors.new ? 'text-rose-500' : 'text-slate-400'}`}>New Credential</label>
                    <input 
                      type="password" 
                      value={passwords.new}
                      onChange={e => updatePasswordState('new', e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${
                        errors.new ? 'border-rose-500 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${errors.confirm ? 'text-rose-500' : 'text-slate-400'}`}>Verification</label>
                    <input 
                      type="password" 
                      value={passwords.confirm}
                      onChange={e => updatePasswordState('confirm', e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${
                        errors.confirm ? 'border-rose-500 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                      }`}
                    />
                  </div>
                </div>

                {errors.new && <p className="text-[9px] font-black text-rose-500 uppercase mt-1 ml-1">{errors.new}</p>}
                {errors.confirm && !errors.new && <p className="text-[9px] font-black text-rose-500 uppercase mt-1 ml-1">{errors.confirm}</p>}

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-100 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? 'Re-Keying...' : 'Update Authorization'}
                  </button>
                </div>
              </div>

              {/* Policy Column */}
              <div className="lg:col-span-2">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Compliance</p>
                  </div>
                  <div className="space-y-4">
                    {passwordRequirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${req.met ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${req.met ? 'text-emerald-700' : 'text-slate-400'}`}>{req.label}</span>
                        {req.met && (
                          <svg className="w-3 h-3 text-emerald-500 ml-auto animate-in zoom-in-50 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto pt-6">
                    <p className="text-[8px] font-bold text-slate-400 leading-relaxed uppercase">
                      Changes affect all linked terminal access points.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

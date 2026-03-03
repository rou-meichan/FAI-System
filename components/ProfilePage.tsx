
import React, { useState } from 'react';
import { User } from '../types';
import { updateProfile } from '../services/faiService';

interface ProfilePageProps {
  user: User;
  onBack: () => void;
  onUpdate: (updates: Partial<User>) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack, onUpdate }) => {
  const [profileData, setProfileData] = useState({
    name: user.name,
    gender: user.gender || '',
    date_of_birth: user.date_of_birth || '',
    phone_number: user.phone_number || ''
  });
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
  const [profileError, setProfileError] = useState<string | null>(null);
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

  const validateName = (name: string) => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (/^-?\d+$/.test(name.trim())) return 'Name cannot be only digits';
    return null;
  };

  const validateDOB = (dob: string) => {
    if (!dob) return 'Date of Birth is required';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) return 'User must be at least 18 years old';
    return null;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) return 'Phone number must be 10-11 digits';
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    let formatted = value;
    if (value.length > 3) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    }
    setProfileData(prev => ({ ...prev, phone_number: formatted }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const nameErr = validateName(profileData.name);
    if (nameErr) { setProfileError(nameErr); return; }

    const dobErr = validateDOB(profileData.date_of_birth);
    if (dobErr) { setProfileError(dobErr); return; }

    const phoneErr = validatePhone(profileData.phone_number);
    if (phoneErr) { setProfileError(phoneErr); return; }

    setIsProfileUpdating(true);
    try {
      await updateProfile(user.id, profileData);
      onUpdate(profileData);
      setShowProfileSuccess(true);
      setTimeout(() => setShowProfileSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsProfileUpdating(false);
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">My Profile</h1>
            <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Personal identity and security management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 self-start">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="h-20 bg-indigo-600"></div>
            <div className="px-6 pb-6 -mt-10 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white p-1 mx-auto shadow-lg">
                <div className="w-full h-full rounded-xl flex items-center justify-center text-2xl font-black border-4 border-white bg-indigo-100 text-indigo-600">
                  {user.name[0]}
                </div>
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-900 tracking-tight leading-tight">{user.name}</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{user.role} Authority</p>
              <div className="mt-4 flex justify-center gap-2">
                 <span className="px-2 py-0.5 text-[8px] font-black rounded-full border uppercase tracking-wider bg-emerald-50 text-emerald-600 border-emerald-100">
                   Authorized Access
                 </span>
              </div>
            </div>
            <div className="border-t border-slate-50 p-6 space-y-3">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 font-black uppercase tracking-widest">Registry ID</span>
                <span className="text-slate-700 font-black uppercase truncate ml-4">{user.id}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 font-black uppercase tracking-widest">Enrolled On</span>
                <span className="text-slate-700 font-black uppercase truncate ml-4">{new Date(user.createdDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3">Security Audit</h3>
            <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight">
              All profile modifications are recorded in the central compliance ledger for governance review.
            </p>
          </div>
        </div>

        {/* Main Area */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
                Identity Information
              </h3>
              <div className="flex items-center gap-3">
                {profileError && (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 animate-in fade-in slide-in-from-right-2 duration-300">
                    {profileError}
                  </span>
                )}
                {showProfileSuccess && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                    Profile Updated
                  </span>
                )}
              </div>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profileData.name}
                    onChange={e => setProfileData({...profileData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-xs shadow-inner"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    readOnly
                    defaultValue={user.email}
                    className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                  <select
                    value={profileData.gender}
                    onChange={e => setProfileData({...profileData, gender: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none font-bold text-xs shadow-inner"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={profileData.date_of_birth}
                    onChange={e => setProfileData({...profileData, date_of_birth: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none font-bold text-xs shadow-inner"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profileData.phone_number}
                    onChange={handlePhoneChange}
                    placeholder="011-12345678"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-xs shadow-inner"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization</label>
                  <input 
                    type="text" 
                    readOnly
                    defaultValue={user.organization}
                    className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-50">
                <button 
                  type="submit"
                  disabled={isProfileUpdating}
                  className="bg-slate-900 text-white px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProfileUpdating ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <span className="w-1.5 h-5 bg-rose-500 rounded-full"></span>
                Access Credentials
              </h3>
              {showSuccess && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                  Credentials Updated
                </span>
              )}
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-4">
                <div className="space-y-1">
                  <label className={`block text-[9px] font-black uppercase tracking-widest ml-1 ${errors.current ? 'text-rose-500' : 'text-slate-400'}`}>Current Authorization Key</label>
                  <input 
                    type="password" 
                    value={passwords.current}
                    onChange={e => updatePasswordState('current', e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                      errors.current ? 'border-rose-500 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                    }`}
                  />
                  {errors.current && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{errors.current}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={`block text-[9px] font-black uppercase tracking-widest ml-1 ${errors.new ? 'text-rose-500' : 'text-slate-400'}`}>New Credential</label>
                    <input 
                      type="password" 
                      value={passwords.new}
                      onChange={e => updatePasswordState('new', e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                        errors.new ? 'border-rose-500 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`block text-[9px] font-black uppercase tracking-widest ml-1 ${errors.confirm ? 'text-rose-500' : 'text-slate-400'}`}>Verification</label>
                    <input 
                      type="password" 
                      value={passwords.confirm}
                      onChange={e => updatePasswordState('confirm', e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                        errors.confirm ? 'border-rose-500 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                      }`}
                    />
                  </div>
                </div>

                {errors.new && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{errors.new}</p>}
                {errors.confirm && !errors.new && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{errors.confirm}</p>}

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? 'Re-Keying...' : 'Update Authorization'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 h-full flex flex-col">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-200/50">Protocol Compliance</p>
                  <div className="space-y-2.5">
                    {passwordRequirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${req.met ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${req.met ? 'text-emerald-700' : 'text-slate-400'}`}>{req.label}</span>
                      </div>
                    ))}
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

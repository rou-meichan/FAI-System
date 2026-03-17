import React, { useState } from 'react';

interface RegistrationPageProps {
  type: 'SUPPLIER' | 'IQA';
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ type, onBack, onSubmit }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    extra: type === 'IQA' ? 'Vitrox Technologies Sdn. Bhd.' : '', 
    gender: '',
    dob: '',
    phone: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateName = (name: string) => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (/^-?\d+$/.test(name.trim())) return 'Name cannot be only digits';
    return null;
  };

  const validateCompany = (name: string) => {
    const label = type === 'SUPPLIER' ? 'Company Name' : 'Organization';
    if (name.trim().length < 3) return `${label} must be at least 3 characters`;
    if (/^-?\d+$/.test(name.trim())) return `${label} cannot be only digits`;
    return null;
  };

  const validateDOB = (dob: string) => {
    if (!dob) return null;
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
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) return 'Phone number must be 10-11 digits';
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 11) value = value.slice(0, 11);
    
    let formatted = value;
    if (value.length > 3) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    }
    
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameError = validateName(formData.name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const companyError = validateCompany(formData.extra);
    if (companyError) {
      setError(companyError);
      return;
    }

    const dobError = validateDOB(formData.dob);
    if (dobError) {
      setError(dobError);
      return;
    }

    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setIsProcessing(true);
    
    try {
      const metadata = {
        name: formData.name,
        role: type,
        organization: formData.extra,
        gender: formData.gender,
        date_of_birth: formData.dob,
        phone_number: formData.phone
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          metadata,
          redirectTo: window.location.origin + '/reset-password?type=invite'
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      const payload = {
        name: formData.name,
        email: formData.email,
        [type === 'SUPPLIER' ? 'organization' : 'role']: formData.extra,
        gender: formData.gender,
        date_of_birth: formData.dob,
        phone_number: formData.phone
      };
      
      setIsProcessing(false);
      setShowSuccess(true);
      
      // Navigate back after success animation
      setTimeout(() => onSubmit(payload), 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Too many registration attempts. Please wait a few minutes before trying again.');
      } else {
        setError(err.message || 'Failed to authorize identity. Please try again.');
      }
      setIsProcessing(false);
    }
  };

  const extraLabel = type === 'SUPPLIER' ? 'Company Name' : 'Organization';
  const extraPlaceholder = type === 'SUPPLIER' ? 'e.g. ABC Sdn. Bhd.' : 'Vitrox Technologies Sdn. Bhd.';

  // Unified accent colors to match the system theme for both Supplier and Employee registration
  const buttonBg = 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100';
  const focusRing = 'focus:ring-indigo-50 focus:border-indigo-400';
  
  // Unified Success state colors
  const successIconBg = 'bg-indigo-50 border-indigo-100';
  const successIconText = 'text-indigo-500';
  const successDotBg = 'bg-indigo-400';

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-500">
        <div className="text-center p-8 md:p-12 bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-sm w-full mx-4 md:mx-0">
          <div className={`w-20 h-20 ${successIconBg} ${successIconText} rounded-3xl flex items-center justify-center mx-auto mb-8 border shadow-inner`}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Invitation Sent</h2>
          <p className="text-slate-500 mt-2 text-[10px] font-black uppercase tracking-widest leading-tight px-4">An invitation email has been sent to the user to set their password.</p>
          <div className="mt-8 flex justify-center">
            <div className="flex gap-1.5">
              <div className={`w-2 h-2 ${successDotBg} rounded-full animate-bounce delay-75`}></div>
              <div className={`w-2 h-2 ${successDotBg} rounded-full animate-bounce delay-150`}></div>
              <div className={`w-2 h-2 ${successDotBg} rounded-full animate-bounce delay-225`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg md:rounded-xl transition-all text-slate-600 active:scale-95 shrink-0 border border-slate-100"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{type} Registration</h1>
            <p className="text-slate-500 font-medium text-[9px] md:text-xs mt-1">Invite a new user to join the platform</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-5 md:p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-bold text-rose-600 uppercase tracking-tight">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                required
                type="email" 
                placeholder="name@organization.com"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs md:text-sm shadow-inner focus:ring-4 ${focusRing}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="Alexander Pierce"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs md:text-sm shadow-inner focus:ring-4 ${focusRing}`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{extraLabel}</label>
                <input 
                  required
                  type="text" 
                  disabled={type === 'IQA'}
                  placeholder={extraPlaceholder}
                  value={formData.extra}
                  onChange={e => setFormData(prev => ({ ...prev, extra: e.target.value }))}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs md:text-sm shadow-inner focus:ring-4 ${focusRing} ${type === 'IQA' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                <select 
                  value={formData.gender}
                  onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs md:text-sm shadow-inner focus:ring-4 ${focusRing}`}
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
                  value={formData.dob}
                  onChange={e => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs md:text-sm shadow-inner focus:ring-4 ${focusRing}`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input 
                type="tel" 
                placeholder="011-12345678"
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs md:text-sm shadow-inner focus:ring-4 ${focusRing}`}
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button 
                type="submit"
                disabled={isProcessing}
                className={`flex-1 px-8 py-3 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 ${buttonBg}`}
              >
                {isProcessing ? 'Processing...' : 'Send Invitation'}
              </button>
              <button 
                type="button"
                onClick={onBack}
                className="flex-1 px-8 py-3 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] uppercase tracking-widest shadow-sm transition-all hover:bg-slate-200 active:scale-95 border border-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;

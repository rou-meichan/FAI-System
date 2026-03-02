import React, { useState } from 'react';

interface RegistrationPageProps {
  type: 'SUPPLIER' | 'EMPLOYEE';
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ type, onBack, onSubmit }) => {
  const [formData, setFormData] = useState({ name: '', email: '', extra: '', password: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    try {
      const metadata = {
        name: formData.name,
        role: type,
        organization: type === 'SUPPLIER' ? formData.extra : 'Global IQA Office',
        designation: type === 'EMPLOYEE' ? formData.extra : undefined
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          metadata
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      const payload = {
        name: formData.name,
        email: formData.email,
        [type === 'SUPPLIER' ? 'organization' : 'role']: formData.extra
      };
      
      setIsProcessing(false);
      setShowSuccess(true);
      
      // Navigate back after success animation
      setTimeout(() => onSubmit(payload), 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to authorize identity. Please try again.');
      setIsProcessing(false);
    }
  };

  const extraLabel = type === 'SUPPLIER' ? 'Corporate Entity' : 'Authorized Designation';
  const extraPlaceholder = type === 'SUPPLIER' ? 'e.g. Apex Manufacturing' : 'e.g. Senior Auditor';

  // Unified accent colors to match the system theme for both Supplier and Employee registration
  const accentBg = 'bg-indigo-500';
  const buttonBg = 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100';
  const focusRing = 'focus:ring-indigo-50 focus:border-indigo-400';
  
  // Unified Success state colors
  const successIconBg = 'bg-indigo-50 border-indigo-100';
  const successIconText = 'text-indigo-500';
  const successDotBg = 'bg-indigo-400';

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-500">
        <div className="text-center p-12 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-sm w-full">
          <div className={`w-20 h-20 ${successIconBg} ${successIconText} rounded-3xl flex items-center justify-center mx-auto mb-8 border shadow-inner`}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Registration Confirmed</h2>
          <p className="text-slate-500 mt-2 text-[10px] font-black uppercase tracking-widest leading-tight px-4">The identity records have been synchronized with the master vault.</p>
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
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack} 
          className="p-2.5 hover:bg-slate-200 rounded-full transition-all text-slate-600 active:scale-90"
          aria-label="Back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{type} Account Registration</h1>
          <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Register new {type.toLowerCase()} access credentials</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full min-h-[500px]">
          {/* Accent Side - Unified Theme Color */}
          <div className={`md:col-span-2 p-10 flex flex-col justify-between relative overflow-hidden text-white ${accentBg}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 -ml-12 -mb-12 rounded-full blur-xl"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 border border-white/20 backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight leading-tight">Account Registration</h2>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-2 leading-tight">Registry Entry Type: {type}</p>
            </div>

            <div className="relative z-10 pt-10">
              <p className="text-[10px] font-bold text-white/70 leading-relaxed uppercase tracking-widest italic">
                Encryption active. Records are verified against central registry standards.
              </p>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-3 p-8 md:p-12 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] font-bold text-rose-600 uppercase tracking-tight">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Alexander Pierce"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner focus:ring-4 ${focusRing}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Correspondence</label>
                <input 
                  required
                  type="email" 
                  placeholder="name@organization.com"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner focus:ring-4 ${focusRing}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{extraLabel}</label>
                <input 
                  required
                  type="text" 
                  placeholder={extraPlaceholder}
                  value={formData.extra}
                  onChange={e => setFormData(prev => ({ ...prev, extra: e.target.value }))}
                  className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner focus:ring-4 ${focusRing}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label>
                <input 
                  required
                  type="password" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner focus:ring-4 ${focusRing}`}
                />
              </div>

              <div className="pt-8 flex flex-col sm:flex-row gap-4">
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 ${buttonBg}`}
                >
                  {isProcessing ? 'Processing Data...' : 'Authorize Identity'}
                </button>
                <button 
                  type="button"
                  onClick={onBack}
                  className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
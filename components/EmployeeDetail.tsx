import React, { useState, useEffect } from 'react';
import { EmployeeAccount } from '../types';

interface EmployeeDetailProps {
  employee: EmployeeAccount;
  initialEditMode?: boolean;
  onBack: () => void;
  onToggleStatus: (id: string) => void;
  onUpdate: (id: string, updates: Partial<EmployeeAccount>) => void;
}

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({ 
  employee, 
  initialEditMode = false,
  onBack, 
  onToggleStatus, 
  onUpdate 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: employee.name,
    gender: employee.gender || '',
    date_of_birth: employee.date_of_birth || '',
    phone_number: employee.phone_number || ''
  });

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  const validateName = (name: string) => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (/^-?\d+$/.test(name.trim())) return 'Name cannot be only digits';
    return null;
  };

  const validateDOB = (dob: string) => {
    if (!dob) return null; // Optional
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
    if (!phone) return null; // Optional
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
    setFormData(prev => ({ ...prev, phone_number: formatted }));
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const nameErr = validateName(formData.name);
    if (nameErr) newErrors.name = nameErr;

    const dobErr = validateDOB(formData.date_of_birth);
    if (dobErr) newErrors.date_of_birth = dobErr;

    const phoneErr = validatePhone(formData.phone_number);
    if (phoneErr) newErrors.phone_number = phoneErr;

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setIsUpdating(true);
    
    // Simulate API delay
    setTimeout(() => {
      onUpdate(employee.id, formData);
      setIsUpdating(false);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
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
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">IQA Personnel Profile</h1>
            <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Administrative view and identity management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className={`h-20 ${employee.status === 'ACTIVE' ? 'bg-indigo-600' : 'bg-slate-400'}`}></div>
            <div className="px-6 pb-6 -mt-10 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white p-1 mx-auto shadow-lg">
                <div className={`w-full h-full rounded-xl flex items-center justify-center text-2xl font-black border-4 border-white ${
                  employee.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {employee.name[0]}
                </div>
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-900 tracking-tight leading-tight">{employee.name}</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{employee.role}</p>
              <div className="mt-4 flex justify-center gap-2">
                 <span className={`px-2 py-0.5 text-[8px] font-black rounded-full border uppercase tracking-wider ${
                   employee.status === 'ACTIVE' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                 }`}>
                   {employee.status === 'ACTIVE' ? 'Authorized Access' : 'Access Revoked'}
                 </span>
              </div>
            </div>
            <div className="border-t border-slate-50 p-6 space-y-3">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Personnel ID</span>
                  <span className="text-slate-700 font-black uppercase truncate ml-4">{employee.id}</span>
                </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 font-black uppercase tracking-widest">Enrolled On</span>
                <span className="text-slate-700 font-black uppercase">{new Date(employee.createdDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3">Audit Governance</h3>
            <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight">
              All administrative changes to this personnel file are recorded in the central compliance ledger.
            </p>
          </div>
        </div>

        {/* Main Area */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
                {isEditing ? 'Modify Personnel Records' : 'Identity Information'}
              </h3>
              <div className="flex items-center gap-3">
                {showSuccess && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                    Profile Updated
                  </span>
                )}
              </div>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    readOnly={!isEditing}
                    value={formData.name}
                    onChange={e => {
                      setFormData({...formData, name: e.target.value});
                      if (fieldErrors.name) setFieldErrors(prev => ({...prev, name: ''}));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                      isEditing ? 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600' : 'bg-slate-100/50 border border-transparent cursor-not-allowed text-slate-500'
                    } ${fieldErrors.name ? 'border-rose-300 ring-4 ring-rose-50' : ''}`}
                  />
                  {fieldErrors.name && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    readOnly
                    defaultValue={employee.email}
                    className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                  {isEditing ? (
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none font-bold text-xs shadow-inner"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      readOnly
                      value={employee.gender || 'N/A'}
                      className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                  {isEditing ? (
                    <div className="space-y-1">
                      <input 
                        type="date" 
                        value={formData.date_of_birth}
                        onChange={e => {
                          setFormData({...formData, date_of_birth: e.target.value});
                          if (fieldErrors.date_of_birth) setFieldErrors(prev => ({...prev, date_of_birth: ''}));
                        }}
                        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none font-bold text-xs shadow-inner ${fieldErrors.date_of_birth ? 'border-rose-300 ring-4 ring-rose-50' : ''}`}
                      />
                      {fieldErrors.date_of_birth && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{fieldErrors.date_of_birth}</p>}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      readOnly
                      value={employee.date_of_birth || 'N/A'}
                      className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    readOnly={!isEditing}
                    value={formData.phone_number}
                    onChange={e => {
                      handlePhoneChange(e);
                      if (fieldErrors.phone_number) setFieldErrors(prev => ({...prev, phone_number: ''}));
                    }}
                    placeholder="e.g., 011-12345678"
                    className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                      isEditing ? 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600' : 'bg-slate-100/50 border border-transparent cursor-not-allowed text-slate-500'
                    } ${fieldErrors.phone_number ? 'border-rose-300 ring-4 ring-rose-50' : ''}`}
                  />
                  {fieldErrors.phone_number && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{fieldErrors.phone_number}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization</label>
                  <input 
                    type="text" 
                    readOnly
                    value={employee.organization || 'Unknown'}
                    className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                  />
                </div>
              </div>
              
              {/* Bottom save button removed and moved to top right */}
              <div className="pt-6 border-t border-slate-50 flex flex-col sm:flex-row gap-3">
                {isEditing ? (
                  <>
                    <button 
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 px-8 py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest active:scale-95 disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFieldErrors({});
                      }}
                      className="flex-1 px-8 py-3 bg-slate-100 rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] text-slate-600 hover:bg-slate-200 transition-all uppercase tracking-widest active:scale-95"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsEditing(true);
                      }}
                      className="flex-1 px-8 py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm uppercase tracking-widest"
                    >
                      Edit Profile
                    </button>
                    <button 
                      type="button"
                      onClick={onBack}
                      className="flex-1 px-8 py-3 bg-slate-100 rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] text-slate-600 hover:bg-slate-200 transition-all uppercase tracking-widest active:scale-95"
                    >
                      Back to Dashboard
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-sm md:text-base font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
              <span className="w-1.5 h-5 bg-rose-500 rounded-full"></span>
              Security & Access Control
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Access Status</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${employee.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <p className="text-xs font-bold text-slate-700 uppercase">
                      Current: {employee.status === 'ACTIVE' ? 'Account Active' : 'Account Suspended'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => onToggleStatus(employee.id)}
                    className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                      employee.status === 'ACTIVE' 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                    }`}
                  >
                    {employee.status === 'ACTIVE' ? 'Suspend Personnel Access' : 'Reactivate Personnel Access'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 h-full">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-200/50">Permitted Systems</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Artifact Validation', active: employee.status === 'ACTIVE' },
                      { label: 'Audit Sign-off', active: employee.status === 'ACTIVE' },
                      { label: 'Account Mgmt', active: employee.status === 'ACTIVE' && employee.role.includes('Lead') },
                      { label: 'Cloud Ledger', active: employee.status === 'ACTIVE' }
                    ].map((sys, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${sys.active ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${sys.active ? 'text-slate-700' : 'text-slate-400'}`}>{sys.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;

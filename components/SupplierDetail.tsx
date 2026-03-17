
import React, { useState, useMemo, useEffect } from 'react';
import { SupplierAccount, FAISubmission } from '../types';
import { fetchProfile, updateProfile } from '../services/faiService';
import { StatusBadge } from './IQADashboard';

interface SupplierDetailProps {
  supplier: SupplierAccount;
  submissions: FAISubmission[];
  initialEditMode?: boolean;
  onBack: () => void;
  onToggleStatus: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SupplierAccount>) => void;
  onDelete: (id: string) => void;
  onViewSubmission: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

const SupplierDetail: React.FC<SupplierDetailProps> = ({ 
  supplier, 
  submissions, 
  initialEditMode = false,
  onBack, 
  onToggleStatus, 
  onUpdate,
  onDelete,
  onViewSubmission
}) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editData, setEditData] = useState({
    name: supplier.name,
    organization: supplier.organization,
    gender: supplier.gender || '',
    date_of_birth: supplier.date_of_birth || '',
    phone_number: supplier.phone_number || '',
    max_upload_size: 1 * 1024 * 1024 // Default
  });

  // SupplierLimitEditor state
  const [inputValue, setInputValue] = useState<string>('');
  const [limitError, setLimitError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadLimit = async () => {
      try {
        const profile = await fetchProfile(supplier.id);
        if (profile) {
          const limitBytes = profile.max_upload_size || 2 * 1024 * 1024;
          setEditData(prev => ({
            ...prev,
            max_upload_size: limitBytes
          }));
          setInputValue((limitBytes / (1024 * 1024)).toString());
        }
      } catch (error) {
        console.error('Failed to load supplier limit:', error);
      }
    };
    loadLimit();
  }, [supplier.id]);

  // Sync internal edit state with prop changes
  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  const supplierSubmissions = useMemo(() => 
    submissions.filter(s => {
      const matchesSupplier = s.supplierName === supplier.organization;
      
      const dateStr = new Date(s.lastUpdated || s.created_at || Date.now()).toLocaleDateString(undefined, { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).toLowerCase();

      const statusLabels: Record<string, string> = {
        'DRAFT': 'Draft',
        'AI_REVIEWING': 'AI Processing',
        'PENDING_REVIEW': 'Needs Review',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected'
      };
      const statusLabel = (statusLabels[s.status] || s.status).toLowerCase();

      const query = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        s.partName.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        dateStr.includes(query) ||
        statusLabel.includes(query);
        
      return matchesSupplier && matchesSearch;
    })
      .sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return dateB - dateA;
      }),
    [submissions, supplier.organization, searchTerm]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const approvedCount = supplierSubmissions.filter(s => s.status === 'APPROVED').length;
  const approvalRate = supplierSubmissions.length > 0 
    ? Math.round((approvedCount / supplierSubmissions.length) * 100) 
    : 0;

  const totalPages = Math.ceil(supplierSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return supplierSubmissions.slice(start, start + ITEMS_PER_PAGE);
  }, [supplierSubmissions, currentPage]);

  const validateName = (name: string) => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (/^-?\d+$/.test(name.trim())) return 'Name cannot be only digits';
    return null;
  };

  const validateCompany = (name: string) => {
    if (name.trim().length < 3) return 'Company Name must be at least 3 characters';
    if (/^-?\d+$/.test(name.trim())) return 'Company Name cannot be only digits';
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
    setEditData(prev => ({ ...prev, phone_number: formatted }));
  };

  const handleSave = () => {
    setError(null);
    const newErrors: Record<string, string> = {};
    
    const nameErr = validateName(editData.name);
    if (nameErr) newErrors.name = nameErr;

    const companyErr = validateCompany(editData.organization);
    if (companyErr) newErrors.organization = companyErr;

    const dobErr = validateDOB(editData.date_of_birth);
    if (dobErr) newErrors.date_of_birth = dobErr;

    const phoneErr = validatePhone(editData.phone_number);
    if (phoneErr) newErrors.phone_number = phoneErr;

    // Upload limit validation
    const num = parseFloat(inputValue);
    if (isNaN(num) || num <= 0) {
      newErrors.max_upload_size = 'Upload limit must be greater than 0MB';
    } else if (num > 500) {
      newErrors.max_upload_size = 'Maximum upload limit is 500MB';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setLimitError(newErrors.max_upload_size || null);
      return;
    }

    const limitBytes = Math.round(num * 1024 * 1024);
    const updatedEditData = { ...editData, max_upload_size: limitBytes };

    setFieldErrors({});
    setLimitError(null);
    onUpdate(supplier.id, updatedEditData);
    setIsEditing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCancel = () => {
    setFieldErrors({});
    setEditData({
      name: supplier.name,
      organization: supplier.organization,
      gender: supplier.gender || '',
      date_of_birth: supplier.date_of_birth || '',
      phone_number: supplier.phone_number || '',
      max_upload_size: editData.max_upload_size // Keep the loaded limit
    });
    setIsEditing(false);
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
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Supplier Profile</h1>
            <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Partner view and identity management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className={`h-20 ${supplier.status === 'ACTIVE' ? 'bg-indigo-600' : 'bg-slate-400'}`}></div>
            <div className="px-6 pb-6 -mt-10 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white p-1 mx-auto shadow-lg">
                <div className={`w-full h-full rounded-xl flex items-center justify-center text-2xl font-black border-4 border-white ${
                  supplier.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {supplier.organization[0]}
                </div>
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-900 tracking-tight leading-tight">{supplier.organization}</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Supplier Partner</p>
              <div className="mt-4 flex justify-center gap-2">
                 <span className={`px-2 py-0.5 text-[8px] font-black rounded-full border uppercase tracking-wider ${
                   supplier.status === 'ACTIVE' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                 }`}>
                   {supplier.status === 'ACTIVE' ? 'Authorized Access' : 'Access Revoked'}
                 </span>
              </div>
            </div>
            <div className="border-t border-slate-50 p-6 space-y-3">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 font-black uppercase tracking-widest">Supplier ID</span>
                <span className="text-slate-700 font-black uppercase truncate ml-4">{supplier.id}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 font-black uppercase tracking-widest">Enrolled On</span>
                <span className="text-slate-700 font-black uppercase">{new Date(supplier.createdDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3">Performance Ledger</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-xl font-black tracking-tighter">{approvalRate}%</p>
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Pass Rate</p>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${approvalRate}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-base font-black">{supplierSubmissions.length}</p>
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Submissions</p>
                </div>
                <div>
                  <p className="text-base font-black">{approvedCount}</p>
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Approved</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
                {isEditing ? 'Modify Partner Records' : 'Identity Information'}
              </h3>
              <div className="flex items-center gap-3">
                {showSuccess && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                    Profile Updated
                  </span>
                )}
              </div>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    readOnly={!isEditing}
                    value={editData.name}
                    onChange={e => {
                      setEditData({...editData, name: e.target.value});
                      if (fieldErrors.name) setFieldErrors(prev => ({...prev, name: ''}));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                      isEditing ? 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600' : 'bg-slate-100/50 border border-transparent cursor-not-allowed text-slate-500'
                    } ${fieldErrors.name ? 'border-rose-300 ring-4 ring-rose-50' : ''}`}
                  />
                  {fieldErrors.name && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    readOnly
                    defaultValue={supplier.email}
                    className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                  {isEditing ? (
                    <select
                      value={editData.gender}
                      onChange={e => setEditData({...editData, gender: e.target.value})}
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
                      value={supplier.gender || 'N/A'}
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
                        value={editData.date_of_birth}
                        onChange={e => {
                          setEditData({...editData, date_of_birth: e.target.value});
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
                      value={supplier.date_of_birth || 'N/A'}
                      className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-inner cursor-not-allowed text-slate-500"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    readOnly={!isEditing}
                    value={editData.phone_number}
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
                    readOnly={!isEditing}
                    value={editData.organization}
                    onChange={e => {
                      setEditData({...editData, organization: e.target.value});
                      if (fieldErrors.organization) setFieldErrors(prev => ({...prev, organization: ''}));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all font-bold text-xs shadow-inner ${
                      isEditing ? 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600' : 'bg-slate-100/50 border border-transparent cursor-not-allowed text-slate-500'
                    } ${fieldErrors.organization ? 'border-rose-300 ring-4 ring-rose-50' : ''}`}
                  />
                  {fieldErrors.organization && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{fieldErrors.organization}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Limit</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value);
                          setLimitError(null);
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all font-bold text-xs shadow-inner pr-10 ${
                          isEditing ? 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600' : 'bg-slate-100/50 border border-transparent cursor-not-allowed text-slate-500'
                        } ${limitError ? 'border-rose-300 ring-4 ring-rose-50' : ''}`}
                        readOnly={!isEditing}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-tight pointer-events-none">
                        MB
                      </span>
                    </div>
                  </div>
                  {limitError && <p className="text-[8px] font-black text-rose-500 uppercase mt-1 ml-1">{limitError}</p>}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-50 flex flex-col sm:flex-row gap-3">
                {isEditing ? (
                  <>
                    <button 
                      type="submit"
                      className="flex-1 px-8 py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest active:scale-95"
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button"
                      onClick={handleCancel}
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

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-3 md:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-widest">Activity</h3>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{supplierSubmissions.length} Items</span>
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search FAI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all"
                />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left table-fixed border-collapse min-w-[500px] md:min-w-0">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-50">
                    <th className="px-3 md:px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest w-[60%]">Part Name / Number</th>
                    <th className="px-3 md:px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Date</th>
                    <th className="px-3 md:px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[20%]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {supplierSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <p className="text-slate-400 italic font-bold text-xs uppercase tracking-widest">No history recorded.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map(sub => (
                      <tr 
                        key={sub.id} 
                        onClick={() => onViewSubmission(sub.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-3 md:px-8 py-4 overflow-hidden align-middle">
                          <p className="font-black text-slate-900 text-[11px] md:text-xs truncate group-hover:text-indigo-600 transition-colors">{sub.partName}</p>
                          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 truncate">ID: {sub.id}</p>
                        </td>
                        <td className="px-3 md:px-8 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-tight align-middle whitespace-nowrap overflow-hidden">
                          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 inline-block max-w-full truncate">
                            {new Date(sub.lastUpdated || sub.created_at || Date.now()).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-3 md:px-8 py-4 text-center align-middle overflow-hidden">
                          <div className="flex justify-center max-w-full min-w-0">
                            <StatusBadge status={sub.status} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="px-3 md:px-8 py-4 bg-slate-50/30 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 shrink-0">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Showing <span className="text-slate-900">{paginatedSubmissions.length}</span> of <span className="text-slate-900">{supplierSubmissions.length}</span> results
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg border transition-all ${
                      currentPage === 1 
                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 active:scale-95 shadow-sm'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 whitespace-nowrap">{currentPage} / {totalPages}</div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg border transition-all ${
                      currentPage === totalPages 
                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 active:scale-95 shadow-sm'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3 md:px-8 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-start shrink-0">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Showing <span className="text-slate-900">{supplierSubmissions.length}</span> results
                </p>
              </div>
            )}
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
                    <div className={`w-3 h-3 rounded-full ${supplier.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <p className="text-xs font-bold text-slate-700 uppercase">
                      Current: {supplier.status === 'ACTIVE' ? 'Account Active' : 'Account Suspended'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => onToggleStatus(supplier.id)}
                    className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                      supplier.status === 'ACTIVE' 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                    }`}
                  >
                    {supplier.status === 'ACTIVE' ? 'Suspend Supplier Access' : 'Reactivate Supplier Access'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 h-full">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-200/50">Partner Privileges</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Artifact Submission', active: supplier.status === 'ACTIVE' },
                      { label: 'AI Pre-validation', active: supplier.status === 'ACTIVE' },
                      { label: 'Status Tracking', active: supplier.status === 'ACTIVE' },
                      { label: 'Digital Vault', active: supplier.status === 'ACTIVE' }
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

export default SupplierDetail;

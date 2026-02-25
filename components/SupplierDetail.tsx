
import React, { useState, useMemo, useEffect } from 'react';
import { SupplierAccount, FAISubmission } from '../types';

interface SupplierDetailProps {
  supplier: SupplierAccount;
  submissions: FAISubmission[];
  initialEditMode?: boolean;
  onBack: () => void;
  onToggleStatus: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SupplierAccount>) => void;
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

const SupplierDetail: React.FC<SupplierDetailProps> = ({ 
  supplier, 
  submissions, 
  initialEditMode = false,
  onBack, 
  onToggleStatus, 
  onUpdate,
  onDelete 
}) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [currentPage, setCurrentPage] = useState(1);
  const [editData, setEditData] = useState({
    name: supplier.name,
    organization: supplier.organization
  });

  // Sync internal edit state with prop changes
  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  const supplierSubmissions = useMemo(() => 
    submissions.filter(s => s.supplierName === supplier.organization)
      .sort((a, b) => b.timestamp - a.timestamp),
    [submissions, supplier.organization]
  );

  const approvedCount = supplierSubmissions.filter(s => s.status === 'APPROVED').length;
  const approvalRate = supplierSubmissions.length > 0 
    ? Math.round((approvedCount / supplierSubmissions.length) * 100) 
    : 0;

  const totalPages = Math.ceil(supplierSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return supplierSubmissions.slice(start, start + ITEMS_PER_PAGE);
  }, [supplierSubmissions, currentPage]);

  const handleSave = () => {
    onUpdate(supplier.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: supplier.name,
      organization: supplier.organization
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
              {isEditing ? 'Editing Profile' : supplier.organization}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Partner Profile & History</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] md:text-xs text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button 
                onClick={() => onToggleStatus(supplier.id)}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs transition-all border uppercase tracking-widest ${
                  supplier.status === 'ACTIVE' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {supplier.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleCancel}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-slate-100 rounded-xl font-black text-[10px] md:text-xs text-slate-600 hover:bg-slate-200 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] md:text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl md:text-3xl font-black mb-6 shadow-xl shadow-indigo-100">
              {(editData.organization || supplier.organization)[0]}
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Company / Organization</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.organization}
                    onChange={e => setEditData({...editData, organization: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-bold text-xs md:text-sm"
                  />
                ) : (
                  <p className="text-lg md:text-xl font-black text-slate-900 truncate">{supplier.organization}</p>
                )}
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Primary Contact</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.name}
                    onChange={e => setEditData({...editData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-bold text-xs md:text-sm"
                  />
                ) : (
                  <p className="text-xs md:text-sm font-bold text-slate-700">{supplier.name}</p>
                )}
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-5">
                <div>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</p>
                  <p className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-not-allowed select-all truncate">
                    {supplier.email}
                  </p>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                    <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest ${
                      supplier.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {supplier.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</p>
                    <p className="text-[10px] md:text-xs font-bold text-slate-700 uppercase">{new Date(supplier.createdDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Performance Ledger</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2.5">
                    <p className="text-2xl md:text-3xl font-black tracking-tighter">{approvalRate}%</p>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Pass Rate</p>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${approvalRate}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-lg md:text-xl font-black">{supplierSubmissions.length}</p>
                    <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">Submissions</p>
                  </div>
                  <div>
                    <p className="text-lg md:text-xl font-black">{approvedCount}</p>
                    <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">Approved</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submission History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-3 md:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
              <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{supplierSubmissions.length} Items</span>
            </div>
            <div className="w-full overflow-hidden">
              <table className="w-full text-left table-fixed border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-50">
                    <th className="px-3 md:px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest w-[45%] md:w-auto">Part / ID</th>
                    <th className="px-3 md:px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%] md:w-auto text-center md:text-left">Rev</th>
                    <th className="px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Date</th>
                    <th className="px-3 md:px-8 py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[35%] md:w-auto">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {supplierSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <p className="text-slate-400 italic font-bold text-xs uppercase tracking-widest">No history recorded.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors cursor-default">
                        <td className="px-3 md:px-8 py-4 overflow-hidden align-middle">
                          <p className="font-black text-slate-900 text-[11px] md:text-xs truncate">{sub.partNumber}</p>
                          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 truncate">{sub.id}</p>
                        </td>
                        <td className="px-3 md:px-8 py-4 text-[10px] md:text-xs font-black text-slate-600 text-center md:text-left align-middle truncate">
                          {sub.revision}
                        </td>
                        <td className="px-8 py-4 text-[10px] md:text-xs text-slate-500 font-bold uppercase hidden md:table-cell align-middle whitespace-nowrap">
                          {new Date(sub.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-3 md:px-8 py-4 text-center align-middle">
                          <span className={`inline-flex items-center justify-center px-1.5 md:px-2 py-0.5 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                            sub.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 
                            sub.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {sub.status === 'APPROVED' ? 'Pass' : sub.status === 'REJECTED' ? 'Fail' : sub.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-3 md:px-8 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
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
            )}
          </div>
          
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <h3 className="text-xs md:text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">Audit Collaboration</h3>
            <textarea 
              placeholder="Record audit-only notes for this supplier..."
              className="w-full h-28 md:h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all resize-none font-bold text-xs md:text-sm text-slate-700 shadow-inner"
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">
                Save Audit Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetail;

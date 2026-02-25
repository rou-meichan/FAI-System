import React, { useState, useMemo } from 'react';
import { SupplierAccount, EmployeeAccount } from '../types';

interface AccountManagementProps {
  suppliers: SupplierAccount[];
  employees: EmployeeAccount[];
  activeTab: 'SUPPLIERS' | 'EMPLOYEES';
  onTabChange: (tab: 'SUPPLIERS' | 'EMPLOYEES') => void;
  onRegisterRequest: (tab: 'SUPPLIERS' | 'EMPLOYEES') => void;
  onDeleteSupplier: (id: string) => void;
  onToggleSupplierStatus: (id: string) => void;
  onUpdateSupplier: (id: string, updates: Partial<SupplierAccount>) => void;
  onDeleteEmployee: (id: string) => void;
  onToggleEmployeeStatus: (id: string) => void;
  onUpdateEmployee: (id: string, updates: Partial<EmployeeAccount>) => void;
  onViewSupplierDetail: (id: string) => void;
  onEditSupplierDetail: (id: string) => void;
  onViewEmployeeDetail: (id: string) => void;
  onEditEmployeeDetail: (id: string) => void;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 10;

const AccountManagement: React.FC<AccountManagementProps> = ({ 
  suppliers, 
  employees,
  activeTab,
  onTabChange,
  onRegisterRequest,
  onDeleteSupplier,
  onToggleSupplierStatus,
  onUpdateSupplier,
  onDeleteEmployee,
  onToggleEmployeeStatus,
  onUpdateEmployee,
  onViewSupplierDetail,
  onEditSupplierDetail,
  onViewEmployeeDetail,
  onEditEmployeeDetail,
  onBack 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Date Verification Logic
  const today = new Date().toISOString().split('T')[0];
  const isStartDateInvalid = startDate && endDate && startDate > endDate;
  const isEndDateInFuture = endDate && endDate > today;
  const isDateRangeInvalid = isStartDateInvalid || isEndDateInFuture;

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    let items = (activeTab === 'SUPPLIERS' ? suppliers : employees) as (SupplierAccount | EmployeeAccount)[];

    if (statusFilter !== 'ALL') {
      items = items.filter(item => item.status === statusFilter);
    }

    if (!isDateRangeInvalid) {
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        items = items.filter(item => item.createdDate >= start);
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        items = items.filter(item => item.createdDate <= end);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesEmail = item.email.toLowerCase().includes(query);
        const matchesExtra = activeTab === 'SUPPLIERS' 
          ? (item as SupplierAccount).organization.toLowerCase().includes(query)
          : (item as EmployeeAccount).role.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesExtra;
      });
    }

    return items;
  }, [suppliers, employees, searchQuery, activeTab, statusFilter, startDate, endDate, isDateRangeInvalid]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
    setActiveMenu(null);
  }, [searchQuery, activeTab, statusFilter, startDate, endDate]);

  return (
    <div 
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-40" 
      onClick={() => setActiveMenu(null)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Account Management</h1>
          <p className="text-slate-500 font-medium text-xs md:text-base">Control digital identities and access levels for partners.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex p-1.5 bg-slate-100 rounded-[1.25rem] w-full md:w-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); onTabChange('SUPPLIERS'); }}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === 'SUPPLIERS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Suppliers
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onTabChange('EMPLOYEES'); }}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === 'EMPLOYEES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Employees
            </button>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onRegisterRequest(activeTab); }}
            className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Register {activeTab === 'SUPPLIERS' ? 'Supplier' : 'Employee'}
          </button>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm border-b-4 border-b-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative group" onClick={(e) => e.stopPropagation()}>
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder={`Search profiles...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-xs shadow-inner"
              />
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                showFilters || statusFilter !== 'ALL' || startDate || endDate
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Filters</span>
              {(statusFilter !== 'ALL' || startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="col-span-1 flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DEACTIVATED">Inactive</option>
                </select>
              </div>
              
              <div className="col-span-1 flex flex-col">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 mb-1 ${isStartDateInvalid ? 'text-rose-500' : 'text-slate-400'}`}>Joined From</label>
                <input 
                  type="date" 
                  value={startDate}
                  max={endDate || today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 transition-all cursor-pointer ${
                    isStartDateInvalid ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="col-span-1 flex flex-col">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 mb-1 ${isEndDateInFuture ? 'text-rose-500' : 'text-slate-400'}`}>Joined To</label>
                <input 
                  type="date" 
                  value={endDate}
                  max={today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 transition-all cursor-pointer ${
                    isEndDateInFuture ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="col-span-1 flex flex-col justify-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); clearAllFilters(); }}
                  className="w-full h-[36px] bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 flex flex-col min-h-[400px] overflow-visible">
        <div className="w-full">
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%] md:w-auto">
                  {activeTab === 'SUPPLIERS' ? 'Name' : 'Employee'}
                </th>
                <th className="px-3 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%] md:w-auto">
                  {activeTab === 'SUPPLIERS' ? 'Organization' : 'Role'}
                </th>
                <th className="px-3 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%] md:w-36">
                  Status
                </th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell w-48">
                  Joined
                </th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-12 hidden md:table-cell w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center align-middle">
                    <p className="text-slate-400 italic font-bold text-xs uppercase tracking-widest">No matching records found</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  return (
                    <tr 
                      key={item.id} 
                      onClick={(e) => { e.stopPropagation(); activeTab === 'SUPPLIERS' ? onViewSupplierDetail(item.id) : onViewEmployeeDetail(item.id); }}
                      className="group transition-all hover:bg-slate-100 cursor-pointer"
                    >
                      <td className="px-4 md:px-8 py-5 align-middle overflow-hidden">
                        <div className="min-w-0">
                          <p className={`text-xs md:text-sm font-black tracking-tight truncate ${item.status === 'DEACTIVATED' ? 'text-slate-400' : 'text-slate-800'}`}>
                            {item.name}
                          </p>
                          <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase truncate">
                            {item.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 md:px-8 py-5 align-middle overflow-hidden">
                        <p className="text-[10px] text-slate-600 font-bold uppercase truncate">
                          {activeTab === 'SUPPLIERS' ? (item as SupplierAccount).organization : (item as EmployeeAccount).role}
                        </p>
                      </td>
                      <td className="px-3 md:px-8 py-5 text-center align-middle">
                        <span className={`inline-flex items-center justify-center px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                          item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase tracking-tight align-middle hidden md:table-cell">
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 inline-block">
                          {new Date(item.createdDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right pr-12 align-middle hidden md:table-cell">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); }}
                            className={`p-2 rounded-xl transition-all active:scale-90 border ${activeMenu === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-slate-100'}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" />
                            </svg>
                          </button>
                          
                          {activeMenu === item.id && (
                            <div className="absolute right-0 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 top-full mt-2 origin-top-right slide-in-from-top-2">
                              <button 
                                onClick={() => {
                                  if (activeTab === 'SUPPLIERS') onEditSupplierDetail(item.id);
                                  else onEditEmployeeDetail(item.id);
                                }}
                                className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                              >
                                Edit Profile
                              </button>
                              <button 
                                onClick={() => { 
                                  if (activeTab === 'SUPPLIERS') onToggleSupplierStatus(item.id);
                                  else onToggleEmployeeStatus(item.id);
                                  setActiveMenu(null); 
                                }}
                                className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                              >
                                {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-auto px-6 py-4 border-t border-slate-50 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${currentPage === 1 ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 hover:text-indigo-600 shadow-sm'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${currentPage === totalPages ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 hover:text-indigo-600 shadow-sm'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountManagement;
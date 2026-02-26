import React, { useMemo, useState } from 'react';
import { FAISubmission, SubmissionStatus } from '../types';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface IQADashboardProps {
  submissions: FAISubmission[];
  onViewDetail: (id: string) => void;
  onManageSuppliers: () => void;
  viewMode?: 'FULL' | 'TABLE_ONLY';
}

const IQADashboard: React.FC<IQADashboardProps> = ({ submissions, onViewDetail, onManageSuppliers, viewMode = 'FULL' }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filters
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'ALL'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const isFullDashboard = viewMode === 'FULL';
  const itemsPerPage = isFullDashboard ? 5 : 10;

  const today = new Date().toISOString().split('T')[0];

  // Date Verification Logic
  const isStartDateInvalid = startDate && endDate && startDate > endDate;
  const isEndDateInFuture = endDate && endDate > today;
  const isDateRangeInvalid = isStartDateInvalid || isEndDateInFuture;

  const uniqueSuppliers = useMemo(() => {
    const supplierSet = new Set<string>();
    submissions.forEach(s => supplierSet.add(s.supplierName));
    return Array.from(supplierSet).sort();
  }, [submissions]);

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    const recentSubmissions = submissions.filter(s => s.timestamp >= thirtyDaysAgo);
    
    const total = recentSubmissions.length;
    const approved = recentSubmissions.filter(s => s.status === SubmissionStatus.APPROVED).length;
    const rejected = recentSubmissions.filter(s => s.status === SubmissionStatus.REJECTED).length;
    // Wait for Review shows ALL pending reviews regardless of time
    const pendingReview = submissions.filter(s => s.status === SubmissionStatus.PENDING_REVIEW).length;
    
    return { total, approved, rejected, pendingReview };
  }, [submissions]);

  const tableSubmissions = useMemo(() => {
    let filtered = submissions;
    if (isFullDashboard) {
      filtered = submissions.filter(s => s.status === SubmissionStatus.PENDING_REVIEW);
    } else {
      if (statusFilter !== 'ALL') filtered = filtered.filter(s => s.status === statusFilter);
      if (supplierFilter !== 'ALL') filtered = filtered.filter(s => s.supplierName === supplierFilter);
      if (!isDateRangeInvalid) {
        if (startDate) filtered = filtered.filter(s => s.timestamp >= new Date(startDate).setHours(0,0,0,0));
        if (endDate) filtered = filtered.filter(s => s.timestamp <= new Date(endDate).setHours(23,59,59,999));
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.partNumber.toLowerCase().includes(query) || 
        s.id.toLowerCase().includes(query) ||
        s.supplierName.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [submissions, isFullDashboard, searchQuery, statusFilter, supplierFilter, startDate, endDate, isDateRangeInvalid]);

  const sortedSubmissions = useMemo(() => {
    const statusPriority: Record<string, number> = {
      [SubmissionStatus.PENDING_REVIEW]: 1,
      [SubmissionStatus.REJECTED]: 2,
      [SubmissionStatus.APPROVED]: 3,
      [SubmissionStatus.AI_REVIEWING]: 4,
      [SubmissionStatus.PENDING_AI]: 5,
      [SubmissionStatus.DRAFT]: 6,
    };
    return [...tableSubmissions].sort((a, b) => {
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;
      return priorityA !== priorityB ? priorityA - priorityB : b.timestamp - a.timestamp;
    });
  }, [tableSubmissions]);

  const totalPages = Math.max(1, Math.ceil(sortedSubmissions.length / itemsPerPage));
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, supplierFilter, startDate, endDate, viewMode]);

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedSubmissions.slice(start, start + itemsPerPage);
  }, [sortedSubmissions, currentPage, itemsPerPage]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSupplierFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const chartData = useMemo(() => {
    const data = [
      { name: 'Approved', value: stats.approved, color: '#10b981' },
      { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
      { name: 'Pending Review', value: stats.pendingReview, color: '#f59e0b' },
    ];
    // Filter out zero values to prevent visual gaps and "unbalanced" chart rendering
    return data.filter(d => d.value > 0);
  }, [stats]);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6 md:space-y-8">
      {isFullDashboard && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
             <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                Showing Summary
              </span>
            </div>
            <button 
              onClick={onManageSuppliers}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 md:py-2 rounded-xl text-[11px] md:text-xs font-black text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Supplier Accounts
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total Packages', value: stats.total, icon: '📦', color: 'indigo', period: '30D' },
              { label: 'Wait for Review', value: stats.pendingReview, icon: '👤', color: 'amber', period: 'ALL' },
              { label: 'Approved', value: stats.approved, icon: '✅', color: 'emerald', period: '30D' },
              { label: 'Rejected', value: stats.rejected, icon: '❌', color: 'rose', period: '30D' },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-4 md:p-5 rounded-[1.25rem] md:rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2 md:mb-3">
                  <span className="text-xl md:text-2xl">{kpi.icon}</span>
                  <span className="px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase bg-slate-50 text-slate-400 tracking-widest">{kpi.period}</span>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{kpi.value}</p>
                  <p className="text-[9px] md:text-xs font-black text-slate-400 mt-0.5 uppercase tracking-wider line-clamp-1">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!isFullDashboard && (
        <div className="bg-white p-4 md:p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative group">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search Part Number, Submission ID, or Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-xs shadow-inner"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                showFilters || statusFilter !== 'ALL' || supplierFilter !== 'ALL' || startDate || endDate
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Filters</span>
              {(statusFilter !== 'ALL' || supplierFilter !== 'ALL' || startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-2 animate-in slide-in-from-top-2 duration-200">
              <div className="col-span-1 flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Supplier Entity</label>
                <select 
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">All Suppliers</option>
                  {uniqueSuppliers.map(sup => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Process Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={SubmissionStatus.PENDING_REVIEW}>Needs Review</option>
                  <option value={SubmissionStatus.APPROVED}>Approved</option>
                  <option value={SubmissionStatus.REJECTED}>Rejected</option>
                  <option value={SubmissionStatus.AI_REVIEWING}>AI Reviewing</option>
                </select>
              </div>

              <div className="col-span-1 flex flex-col">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 mb-1 ${isStartDateInvalid ? 'text-rose-500' : 'text-slate-400'}`}>Submitted From</label>
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
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 mb-1 ${isEndDateInFuture ? 'text-rose-500' : 'text-slate-400'}`}>Submitted To</label>
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

              <div className="col-span-2 lg:col-span-1 flex flex-col justify-end">
                <button
                  onClick={clearAllFilters}
                  className="w-full h-[36px] bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 ${isFullDashboard ? 'lg:grid-cols-3' : ''} gap-6 md:gap-8 items-start`}>
        <div className={`${isFullDashboard ? 'lg:col-span-2' : ''} bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col`}>
          {isFullDashboard && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-sm md:text-base font-black tracking-tight text-slate-900 uppercase">Needs Attention</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Awaiting human auditor validation</p>
              </div>
              <div className="relative w-full sm:w-64 group">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Filter active items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all shadow-inner"
                />
              </div>
            </div>
          )}
          
          <div className="overflow-x-hidden -mx-5 md:-mx-6 lg:overflow-visible">
            <div className="inline-block min-w-full align-middle px-5 md:px-6">
              <table className={`w-full text-left border-collapse table-fixed`}>
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4 w-16 md:w-28">ID</th>
                    <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Component</th>
                    <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 hidden md:table-cell w-1/4">Supplier</th>
                    {!isFullDashboard && (
                      <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-36 lg:w-44 hidden md:table-cell">Submission Date</th>
                    )}
                    <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24 md:w-36 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={isFullDashboard ? 4 : 5} className="py-16 text-center align-middle">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-slate-400 italic font-medium text-xs">No records found matching current criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map((sub) => (
                      <tr 
                        key={sub.id} 
                        onClick={() => onViewDetail(sub.id)}
                        className="cursor-pointer hover:bg-slate-100 transition-colors duration-150 group"
                      >
                        <td className="py-4 pl-4 pr-2 align-middle">
                          <span className="font-mono text-[10px] md:text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg inline-block truncate max-w-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {sub.id.split('-')[1]}
                          </span>
                        </td>
                        <td className="py-4 px-2 overflow-hidden align-middle">
                          <div className="font-black text-slate-800 text-xs md:text-sm tracking-tight truncate max-w-full">
                            {sub.partNumber} / {sub.revision}
                          </div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase md:hidden truncate max-w-full">{sub.supplierName}</div>
                        </td>
                        <td className="py-4 px-2 hidden md:table-cell align-middle">
                          <div className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-full">{sub.supplierName}</div>
                        </td>
                        {!isFullDashboard && (
                          <td className="py-4 px-2 pr-10 hidden md:table-cell align-middle">
                            <div className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 inline-block">
                              {new Date(sub.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                        )}
                        <td className="py-4 text-center pr-4 align-middle">
                          <div className="flex justify-center">
                            <StatusBadge status={sub.status} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
                Showing <span className="text-slate-900">{paginatedSubmissions.length}</span> of <span className="text-slate-900">{sortedSubmissions.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-xl border transition-all ${
                    currentPage === 1 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 active:scale-95 shadow-sm'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600">{currentPage} / {totalPages}</div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-xl border transition-all ${
                    currentPage === totalPages ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 active:scale-95 shadow-sm'
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

        {isFullDashboard && (
          <div className="bg-white p-6 md:p-6 rounded-[1.5rem] md:rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center">
            <h2 className="text-sm md:text-base font-black tracking-tight text-slate-900 mb-4 uppercase w-full text-left">Summary</h2>
            
            <div className="h-[180px] md:h-[220px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={55} 
                    outerRadius={75} 
                    // Only apply padding angle if there's more than one segment to keep it balanced
                    paddingAngle={chartData.length > 1 ? 5 : 0} 
                    dataKey="value" 
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', fontSize: '11px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Central Label for Balance */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl md:text-2xl font-black text-slate-900">{stats.total}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-6 w-full">
              {[
                { name: 'Approved', value: stats.approved, color: '#10b981' },
                { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
                { name: 'Pending', value: stats.pendingReview, color: '#f59e0b' },
              ].map((item) => (
                <div key={item.name} className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const StatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
  const configs: Partial<Record<SubmissionStatus, { label: string; class: string }>> = {
    [SubmissionStatus.DRAFT]: { label: 'Draft', class: 'bg-slate-100 text-slate-600' },
    [SubmissionStatus.PENDING_AI]: { label: 'AI Queue', class: 'bg-slate-50 text-slate-400' },
    [SubmissionStatus.AI_REVIEWING]: { label: 'AI Processing', class: 'bg-indigo-50 text-indigo-600 animate-pulse' },
    [SubmissionStatus.PENDING_REVIEW]: { label: 'Needs Review', class: 'bg-amber-100 text-amber-700 border border-amber-200' },
    [SubmissionStatus.APPROVED]: { label: 'Approved', class: 'bg-emerald-100 text-emerald-700' },
    [SubmissionStatus.REJECTED]: { label: 'Rejected', class: 'bg-rose-100 text-rose-700' },
  };

  const config = configs[status] || { label: status, class: 'bg-slate-100 text-slate-400' };
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${config.class}`}>
      {config.label}
    </span>
  );
};

export default IQADashboard;
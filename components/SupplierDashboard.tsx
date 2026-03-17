import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DOCUMENT_CONFIG } from '../constants';
import { DocType, FAIFile, FAISubmission, SubmissionStatus } from '../types';
import { StatusBadge } from './IQADashboard';
import { base64ToBlob } from '../src/utils/fileUtils';
import { uploadFile, getFileUrl } from '../services/storageService';
import { fetchProfile } from '../services/faiService';
import PDFEditor from './PDFEditor';

const ErrorModal: React.FC<{ title: string; message: string; onClose: () => void }> = ({ title, message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        <div className="p-6 md:p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-100">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{title}</h3>
            <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

interface SupplierPortalProps {
  onSubmit: (submission: FAISubmission) => void;
  submissions: FAISubmission[];
  onViewDetail: (id: string) => void;
  userId: string;
}

const ITEMS_PER_PAGE = 8;

const FilePreviewModal: React.FC<{ file: FAIFile; onClose: () => void }> = ({ file, onClose }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!file.storagePath);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const fetchUrl = async () => {
      if (file.storagePath) {
        setIsLoading(true);
        try {
          const url = await getFileUrl(file.storagePath);
          setSignedUrl(url);
        } catch (error) {
          console.error('Failed to fetch signed URL:', error);
          // If storage fetch fails, try using the existing URL or data as fallback
          setSignedUrl(file.url || file.data || null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSignedUrl(file.url || file.data || null);
        setIsLoading(false);
      }
    };
    fetchUrl();
  }, [file]);

  const handleDownload = async () => {
    if (!signedUrl && !file.data) return;
    try {
      const response = await fetch(signedUrl || file.data!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-hidden animate-in fade-in duration-300">
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 bg-slate-900 flex items-center justify-center p-0 relative">
          {file.mimeType !== 'application/pdf' && (
            <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
              <button 
                onClick={handleDownload}
                className="p-3 bg-slate-800/80 backdrop-blur-md text-white hover:text-indigo-400 rounded-2xl shadow-2xl transition-all active:scale-90 border border-white/10"
                title="Download File"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button 
                onClick={onClose}
                className="p-3 bg-slate-800/80 backdrop-blur-md text-white hover:text-rose-400 rounded-2xl shadow-2xl transition-all active:scale-90 border border-white/10"
                title="Close Preview"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {isLoading ? (
            <div className="w-full h-screen flex items-center justify-center bg-slate-900">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto animate-spin shadow-2xl">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Preparing Review...</p>
              </div>
            </div>
          ) : file.mimeType === 'application/pdf' && signedUrl ? (
            <div className="absolute inset-0">
              <PDFEditor 
                url={signedUrl} 
                onSave={async () => {}} 
                onClose={onClose}
                readOnly={true}
                fileName={file.name}
              />
            </div>
          ) : signedUrl || file.data ? (
            <img src={signedUrl || file.data} alt={file.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center space-y-4 max-w-sm p-6">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                 <svg className="w-8 h-8 md:w-12 md:h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg md:text-xl font-black text-slate-800">Preview Unavailable</h4>
              <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">File data could not be loaded for preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SupplierPortal: React.FC<SupplierPortalProps> = ({ onSubmit, submissions, onViewDetail, userId }) => {
  const [partNumber, setPartNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [files, setFiles] = useState<FAIFile[]>([]);
  const [actualFiles, setActualFiles] = useState<Record<string, File>>({}); // Store actual File objects
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('HISTORY');
  const [previewingFile, setPreviewingFile] = useState<FAIFile | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2 * 1024 * 1024);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchProfile(userId);
        if (profile?.max_upload_size) {
          setMaxUploadSize(profile.max_upload_size);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocType) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadError(null);
      if (file.size > maxUploadSize) {
        const limitMB = (maxUploadSize / (1024 * 1024)).toFixed(0);
        setUploadError(`File too large! Your current limit is ${limitMB}MB. Please compress your file or upload a smaller version. To request a limit increase, contact the IQA Team.`);
        return;
      }

      const fileId = Math.random().toString(36).substr(2, 9);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFile: FAIFile = {
          id: fileId,
          type,
          name: type,
          mimeType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          data: dataUrl,
          isMandatory: DOCUMENT_CONFIG.find(c => c.type === type)?.mandatory || false,
          size: file.size,
        };
        
        setActualFiles(prev => ({ ...prev, [fileId]: file }));
        setFiles(prev => {
          const existingIndex = prev.findIndex(f => f.type === type);
          if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = newFile;
            return updated;
          }
          return [...prev, newFile];
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteFile = (type: DocType) => {
    const fileToDelete = files.find(f => f.type === type);
    if (fileToDelete) {
      setActualFiles(prev => {
        const updated = { ...prev };
        delete updated[fileToDelete.id];
        return updated;
      });
    }
    setFiles(prev => prev.filter(f => f.type !== type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submissionId = partNumber; // Use Part Number as the ID
      
      // Upload files to storage first
      const uploadedFiles = await Promise.all(files.map(async (fileInfo) => {
        const actualFile = actualFiles[fileInfo.id];
        if (actualFile) {
          const storagePath = `${userId}/${submissionId}/${fileInfo.id}_${fileInfo.name}`;
          const { path } = await uploadFile(actualFile, storagePath);
          const url = await getFileUrl(path);
          return {
            ...fileInfo,
            storagePath: path,
            url: url,
            // We keep the 'data' (base64) here so the AI can use it immediately in App.tsx
            // The faiService.ts will strip it before saving to the database.
          };
        }
        return fileInfo;
      }));

      const now = Date.now();
      const submission: FAISubmission = {
        id: submissionId,
        partName,
        revision: 0,
        lastUpdated: undefined,
        status: SubmissionStatus.AI_REVIEWING,
        files: uploadedFiles,
      };

      onSubmit(submission);
      setPartNumber('');
      setPartName('');
      setFiles([]);
      setActualFiles({});
      setActiveTab('HISTORY');
      setCurrentPage(1);
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to upload files. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async (file: FAIFile) => {
    if (file.mimeType === 'application/pdf') {
      let url = file.url;
      
      // 1. Try to get a fresh signed URL if it's from storage
      if (file.storagePath) {
        try {
          url = await getFileUrl(file.storagePath);
        } catch (error) {
          console.error('Failed to fetch signed URL for preview:', error);
        }
      }

      // 2. If we have the actual File object (local upload), use it
      const actualFile = actualFiles[file.id];
      if (!url && actualFile) {
        url = URL.createObjectURL(actualFile);
      }

      // 3. If we only have base64 data, convert to Blob URL
      if (!url && file.data) {
        try {
          const blob = base64ToBlob(file.data, 'application/pdf');
          url = URL.createObjectURL(blob);
        } catch (error) {
          console.error('Failed to convert base64 to blob for preview:', error);
        }
      }

      if (url) {
        // Use a temporary link to trigger the open, which is more reliable in some environments
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }
    setPreviewingFile(file);
  };

  const getFileForType = (type: DocType) => files.find(f => f.type === type);
  const isFormValid = partNumber && partName && DOCUMENT_CONFIG.filter(c => c.mandatory).every(c => files.some(f => f.type === c.type));

  const isStartDateInvalid = startDate && endDate && startDate > endDate;
  const isEndDateInFuture = endDate && endDate > today;
  const isDateRangeInvalid = isStartDateInvalid || isEndDateInFuture;

  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter(sub => {
        const matchesSearch = sub.partName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             sub.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
        
        let matchesDate = true;
        if (!isDateRangeInvalid) {
          if (startDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const subDate = sub.lastUpdated ? new Date(sub.lastUpdated).getTime() : (sub.created_at ? new Date(sub.created_at).getTime() : 0);
            matchesDate = matchesDate && subDate >= start;
          }
          if (endDate) {
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            const subDate = sub.lastUpdated ? new Date(sub.lastUpdated).getTime() : (sub.created_at ? new Date(sub.created_at).getTime() : 0);
            matchesDate = matchesDate && subDate <= end;
          }
        }

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return dateB - dateA;
      });
  }, [submissions, searchQuery, statusFilter, startDate, endDate, isDateRangeInvalid]);

  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <>
      {previewingFile && (
        <FilePreviewModal file={previewingFile} onClose={() => setPreviewingFile(null)} />
      )}
      <div className="space-y-4 md:space-y-8">
        {uploadError && (
          <ErrorModal 
            title="Upload Error" 
            message={uploadError} 
            onClose={() => setUploadError(null)} 
          />
        )}
      
      <div className="flex justify-center md:justify-start gap-10 md:gap-16 border-b border-slate-200 overflow-x-auto no-scrollbar pt-2">
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`mt-2 pb-4 text-[10px] md:text-sm font-black uppercase tracking-widest border-b-2 transition-all relative whitespace-nowrap ${
            activeTab === 'HISTORY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Track Results ({submissions.length})
          {submissions.some(s => s.isNewVerdict) && (
            <span className="absolute -top-1 -right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('NEW')}
          className={`mt-2 pb-4 text-[10px] md:text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'NEW' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          New Submission
        </button>
      </div>

      {activeTab === 'NEW' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Form Side - consistent with Detail sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
            <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200 p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-4">
                 <div className="w-1 h-4 md:w-1.5 md:h-5 bg-indigo-600 rounded-full"></div>
                 <h2 className="text-xs md:text-base font-black tracking-tight text-slate-900 uppercase leading-none">
                  Package Context
                </h2>
              </div>
              
              <form className="space-y-3 md:space-y-5">
                <div>
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Part Number</label>
                  <input 
                    type="text" 
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full px-3 py-2 md:px-3.5 md:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-[10px] md:text-xs text-slate-800"
                    placeholder="e.g. 4TUPUG-N013-02-00"
                  />
                </div>

                <div>
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Part Name</label>
                  <input 
                    type="text" 
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    className="w-full px-3 py-2 md:px-3.5 md:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-[10px] md:text-xs text-slate-800"
                    placeholder="e.g. SINGLE ROTARY NOZZLE SEAL SPACER"
                  />
                </div>
                
                <div className="pt-3 border-t border-slate-50">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      isFormValid && !isSubmitting 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:-translate-y-0.5' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <>
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                        </svg>
                        Initiate Review
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-[8px] md:text-[10px] text-slate-400 font-bold text-center uppercase tracking-tight leading-relaxed">
                    AI verification will begin immediately upon submission.
                  </p>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4 md:space-y-6">
            <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-1 h-4 md:w-1.5 md:h-5 bg-slate-300 rounded-full"></div>
                  <h2 className="text-xs md:text-base font-black tracking-tight text-slate-900 uppercase">
                    Documentation Evidence
                  </h2>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {DOCUMENT_CONFIG.map((config) => {
                  const uploadedFile = getFileForType(config.type);
                  return (
                    <div 
                      key={config.type} 
                      className={`group p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col justify-between min-h-[100px] md:min-h-[120px] ${
                        uploadedFile 
                          ? 'bg-emerald-50/40 border-emerald-400/40 shadow-sm' 
                          : 'bg-white border-slate-200 hover:border-indigo-600/30 hover:shadow-lg'
                      }`}
                    >
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-slate-900 text-[10px] md:text-xs uppercase tracking-tight leading-snug">
                            {config.type}
                          </h3>
                          {config.mandatory && !uploadedFile && (
                            <span className="px-1 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest shrink-0">Required</span>
                          )}
                          {uploadedFile && (
                            <div className="w-4 h-4 md:w-5 md:h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in-50 duration-300">
                               <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] md:text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                          {config.description}
                        </p>
                      </div>
                      
                      <div className="mt-3 md:mt-4">
                        {uploadedFile ? (
                          <div className="flex items-center justify-between gap-2 bg-white/80 p-1.5 md:p-2 rounded-lg md:rounded-xl border border-emerald-100 shadow-sm">
                            <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-emerald-700 font-bold truncate">
                              <svg className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate">{uploadedFile.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => handlePreview(uploadedFile)}
                                className="p-1 md:p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                                title="Preview Artifact"
                              >
                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteFile(config.type)}
                                className="p-1 md:p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
                                title="Remove Artifact"
                              >
                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer group/btn w-full flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-[0.98]">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/btn:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Link Artifact
                            <input type="file" className="hidden" onChange={(e) => handleFileChange(e, config.type)} />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          {submissions.length > 0 && (
            <div className="bg-white p-3 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-2 md:space-y-4 overflow-hidden">
              {/* Mobile Filter Bar - Elegant & Compact */}
              <div className="flex md:hidden items-center gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-[11px] font-bold shadow-inner"
                  />
                </div>
                <button 
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`p-2 rounded-2xl transition-all flex items-center gap-2 ${
                    isFilterExpanded || statusFilter !== 'ALL' || startDate || endDate
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {(statusFilter !== 'ALL' || startDate || endDate) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              </div>

              {/* Expanded Mobile Filters & Desktop View */}
              <div className={`${isFilterExpanded ? 'flex' : 'hidden md:flex'} flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center animate-in fade-in slide-in-from-top-4 duration-500`}>
                <div className="hidden md:block relative flex-1" ref={datePickerRef}>
                  <div className="relative group">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                      type="text" 
                      placeholder="Search Part Number or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-[11px] font-bold shadow-inner"
                    />
                    <button 
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                        (startDate || endDate) && !isDateRangeInvalid
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : isDateRangeInvalid
                            ? 'bg-rose-500 text-white'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {showDatePicker && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 z-50 animate-in zoom-in-95 duration-200 origin-top-right">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Date Range</h4>
                          {(startDate || endDate) && (
                            <button 
                              onClick={() => { setStartDate(''); setEndDate(''); }}
                              className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                            <label className={`text-[9px] font-bold ml-1 ${isStartDateInvalid ? 'text-rose-500' : 'text-slate-500'}`}>FROM</label>
                            <input 
                              type="date" 
                              value={startDate}
                              max={endDate || today}
                              onChange={(e) => setStartDate(e.target.value)}
                              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none transition-all ${
                                isStartDateInvalid ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-500'
                              } focus:ring-2`}
                            />
                            {isStartDateInvalid && (
                              <p className="text-[8px] font-bold text-rose-500 uppercase mt-1 leading-tight px-1">
                                Cannot be after 'To' date
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className={`text-[9px] font-bold ml-1 ${isEndDateInFuture ? 'text-rose-500' : 'text-slate-500'}`}>TO</label>
                            <input 
                              type="date" 
                              value={endDate}
                              max={today}
                              onChange={(e) => setEndDate(e.target.value)}
                              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none transition-all ${
                                isEndDateInFuture ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-500'
                              } focus:ring-2`}
                            />
                            {isEndDateInFuture && (
                              <p className="text-[8px] font-bold text-rose-500 uppercase mt-1 leading-tight px-1">
                                Cannot be in the future
                              </p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => !isDateRangeInvalid && setShowDatePicker(false)}
                          disabled={isDateRangeInvalid}
                          className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            isDateRangeInvalid 
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                          }`}
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Date Range Picker - Inline when expanded */}
                <div className="md:hidden space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Range</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 ml-1">FROM</label>
                      <input 
                        type="date" 
                        value={startDate}
                        max={endDate || today}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 ml-1">TO</label>
                      <input 
                        type="date" 
                        value={endDate}
                        max={today}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:hidden space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['ALL', SubmissionStatus.APPROVED, SubmissionStatus.REJECTED, SubmissionStatus.PENDING_REVIEW, SubmissionStatus.AI_REVIEWING] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                          statusFilter === status 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {status === 'ALL' ? 'All' : 
                         status === SubmissionStatus.APPROVED ? 'Approved' :
                         status === SubmissionStatus.REJECTED ? 'Rejected' : 
                         status === SubmissionStatus.PENDING_REVIEW ? 'Pending' : 'AI Processing'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Status Filter */}
                <div className="hidden md:flex flex-wrap items-center gap-2 py-1">
                  {(['ALL', SubmissionStatus.APPROVED, SubmissionStatus.REJECTED, SubmissionStatus.PENDING_REVIEW, SubmissionStatus.AI_REVIEWING] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        statusFilter === status 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {status === 'ALL' ? 'All' : 
                       status === SubmissionStatus.APPROVED ? 'Approved' :
                       status === SubmissionStatus.REJECTED ? 'Rejected' : 
                       status === SubmissionStatus.PENDING_REVIEW ? 'Pending' : 'AI Processing'}
                    </button>
                  ))}
                </div>

                {/* Mobile Clear All */}
                {(statusFilter !== 'ALL' || startDate || endDate) && (
                  <button 
                    onClick={() => {
                      setStatusFilter('ALL');
                      setStartDate('');
                      setEndDate('');
                      setIsFilterExpanded(false);
                    }}
                    className="md:hidden w-full py-3 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 active:scale-95 transition-all"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {(startDate || endDate) && !isDateRangeInvalid && (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1">
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-bold text-indigo-700">
                      {startDate ? new Date(startDate).toLocaleDateString() : 'Beginning'} — {endDate ? new Date(endDate).toLocaleDateString() : 'Today'}
                    </span>
                    <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-rose-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {submissions.length === 0 ? (
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-10 md:p-20 text-center border-2 border-dashed border-slate-200">
              <div className="bg-slate-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-900">No Activity Detected</h3>
              <p className="text-xs md:text-sm text-slate-500 font-medium max-w-xs mx-auto mt-2">You haven't submitted any FAI packages for this account yet.</p>
              <button 
                onClick={() => setActiveTab('NEW')}
                className="mt-6 md:mt-8 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Start First Submission
              </button>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-10 md:p-20 text-center border border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs md:text-sm">No matches found for current filters.</p>
              <button onClick={clearFilters} className="mt-3 md:mt-4 text-indigo-600 font-black text-[10px] md:text-xs uppercase underline">Reset All Filters</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {paginatedSubmissions.map(sub => {
                  const isFinalized = sub.status === SubmissionStatus.APPROVED || sub.status === SubmissionStatus.REJECTED;
                  const isRejected = sub.status === SubmissionStatus.REJECTED;
                  const submissionDate = new Date(sub.lastUpdated || sub.created_at || Date.now());
                  const formattedDate = submissionDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => onViewDetail(sub.id)}
                      className={`group bg-white rounded-2xl md:rounded-3xl border p-2.5 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-3 transition-all cursor-pointer relative overflow-hidden ${
                        sub.isNewVerdict ? 'border-orange-400 ring-2 ring-orange-50 shadow-md' : 'border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-slate-200/50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 w-full">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          sub.status === SubmissionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' :
                          sub.status === SubmissionStatus.REJECTED ? 'bg-rose-50 text-rose-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {sub.status === SubmissionStatus.APPROVED ? (
                            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : sub.status === SubmissionStatus.REJECTED ? (
                            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 md:w-6 md:h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <h3 className="text-xs md:text-base font-black text-slate-900 tracking-tight truncate">{sub.partName}</h3>
                            <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-1 py-0.5 rounded-md">Rev {sub.revision ?? 0}</span>
                            {sub.isNewVerdict && (
                               <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-orange-400"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                               </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                             <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">PN: {sub.id}</p>
                             <span className="text-slate-300 text-[8px]">|</span>
                             <p className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase truncate">{formattedDate}</p>
                          </div>
                          {isFinalized && sub.iqaRemarks && (
                            <p className="mt-1 text-[8px] md:text-[10px] text-slate-500 font-medium italic line-clamp-1 border-l-2 border-slate-100 pl-2">
                              "{sub.iqaRemarks}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-50">
                        <div className="scale-95 md:scale-90 origin-left md:origin-right">
                          <StatusBadge status={sub.status} />
                        </div>
                        <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                           Details
                           <svg className="w-2.5 h-2.5 md:w-3 md:h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                           </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Showing <span className="text-slate-900">{paginatedSubmissions.length}</span> of <span className="text-slate-900">{filteredSubmissions.length}</span> results
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-xl border transition-all ${
                        currentPage === 1 
                          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 active:scale-95 shadow-sm'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-black text-indigo-600 whitespace-nowrap">
                      {currentPage} / {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-xl border transition-all ${
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
                <div className="flex flex-col sm:flex-row items-center justify-start gap-4 pt-6 border-t border-slate-100">
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
                    Showing <span className="text-slate-900">{filteredSubmissions.length}</span> results
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </>
);
};

export default SupplierPortal;
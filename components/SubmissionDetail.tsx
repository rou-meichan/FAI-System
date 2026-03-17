import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FAISubmission, SubmissionStatus, UserRole, FAIFile, DocType, SupplierAccount } from '../types';
import { StatusBadge } from './IQADashboard';
import { DOCUMENT_CONFIG } from '../constants';
import { base64ToBlob } from '../src/utils/fileUtils';
import { uploadFile, getFileUrl, deleteFile } from '../services/storageService';
import { fetchProfile } from '../services/faiService';
import PDFEditor from './PDFEditor';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

interface SubmissionDetailProps {
  submission: FAISubmission;
  userRole: UserRole;
  userId: string;
  suppliers: SupplierAccount[];
  onClose: () => void;
  onDecision: (decision: 'APPROVED' | 'REJECTED', remarks: string) => void;
  onUpdateSubmission?: (id: string, files: FAIFile[]) => Promise<void>;
  onRefreshSubmission?: () => Promise<void>;
  onViewSupplierDetail?: (id: string) => void;
}

const FilePreviewModal: React.FC<{ 
  file: FAIFile; 
  userRole: UserRole;
  onClose: () => void;
  onSavePDF?: (blob: Blob) => Promise<void>;
  initialEditMode?: boolean;
}> = ({ file, userRole, onClose, onSavePDF, initialEditMode = false }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!file.storagePath);
  const [isEditing, setIsEditing] = useState(initialEditMode || (file.mimeType === 'application/pdf' && userRole === 'IQA'));

  const isIQA = userRole === 'IQA';
  const canEdit = isIQA && file.mimeType === 'application/pdf';

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

  const handleSaveEditedPDF = async (blob: Blob) => {
    if (onSavePDF) {
      await onSavePDF(blob);
      setIsEditing(false);
      // Refresh URL after save
      if (file.storagePath) {
        const newUrl = await getFileUrl(file.storagePath);
        setSignedUrl(newUrl);
      }
    }
  };

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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[9999] flex flex-col animate-in fade-in duration-300">
      {/* Close Button */}
      {file.mimeType !== 'application/pdf' && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-sm"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-hidden relative flex items-center justify-center ${file.mimeType === 'application/pdf' ? 'p-0 md:p-6' : 'p-4 md:p-6'}`}>
        {isLoading ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-white/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto animate-spin">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Preparing Preview...</p>
          </div>
        ) : file.mimeType === 'application/pdf' && signedUrl ? (
          <div className="w-full h-full md:rounded-2xl overflow-hidden">
            <PDFEditor 
              url={signedUrl} 
              onSave={handleSaveEditedPDF} 
              onClose={onClose}
              readOnly={!canEdit}
              fileName={file.name}
            />
          </div>
        ) : signedUrl || file.data ? (
          <img src={signedUrl || file.data} alt={file.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        ) : (
          <div className="text-center p-10 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-slate-400 font-bold italic text-xs">Preview unavailable.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SubmissionDetail: React.FC<SubmissionDetailProps> = ({ 
  submission, 
  userRole, 
  userId,
  suppliers,
  onClose, 
  onDecision,
  onUpdateSubmission,
  onRefreshSubmission,
  onViewSupplierDetail
}) => {
  const [remarks, setRemarks] = useState('');
  const [previewingFile, setPreviewingFile] = useState<FAIFile | null>(null);
  const [startWithEdit, setStartWithEdit] = useState(false);
  const [editableFiles, setEditableFiles] = useState<FAIFile[]>(submission.files);
  const [actualFiles, setActualFiles] = useState<Record<string, File>>({}); // Store actual File objects for new uploads
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2 * 1024 * 1024);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<DocType | null>(null);

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
    setEditableFiles(submission.files);
  }, [submission]);

  const isIQA = userRole === 'IQA';
  const isSupplier = userRole === 'SUPPLIER';
  const needsDecision = (submission.status === SubmissionStatus.PENDING_REVIEW || 
                       submission.status === SubmissionStatus.AI_REVIEWING) && isIQA;
  const canResubmit = submission.status === SubmissionStatus.REJECTED && isSupplier;
  const isPending = submission.status === SubmissionStatus.PENDING_REVIEW || 
                  submission.status === SubmissionStatus.AI_REVIEWING;
  
  const formattedDate = new Date(submission.created_at || submission.lastUpdated || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedLastUpdated = submission.lastUpdated ? new Date(submission.lastUpdated).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'N/A';

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreview = async (file: FAIFile) => {
    setPreviewingFile(file);
  };

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const findMatchingFile = (docTypeStr: string) => {
    const normalizedDocType = normalize(docTypeStr);
    return editableFiles.find(f => {
      const normalizedFileType = normalize(f.type);
      return normalizedFileType === normalizedDocType || 
             normalizedFileType.includes(normalizedDocType) || 
             normalizedDocType.includes(normalizedFileType);
    });
  };

  const mandatoryTypes = DOCUMENT_CONFIG.filter(c => c.mandatory).map(c => c.type);
  const hasMissingMandatory = mandatoryTypes.some(type => !editableFiles.some(f => f.type === type));
  const providedMandatory = editableFiles.filter(f => mandatoryTypes.includes(f.type)).length;
  const totalMandatory = mandatoryTypes.length;

  const processFile = (file: File, type: DocType) => {
    setUploadError(null);
    if (file.size > maxUploadSize) {
      const limitMB = (maxUploadSize / (1024 * 1024)).toFixed(0);
      setUploadError(`File exceeds your ${limitMB}MB limit. Please contact the IQA team for an increase.`);
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
      setEditableFiles(prev => {
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocType) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, type);
    }
  };

  const handleDragOver = (e: React.DragEvent, type: DocType) => {
    e.preventDefault();
    if (canResubmit) {
      setDragOverType(type);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverType(null);
  };

  const handleDrop = (e: React.DragEvent, type: DocType) => {
    e.preventDefault();
    setDragOverType(null);
    if (canResubmit) {
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file, type);
      }
    }
  };

  const handleRemoveFile = (type: DocType) => {
    const fileToRemove = editableFiles.find(f => f.type === type);
    if (fileToRemove) {
      setEditableFiles(prev => prev.filter(f => f.type !== type));
      setActualFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[fileToRemove.id];
        return newFiles;
      });
    }
  };

  const handleResubmit = async () => {
    // Check mandatory files
    const mandatoryTypes = DOCUMENT_CONFIG.filter(c => c.mandatory).map(c => c.type);
    const missingMandatory = mandatoryTypes.filter(type => !editableFiles.some(f => f.type === type));
    
    if (missingMandatory.length > 0) {
      alert(`Please upload all mandatory files: ${missingMandatory.join(', ')}`);
      return;
    }

    if (onUpdateSubmission) {
      setIsResubmitting(true);
      try {
        // Upload new files to storage
        const uploadedFiles = await Promise.all(editableFiles.map(async (fileInfo) => {
          const actualFile = actualFiles[fileInfo.id];
          if (actualFile) {
            const storagePath = `${userId}/${submission.id}/${fileInfo.id}_${fileInfo.name}`;
            const { path } = await uploadFile(actualFile, storagePath);
            const url = await getFileUrl(path);
            return {
              ...fileInfo,
              storagePath: path,
              url: url,
              // Keep data for AI analysis in App.tsx
            };
          } else if (fileInfo.storagePath) {
            // Refresh signed URL to ensure AI can access it
            try {
              const url = await getFileUrl(fileInfo.storagePath);
              return { ...fileInfo, url };
            } catch (err) {
              console.warn('Failed to refresh URL for existing file:', fileInfo.name);
              return fileInfo;
            }
          }
          return fileInfo;
        }));

        await onUpdateSubmission(submission.id, uploadedFiles);

        // Delete old files that are no longer in the submission (replaced or removed)
        // Only do this after successful update
        const filesToDelete = submission.files.filter(oldFile => 
          !editableFiles.some(newFile => newFile.id === oldFile.id)
        );

        await Promise.all(filesToDelete.map(async (file) => {
          if (file.storagePath) {
            await deleteFile(file.storagePath);
          }
        }));

        onClose();
      } catch (error) {
        console.error('Resubmission failed:', error);
        alert('Failed to upload files. Please try again.');
      } finally {
        setIsResubmitting(false);
      }
    }
  };

  const hasUnsavedChanges = JSON.stringify(editableFiles) !== JSON.stringify(submission.files);

  const supplier = suppliers.find(s => s.id === submission.user_id) || 
                   suppliers.find(s => s.organization === submission.supplierName);

  const packageMeta = (
    <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <span className="w-1 md:w-1.5 h-4 md:h-5 bg-indigo-600 rounded-full"></span>
        <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-tight">Package Meta</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-5">
        <div className="space-y-0.5 md:space-y-1 col-span-2 md:col-span-1">
          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Submitted By</p>
          <div className="px-3 py-1.5 md:px-4 md:py-2.5 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs text-slate-900 truncate">
            {supplier && onViewSupplierDetail && isIQA ? (
              <button onClick={() => onViewSupplierDetail(supplier.id)} className="text-indigo-600 hover:underline">
                {supplier.organization}
              </button>
            ) : (
              supplier?.organization || submission.supplierName
            )}
          </div>
        </div>
        <div className="space-y-0.5 md:space-y-1">
          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Revision</p>
          <div className="px-3 py-1.5 md:px-4 md:py-2.5 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs text-slate-900">
            {submission.revision ?? 0}
          </div>
        </div>
        <div className="space-y-0.5 md:space-y-1">
          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Submitted Date</p>
          <div className="px-3 py-1.5 md:px-4 md:py-2.5 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs text-slate-900">
            {formattedDate}
          </div>
        </div>
        <div className="space-y-0.5 md:space-y-1">
          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Updated</p>
          <div className="px-3 py-1.5 md:px-4 md:py-2.5 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs text-slate-900">
            {formattedLastUpdated}
          </div>
        </div>
      </div>
    </div>
  );

  const hideUnprovidedArtifacts = isSupplier && (
    submission.status === SubmissionStatus.APPROVED || 
    submission.status === SubmissionStatus.PENDING_REVIEW
  );

  const showArtifactsGrid = isSupplier || 
    (isIQA && (submission.status === SubmissionStatus.APPROVED || submission.status === SubmissionStatus.REJECTED));

  const digitalArtifacts = (
    <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="w-1 md:w-1.5 h-4 md:h-5 bg-indigo-600 rounded-full"></span>
          <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-tight">Digital Artifacts</h3>
          {canResubmit && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-indigo-100 animate-pulse">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Drag & Drop Supported
            </span>
          )}
        </div>
        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">
          {editableFiles.length} Records
        </span>
      </div>
      
      <div className={`flex-1 ${showArtifactsGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4' : 'space-y-2 md:space-y-3'} [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300`}>
        {editableFiles.length === 0 && !canResubmit ? (
           <div className="text-center py-8 md:py-12 border-2 border-dashed border-slate-100 rounded-2xl md:rounded-3xl bg-slate-50/30">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-2 md:mb-3 shadow-sm">
               <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0118.586 7V19a2 2 0 01-2 2z" />
               </svg>
             </div>
             <p className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">No artifacts attached</p>
           </div>
        ) : (
          (hideUnprovidedArtifacts 
            ? DOCUMENT_CONFIG.filter(config => editableFiles.some(f => f.type === config.type))
            : DOCUMENT_CONFIG
          ).map((config) => {
            const file = editableFiles.find(f => f.type === config.type);
            const isDraggingOver = dragOverType === config.type;
            
            return (
              <div 
                key={config.type} 
                onDragOver={(e) => handleDragOver(e, config.type)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, config.type)}
                className={`flex items-center justify-between p-2.5 md:p-4 rounded-xl md:rounded-2xl border transition-all group relative ${
                  isDraggingOver ? 'bg-indigo-50 border-indigo-600 border-dashed scale-[1.02] shadow-xl z-10' :
                  file ? 'bg-white border-slate-200 hover:border-indigo-600 hover:shadow-md' : 
                  config.mandatory ? 'bg-rose-50 border-rose-200' : 'bg-slate-50/50 border-dashed border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 md:gap-4 min-w-0 flex-1">
                  <div 
                    onClick={() => file && handlePreview(file)}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl transition-all shrink-0 flex items-center justify-center ${
                      file 
                        ? 'bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-600 hover:text-white shadow-sm' 
                        : config.mandatory ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] md:text-xs font-black truncate uppercase tracking-tight ${file ? 'text-slate-900' : config.mandatory ? 'text-rose-900' : 'text-slate-400'}`}>
                      {config.type} {config.mandatory && <span className="text-[7px] md:text-[9px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-md ml-1 font-black uppercase tracking-widest">Req</span>}
                    </p>
                    {file ? (
                      <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                        <span className="text-[7px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest">
                          {formatFileSize(file.size || 0)}
                        </span>
                        <span className="w-0.5 h-0.5 bg-slate-200 rounded-full"></span>
                        <span className="text-[7px] md:text-[9px] text-emerald-600 font-black uppercase tracking-widest">Verified</span>
                      </div>
                    ) : (
                      <p className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest mt-0.5 ${config.mandatory ? 'text-rose-600' : 'text-rose-400'}`}>
                        {config.mandatory ? 'Required - Not Provided' : 'Not Provided'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  {canResubmit && (
                    <>
                      {file && (
                        <button
                          onClick={() => handleRemoveFile(config.type)}
                          className="flex w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg transition-all shrink-0 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white items-center justify-center shadow-sm active:scale-95"
                          title="Remove file"
                        >
                          <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <label className="cursor-pointer w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg transition-all shrink-0 bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center shadow-sm border border-slate-200 active:scale-95">
                        <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange(e, config.type)} />
                      </label>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const previousReviewMatch = submission.iqaRemarks?.match(/^\[PREVIOUS REVIEW \(Rev (\d+)\)\]: (.*)/s);
  const isPreviousReview = !!previousReviewMatch;
  const displayRemarks = isPreviousReview ? previousReviewMatch[2] : submission.iqaRemarks;
  const reviewTitle = isPreviousReview ? `Previous IQA Human Review (Rev ${previousReviewMatch[1]})` : "IQA Human Review";

  const iqaReviewCard = submission.iqaRemarks && (
    <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center border shadow-sm ${
          isPreviousReview 
            ? 'bg-slate-100 text-slate-500 border-slate-200' 
            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
        }`}>
          {isPreviousReview ? (
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-tight">{reviewTitle}</h3>
          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Official Compliance Verdict</p>
        </div>
      </div>
      <div className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl shadow-inner relative">
        <svg className="absolute top-2 right-4 md:top-4 md:right-6 w-8 h-8 md:w-12 md:h-12 text-slate-200/50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3C14.017 1.89543 14.9124 1 16.017 1H19.017C21.2261 1 23.017 2.79086 23.017 5V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM1.017 21L1.017 18C1.017 16.8954 1.91243 16 3.017 16H6.017C6.56928 16 7.017 15.5523 7.017 15V9C7.017 8.44772 6.56928 8 6.017 8H3.017C1.91243 8 1.017 7.10457 1.017 6V3L1.017 3C1.017 1.89543 1.91243 1 3.017 1H6.017C8.22614 1 10.017 2.79086 10.017 5V15C10.017 18.3137 7.33071 21 4.017 21H1.017Z" />
        </svg>
        <p className="text-slate-800 font-bold italic text-sm md:text-lg leading-relaxed relative z-10">
          {displayRemarks}
        </p>
      </div>
    </div>
  );

  const revisePackageCard = canResubmit && (
    <div className="bg-white border-2 border-orange-100 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-xl shadow-orange-100/20 animate-in slide-in-from-top-2">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-5">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 text-orange-600 rounded-lg md:rounded-2xl flex items-center justify-center shrink-0">
             <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
             </svg>
          </div>
          <div>
            <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-widest leading-none">Revise Package</h3>
            <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Address feedback and re-upload artifacts</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-md hidden lg:block">
           <p className="text-[9px] font-bold text-orange-800 leading-relaxed bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
             Ensure all corrected files are uploaded in the Digital Artifacts section above before submitting.
           </p>
        </div>

        <button 
          onClick={handleResubmit}
          disabled={isResubmitting || !hasUnsavedChanges || hasMissingMandatory}
          className={`w-full md:w-auto px-6 py-2.5 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[180px] ${
            hasUnsavedChanges && !isResubmitting && !hasMissingMandatory
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isResubmitting ? (
             <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          ) : (
            <>
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Submit Revisions
            </>
          )}
        </button>
      </div>
    </div>
  );

  const handleSavePDF = async (file: FAIFile, blob: Blob) => {
    if (!file.storagePath) {
      alert('Cannot save changes to a file that is not in storage.');
      return;
    }

    try {
      // Convert blob to File object
      const editedFile = new File([blob], file.name, { type: 'application/pdf' });
      
      // Upload with upsert: true (handled by storageService)
      await uploadFile(editedFile, file.storagePath);
      
      // Refresh submission data to reflect changes
      if (onRefreshSubmission) {
        await onRefreshSubmission();
      }
      
      alert('PDF changes saved successfully!');
    } catch (error) {
      console.error('Failed to save PDF changes:', error);
      alert('Failed to save PDF changes. Please try again.');
    }
  };

  return (
    <>
      {previewingFile && (
        <FilePreviewModal 
          file={previewingFile} 
          userRole={userRole}
          onClose={() => {
            setPreviewingFile(null);
            setStartWithEdit(false);
          }} 
          onSavePDF={(blob) => handleSavePDF(previewingFile, blob)}
          initialEditMode={startWithEdit}
        />
      )}

      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {uploadError && (
          <ErrorModal 
            title="Upload Error" 
            message={uploadError} 
            onClose={() => setUploadError(null)} 
          />
        )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg md:rounded-xl transition-all text-slate-600 active:scale-95 shrink-0 border border-slate-100 mt-1"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 md:gap-y-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                {submission.partName}
              </h1>
              <div className="flex items-center gap-2 scale-95 md:scale-100 origin-left">
                <StatusBadge status={submission.status} />
              </div>
            </div>
            <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-slate-900 font-black uppercase tracking-widest">PN:</span> {submission.id}
              <span className="hidden md:inline w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
              <span className="text-slate-900 font-black uppercase tracking-widest">Supplier:</span> {submission.supplierName}
            </p>
          </div>
        </div>
      </div>

      {isSupplier && canResubmit ? (
        <div className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-8">
              {iqaReviewCard}
            </div>
            <div className="lg:col-span-4">
              {packageMeta}
            </div>
          </div>
          {digitalArtifacts}
          {revisePackageCard}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            
            {/* IQA Internal Intelligence - Hidden for Suppliers and Completed Reviews */}
            {isIQA && submission.status !== SubmissionStatus.APPROVED && submission.status !== SubmissionStatus.REJECTED && (
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      submission.status === SubmissionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      submission.status === SubmissionStatus.REJECTED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight uppercase leading-none">Audit Intelligence</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Automated Compliance Analysis</p>
                    </div>
                  </div>
                  
                  {submission.aiAnalysis && (
                    <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest whitespace-nowrap self-start sm:self-center shadow-sm ${
                      submission.aiAnalysis.overallVerdict === 'APPROVED' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : submission.aiAnalysis.overallVerdict === 'ERROR'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      AI Verdict: {submission.aiAnalysis.overallVerdict}
                    </div>
                  )}
                </div>

                <div className="p-6 md:p-8 bg-slate-50 border border-slate-100 rounded-3xl mb-8 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600/20"></div>
                  <p className="text-slate-700 font-bold text-base md:text-lg leading-relaxed italic relative z-10">
                    {submission.aiAnalysis?.summary || "Analyzing digital artifacts for regulatory and technical markers..."}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Verification Checklist</h3>
                    {submission.aiAnalysis?.details && (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{submission.aiAnalysis.details.length} Checkpoints</span>
                    )}
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    {submission.aiAnalysis?.details?.map((detail, idx) => {
                      const matchingFile = findMatchingFile(detail.docType);
                      return (
                        <div key={idx} className="group p-5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-600 hover:shadow-md transition-all">
                          <div className="flex flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${
                                detail.result === 'PASS' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                                detail.result === 'FAIL' ? 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 
                                'bg-slate-300'
                              }`}></div>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight block truncate">{detail.docType}</span>
                                <div className="flex items-center gap-2 mt-1 truncate">
                                  {!matchingFile && (
                                    <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest flex items-center gap-1">
                                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Missing Record
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="shrink-0">
                              <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                detail.result === 'PASS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                detail.result === 'FAIL' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                              }`}>
                                {detail.result}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-50">
                            <p className="text-xs md:text-sm text-slate-500 font-bold leading-relaxed italic tracking-tight">"{detail.notes}"</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Status Tracking Placeholder - Fills the layout void */}
            {isSupplier && isPending && (
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-10 md:p-16 shadow-sm flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                  <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="max-w-md">
                  <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest">Audit in Progress</h3>
                  <p className="text-slate-500 font-medium text-xs md:text-sm mt-2 leading-relaxed">
                    Your FAI package is currently being evaluated by the IQA compliance team. Official human feedback will appear here once the review is finalized.
                  </p>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full bg-indigo-200 animate-bounce`} style={{ animationDelay: `${i * 150}ms` }}></div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Panel (IQA ONLY) */}
            {needsDecision && (
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-xl shadow-indigo-100/10 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
                  <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight">Official Validation</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Review Remarks</label>
                    <textarea 
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Provide official feedback for the supplier..."
                      className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-xs md:text-sm text-slate-800 shadow-inner resize-none"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => onDecision('APPROVED', remarks)}
                      disabled={!remarks.trim()}
                      className="py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Release Approval
                    </button>
                    <button 
                      onClick={() => onDecision('REJECTED', remarks)}
                      disabled={!remarks.trim()}
                      className="py-3.5 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Issue Rejection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Resubmit Panel */}
            {canResubmit && revisePackageCard}

            {/* IQA Human Review Remarks */}
            {submission.iqaRemarks && (isIQA || submission.status === SubmissionStatus.APPROVED || submission.status === SubmissionStatus.REJECTED) && iqaReviewCard}
          </div>

          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            {packageMeta}
            {!isSupplier && submission.status !== SubmissionStatus.APPROVED && submission.status !== SubmissionStatus.REJECTED && digitalArtifacts}
          </div>

          {(isSupplier || (isIQA && (submission.status === SubmissionStatus.APPROVED || submission.status === SubmissionStatus.REJECTED))) && (
            <div className="lg:col-span-12">
              {digitalArtifacts}
            </div>
          )}
        </div>
      )}
    </div>
  </>
);
};

export default SubmissionDetail;
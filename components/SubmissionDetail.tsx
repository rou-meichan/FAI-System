import React, { useState, useEffect } from 'react';
import { FAISubmission, SubmissionStatus, UserRole, FAIFile, DocType } from '../types';
import { StatusBadge } from './IQADashboard';
import { DOCUMENT_CONFIG } from '../constants';
import PDFPreview from './PDFPreview';
import { base64ToBlob } from '../src/utils/fileUtils';

interface SubmissionDetailProps {
  submission: FAISubmission;
  userRole: UserRole;
  onClose: () => void;
  onDecision: (decision: 'APPROVED' | 'REJECTED', remarks: string) => void;
  onUpdateSubmission?: (id: string, files: FAIFile[]) => void;
}

const FilePreviewModal: React.FC<{ file: FAIFile; onClose: () => void }> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-2 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-full max-h-[95vh] md:max-h-[90vh] rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 tracking-tight text-xs md:text-sm truncate max-w-[140px] md:max-w-none">{file.name}</h3>
              <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest">{file.type}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-xl text-slate-400 transition-all active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 bg-slate-50 flex items-center justify-center p-2 md:p-4 overflow-auto">
          {file.data ? (
            file.mimeType === 'application/pdf' ? (
              <PDFPreview 
                data={file.data} 
                title={file.name}
                className="w-full h-full rounded-lg md:rounded-xl shadow-inner border border-slate-200 bg-white"
              />
            ) : (
              <img src={file.data} alt={file.name} className="max-w-full max-h-full object-contain shadow-xl rounded-lg md:rounded-xl" />
            )
          ) : (
            <div className="text-center p-10 bg-white rounded-3xl border border-slate-200 mx-4">
              <p className="text-slate-400 font-bold italic text-xs md:text-sm">Preview simulation unavailable for this record.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SubmissionDetail: React.FC<SubmissionDetailProps> = ({ 
  submission, 
  userRole, 
  onClose, 
  onDecision,
  onUpdateSubmission 
}) => {
  const [remarks, setRemarks] = useState('');
  const [previewingFile, setPreviewingFile] = useState<FAIFile | null>(null);
  const [editableFiles, setEditableFiles] = useState<FAIFile[]>(submission.files);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    setEditableFiles(submission.files);
  }, [submission]);

  const isIQA = userRole === 'IQA';
  const isSupplier = userRole === 'SUPPLIER';
  const needsDecision = submission.status === SubmissionStatus.PENDING_REVIEW && isIQA;
  const canResubmit = submission.status === SubmissionStatus.REJECTED && isSupplier;
  const isPending = submission.status === SubmissionStatus.PENDING_REVIEW || 
                  submission.status === SubmissionStatus.AI_REVIEWING || 
                  submission.status === SubmissionStatus.PENDING_AI;
  
  const formattedDate = new Date(submission.timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handlePreview = (file: FAIFile) => {
    if (file.mimeType === 'application/pdf') {
      try {
        const blob = base64ToBlob(file.data!, 'application/pdf');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Failed to open PDF:', error);
      }
    } else {
      setPreviewingFile(file);
    }
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
  const providedMandatory = editableFiles.filter(f => mandatoryTypes.includes(f.type)).length;
  const totalMandatory = mandatoryTypes.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocType) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFile: FAIFile = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          data: dataUrl,
          isMandatory: DOCUMENT_CONFIG.find(c => c.type === type)?.mandatory || false,
        };
        
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
    }
  };

  const handleResubmit = () => {
    if (onUpdateSubmission) {
      setIsResubmitting(true);
      onUpdateSubmission(submission.id, editableFiles);
      setTimeout(() => {
        setIsResubmitting(false);
        onClose();
      }, 500);
    }
  };

  const hasUnsavedChanges = JSON.stringify(editableFiles) !== JSON.stringify(submission.files);

  const packageMeta = (
    <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Package Meta</h3>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entity</p>
          <p className="text-xs font-black text-slate-900 truncate">{submission.supplierName}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt Date</p>
          <p className="text-xs font-black text-slate-900">{formattedDate}</p>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 mt-4">
        <div className="bg-slate-50 p-3 rounded-xl flex items-start gap-3 border border-slate-100">
          <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[9px] font-bold text-slate-500 leading-normal uppercase tracking-tight">
            This record is secured and archived for audit compliance.
          </p>
        </div>
      </div>
    </div>
  );

  const hideUnprovidedArtifacts = isSupplier && (
    submission.status === SubmissionStatus.APPROVED || 
    submission.status === SubmissionStatus.PENDING_REVIEW
  );

  const digitalArtifacts = (
    <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Digital Artifacts</h3>
        </div>
      </div>
      
      <div className={`flex-1 ${isSupplier ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5' : 'space-y-2 overflow-y-auto max-h-[350px] pr-2'} [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300`}>
        {editableFiles.length === 0 ? (
           <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
             <p className="text-[10px] font-bold text-slate-300 uppercase">No artifacts attached</p>
           </div>
        ) : (
          (hideUnprovidedArtifacts 
            ? DOCUMENT_CONFIG.filter(config => editableFiles.some(f => f.type === config.type))
            : DOCUMENT_CONFIG
          ).map((config) => {
            const file = editableFiles.find(f => f.type === config.type);
            return (
              <div 
                key={config.type} 
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group ${
                  file ? 'bg-slate-50 border-slate-100 hover:border-indigo-200' : 'bg-white border-dashed border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    onClick={() => file && handlePreview(file)}
                    className={`p-2 rounded-lg transition-all shrink-0 ${
                      file 
                        ? 'bg-white text-slate-400 cursor-pointer hover:bg-indigo-600 hover:text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-200'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-black truncate ${file ? 'text-slate-900' : 'text-slate-400'}`}>
                      {file ? file.name : 'Not Provided'}
                    </p>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest truncate">{config.type}</p>
                  </div>
                </div>
                
                {canResubmit && (
                  <label className="cursor-pointer p-1.5 rounded-lg transition-all shrink-0 ml-2 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, config.type)} />
                  </label>
                )}
              </div>
            );
          })
        )}
      </div>
      
    </div>
  );

  const iqaReviewCard = submission.iqaRemarks && (
    <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">IQA Human Review</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Official Compliance Verdict</p>
        </div>
      </div>
      <div className="p-4 md:p-5 bg-slate-50 border-l-4 border-indigo-600 rounded-r-2xl shadow-inner">
        <p className="text-slate-800 font-black italic text-sm md:text-base leading-relaxed">"{submission.iqaRemarks}"</p>
      </div>
    </div>
  );

  const revisePackageCard = canResubmit && (
    <div className="bg-white border-2 border-orange-100 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-xl shadow-orange-100/20 animate-in slide-in-from-top-2">
      <div className="flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
             </svg>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight leading-none">Revise Package</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Address feedback and re-upload artifacts</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-md hidden lg:block">
           <p className="text-[9px] font-bold text-orange-800 leading-relaxed bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
             Ensure all corrected files are uploaded in the Digital Artifacts section above before submitting.
           </p>
        </div>

        <button 
          onClick={handleResubmit}
          disabled={isResubmitting || !hasUnsavedChanges}
          className={`px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 min-w-[200px] ${
            hasUnsavedChanges && !isResubmitting
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isResubmitting ? (
             <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Submit Revisions
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {previewingFile && (
        <FilePreviewModal file={previewingFile} onClose={() => setPreviewingFile(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            <button 
              onClick={onClose} 
              className="p-2 -ml-2 hover:bg-slate-200 rounded-full transition-all text-slate-600 active:scale-95 shrink-0"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase truncate">
                  {submission.partNumber}
                </h1>
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[8px] md:text-[10px] font-black rounded-lg uppercase tracking-widest shrink-0">
                  Rev {submission.revision}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-[10px] md:text-sm truncate mt-1">
                Package ID: {submission.id} • {submission.supplierName}
              </p>
            </div>
          </div>
          <div className="shrink-0 pt-1">
            <StatusBadge status={submission.status} />
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
            
            {/* IQA Internal Intelligence - Hidden for Suppliers */}
            {isIQA && (
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${
                      submission.status === SubmissionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' :
                      submission.status === SubmissionStatus.REJECTED ? 'bg-rose-50 text-rose-600' :
                      'bg-indigo-50 text-indigo-600'
                    }`}>
                      <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base md:text-xl font-black text-slate-900 tracking-tight uppercase">Audit Intelligence</p>
                    </div>
                  </div>
                  
                  {submission.aiAnalysis && (
                    <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest whitespace-nowrap self-start sm:self-center ${
                      submission.aiAnalysis.overallVerdict === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      AI: {submission.aiAnalysis.overallVerdict}
                    </div>
                  )}
                </div>

                <div className="p-5 md:p-8 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl mb-4 md:mb-6 shadow-inner">
                  <p className="text-slate-700 font-bold text-xs md:text-base leading-relaxed italic">
                    {submission.aiAnalysis?.summary || "Analyzing digital artifacts for regulatory and technical markers..."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification Checklist</h3>
                    {submission.aiAnalysis && (
                      <span className="text-[8px] font-bold text-slate-300 uppercase">{submission.aiAnalysis.details.length} Items</span>
                    )}
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    {submission.aiAnalysis?.details.map((detail, idx) => {
                      const matchingFile = findMatchingFile(detail.docType);
                      return (
                        <div key={idx} className="group p-4 md:p-5 bg-white border border-slate-100 rounded-xl md:rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                              <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0 ${
                                detail.result === 'PASS' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                                detail.result === 'FAIL' ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                                'bg-slate-300'
                              }`}></div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight block truncate">{detail.docType}</span>
                                <div className="flex items-center gap-2 mt-0.5 truncate">
                                  {matchingFile ? (
                                    <span className="text-[8px] md:text-[10px] text-emerald-600 font-bold flex items-center gap-1 truncate">
                                      <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="truncate">Artifact Linked</span>
                                    </span>
                                  ) : (
                                    <span className="text-[8px] md:text-[10px] text-rose-400 font-bold flex items-center gap-1">
                                      <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Not Provided
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="shrink-0">
                              <div className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest ${
                                detail.result === 'PASS' ? 'bg-emerald-50 text-emerald-700' : 
                                detail.result === 'FAIL' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'
                              }`}>
                                {detail.result}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-50">
                            <p className="text-[10px] md:text-[11px] text-slate-500 font-medium leading-relaxed italic">"{detail.notes}"</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Status Tracking Placeholder - Fills the layout void */}
            {isSupplier && isPending && !submission.iqaRemarks && (
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-10 md:p-16 shadow-sm flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                  <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="max-w-md">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Audit in Progress</h3>
                  <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
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
              <div className="bg-white border-2 border-indigo-100 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-xl shadow-indigo-100/20 animate-in slide-in-from-top-2">
                <h3 className="text-base md:text-lg font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <span className="w-1 h-5 md:w-1.5 md:h-6 bg-indigo-600 rounded-full"></span>
                  Official Validation
                </h3>
                <div className="space-y-5 md:space-y-6">
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Review Remarks</label>
                    <textarea 
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Provide official feedback for the supplier..."
                      className="w-full h-24 md:h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-xs md:text-sm text-slate-800 shadow-inner"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <button 
                      onClick={() => onDecision('APPROVED', remarks)}
                      disabled={!remarks.trim()}
                      className="py-3.5 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Release Approval
                    </button>
                    <button 
                      onClick={() => onDecision('REJECTED', remarks)}
                      disabled={!remarks.trim()}
                      className="py-3.5 md:py-4 bg-white text-rose-600 border border-rose-100 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50"
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
            {submission.iqaRemarks && iqaReviewCard}
          </div>

          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            {packageMeta}
            {!isSupplier && digitalArtifacts}
          </div>

          {isSupplier && (
            <div className="lg:col-span-12">
              {digitalArtifacts}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubmissionDetail;
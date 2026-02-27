
import React, { useState, useEffect } from 'react';
import { base64ToBlob } from '../src/utils/fileUtils';

interface PDFPreviewProps {
  data: string;
  title: string;
  className?: string;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ data, title, className }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;

    try {
      const blob = base64ToBlob(data, 'application/pdf');
      const objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } catch (error) {
      console.error('Failed to create PDF preview URL:', error);
    }
  }, [data]);

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preparing Preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className + " relative group"}>
      <object 
        data={url} 
        type="application/pdf"
        className="w-full h-full rounded-xl"
      >
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Preview Blocked</h4>
          <p className="text-[10px] text-slate-500 font-medium mb-6">Chrome's security policy is preventing the inline preview in this environment.</p>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Open in New Tab
          </a>
        </div>
      </object>
    </div>
  );
};

export default PDFPreview;

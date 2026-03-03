
import React, { useState, useEffect } from 'react';
import { fetchProfile, updateProfile } from '../services/faiService';

interface SupplierLimitEditorProps {
  supplierId: string;
  onUpdate?: (newLimit: number) => void;
}

const LIMIT_OPTIONS = [
  { label: '2MB', value: 2 * 1024 * 1024 },
  { label: '5MB', value: 5 * 1024 * 1024 },
  { label: '10MB', value: 10 * 1024 * 1024 },
  { label: '20MB', value: 20 * 1024 * 1024 },
  { label: '50MB', value: 50 * 1024 * 1024 },
];

const SupplierLimitEditor: React.FC<SupplierLimitEditorProps> = ({ supplierId, onUpdate }) => {
  const [currentLimit, setCurrentLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadLimit = async () => {
      try {
        const profile = await fetchProfile(supplierId);
        setCurrentLimit(profile.max_upload_size || 2 * 1024 * 1024);
      } catch (error) {
        console.error('Failed to load supplier limit:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLimit();
  }, [supplierId]);

  const handleUpdateLimit = async (newLimit: number) => {
    setIsUpdating(true);
    setSuccess(false);
    try {
      const result = await updateProfile(supplierId, { max_upload_size: newLimit });
      if (!result || result.length === 0) {
        throw new Error('No profile found to update');
      }
      setCurrentLimit(newLimit);
      setSuccess(true);
      if (onUpdate) onUpdate(newLimit);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Failed to update supplier limit:', error);
      alert(`Failed to update limit: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="h-4 w-24 bg-slate-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          value={currentLimit || 2097152}
          onChange={(e) => handleUpdateLimit(Number(e.target.value))}
          disabled={isUpdating}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer min-w-[100px]"
        >
          {LIMIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {isUpdating && (
          <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}

        {success && (
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight animate-in fade-in slide-in-from-left-2">
            Updated!
          </span>
        )}
      </div>
    </div>
  );
};

export default SupplierLimitEditor;

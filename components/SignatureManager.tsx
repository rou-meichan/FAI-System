import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '../services/supabase';

interface SignatureManagerProps {
  pdfUrl?: string; // Optional: if provided, allows inserting signature
  onInsert?: (signatureUrl: string) => void;
}

const SignatureManager: React.FC<SignatureManagerProps> = ({ pdfUrl, onInsert }) => {
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    fetchSignature();
  }, []);

  const fetchSignature = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('signature_path')
      .eq('id', user.id)
      .single();

    if (profile?.signature_path) {
      setSignaturePath(profile.signature_path);
      // Get signed URL
      const { data } = await supabase.storage
        .from('user_signatures')
        .createSignedUrl(profile.signature_path, 60);
      if (data?.signedUrl) setSignaturePreviewUrl(data.signedUrl);
    }
    setIsLoading(false);
  };

  const saveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    
    // Get the canvas blob before any async operations or state updates
    // because setting isLoading to true unmounts the canvas component
    const canvas = sigCanvas.current.getCanvas();
    const blob = await new Promise<Blob | null>((resolve) => 
      canvas.toBlob(resolve, 'image/png')
    );
    
    if (!blob) return;

    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const path = `${user.id}/signature.png`;
    const { error: uploadError } = await supabase.storage
      .from('user_signatures')
      .upload(path, blob, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ signature_path: path })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      setSignaturePath(path);
      setIsEditMode(false);
      fetchSignature();
      if (onInsert) {
        const url = URL.createObjectURL(blob);
        onInsert(url);
      }
    }
    setIsLoading(false);
  };

  const insertSignatureToPDF = async () => {
    if (!signaturePath) return;
    setIsLoading(true);

    try {
      if (onInsert) {
        const { data } = await supabase.storage
          .from('user_signatures')
          .download(signaturePath);
        
        if (!data) throw new Error('Signature not found');
        const url = URL.createObjectURL(data);
        onInsert(url);
      } else if (pdfUrl) {
        const response = await fetch(pdfUrl);
        const pdfBytes = await response.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const { data } = await supabase.storage
          .from('user_signatures')
          .download(signaturePath);
        
        if (!data) throw new Error('Signature not found');
        const sigBytes = await data.arrayBuffer();
        const sigImage = await pdfDoc.embedPng(sigBytes);
        
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();
        
        lastPage.drawImage(sigImage, {
          x: width - 150,
          y: 50,
          width: 100,
          height: 50,
        });
        
        const pdfBytesOut = await pdfDoc.save();
        const blob = new Blob([pdfBytesOut], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'signed_document.pdf';
        link.click();
      }
    } catch (error) {
      console.error('PDF insertion error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Signature Management</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-2"></div>
          Loading...
        </div>
      ) : (!signaturePath || isEditMode) ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50">
            <SignatureCanvas 
              ref={sigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'w-full h-48' }}
            />
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => sigCanvas.current?.clear()} 
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={saveSignature} 
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
            {signaturePreviewUrl && <img src={signaturePreviewUrl} alt="Signature" className="w-full h-auto" />}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={insertSignatureToPDF} 
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              Insert on PDF
            </button>
            <button 
              onClick={() => setIsEditMode(true)} 
              className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
            >
              Edit / Create New
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SignatureManager;

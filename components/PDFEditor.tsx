import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import SignatureManager from './SignatureManager';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFEditorProps {
  url: string;
  onSave: (blob: Blob) => Promise<void>;
  onClose: () => void;
  readOnly?: boolean;
  fileName?: string;
}

interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'draw' | 'eraser' | 'signature';
  pageNumber: number;
  x: number;
  y: number;
  content?: string;
  color?: string;
  points?: { x: number, y: number }[];
  width?: number;
  height?: number;
  fontSize?: number;
  imageUrl?: string;
}

interface PDFEditorPageProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  scale: number;
  rotation: number;
  annotations: Annotation[];
  tool: string;
  isDrawing: boolean;
  drawingPage: number | null;
  currentPoints: { x: number, y: number }[];
  highlightColor: string;
  highlightThickness: number;
  drawColor: string;
  drawThickness: number;
  activeTextInput: { pageNum: number, x: number, y: number, width?: number, color?: string, fontSize?: number, initialContent?: string, id?: string } | null;
  activeSignature: { pageNum: number, x: number, y: number, width?: number, height?: number, imageUrl: string } | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => void;
  onMouseUp: (pageNum: number) => void;
  onTextSubmit: (content: string, x: number, y: number, width: number, color: string, fontSize: number, pageNum: number, id?: string) => void;
  onTextDelete: (id: string) => void;
  onCloseTextInput: (pageNum: number, x: number, y: number, id?: string, initialContent?: string) => void;
  onSignatureSubmit: (imageUrl: string, x: number, y: number, width: number, height: number, pageNum: number) => void;
  onSignatureCancel: () => void;
}

const parseHtmlToTokens = (html: string, defaultColor: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  const tokens: { text: string, color: string }[] = [];

  const traverse = (node: Node, currentColor: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        tokens.push({ text: node.textContent, color: currentColor });
      }
    } else if (node.nodeName === 'BR') {
      tokens.push({ text: '\n', color: currentColor });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let color = currentColor;
      if (el.style && el.style.color) {
        color = el.style.color;
      } else if (el.nodeName === 'FONT' && el.getAttribute('color')) {
        color = el.getAttribute('color') || currentColor;
      }

      const isBlock = el.nodeName === 'DIV' || el.nodeName === 'P';
      if (isBlock && tokens.length > 0 && tokens[tokens.length - 1].text !== '\n') {
        tokens.push({ text: '\n', color: currentColor });
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        traverse(el.childNodes[i], color);
      }

      if (isBlock && tokens.length > 0 && tokens[tokens.length - 1].text !== '\n') {
        tokens.push({ text: '\n', color: currentColor });
      }
    }
  };
  traverse(div, defaultColor);
  return tokens;
};

const TextInputOverlay: React.FC<{
  activeTextInput: NonNullable<PDFEditorPageProps['activeTextInput']>;
  scale: number;
  tool: string;
  onTextSubmit: PDFEditorPageProps['onTextSubmit'];
  onTextDelete: PDFEditorPageProps['onTextDelete'];
  onCloseTextInput: PDFEditorPageProps['onCloseTextInput'];
}> = ({ activeTextInput, scale, tool, onTextSubmit, onTextDelete, onCloseTextInput }) => {
  const [content, setContent] = useState(activeTextInput.initialContent || '');
  const [x, setX] = useState(activeTextInput.x);
  const [y, setY] = useState(activeTextInput.y);
  const [width, setWidth] = useState(activeTextInput.width || 0.3);
  const [color, setColor] = useState(activeTextInput.color || '#000000');
  const [baseColor] = useState(activeTextInput.color || '#000000');
  const [fontSize, setFontSize] = useState(activeTextInput.fontSize || 16);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(activeTextInput.initialContent || '');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const activeTextInputRef = useRef(activeTextInput);
  const onCloseTextInputRef = useRef(onCloseTextInput);
  
  useEffect(() => {
    activeTextInputRef.current = activeTextInput;
    onCloseTextInputRef.current = onCloseTextInput;
  }, [activeTextInput, onCloseTextInput]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (inputRef.current && inputRef.current.contains(range.commonAncestorContainer)) {
        setSavedRange(range);
      }
    }
  }, []);

  const editableDiv = (
    <div
      ref={inputRef}
      contentEditable
      suppressContentEditableWarning
      className="w-full h-full bg-transparent outline-none overflow-hidden"
      style={{ fontSize: `${fontSize * scale * 1.5}px`, fontFamily: 'sans-serif', color: baseColor }}
      onInput={(e) => {
        contentRef.current = e.currentTarget.innerHTML;
        saveSelection();
      }}
      onKeyUp={saveSelection}
      onMouseUp={saveSelection}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          const ati = activeTextInputRef.current;
          onCloseTextInputRef.current(ati.pageNum, ati.x, ati.y, ati.id, ati.initialContent);
        }
      }}
    />
  );

  useEffect(() => {
    if (inputRef.current && !inputRef.current.innerHTML && activeTextInput.initialContent) {
      inputRef.current.innerHTML = activeTextInput.initialContent;
    }
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        saveSelection();
      }
    }, 50);
  }, [activeTextInput.initialContent, saveSelection]);

  const handleSave = useCallback(() => {
    const finalContent = contentRef.current || inputRef.current?.innerHTML || '';
    let finalY = y;
    if (containerRef.current && containerRef.current.parentElement) {
      const rect = containerRef.current.getBoundingClientRect();
      const parentRect = containerRef.current.parentElement.getBoundingClientRect();
      const heightPercentage = rect.height / parentRect.height;
      finalY = y - heightPercentage / 2;
    }
    if (finalContent.trim() && finalContent !== '<br>') {
      onTextSubmit(finalContent, x, finalY, width, baseColor, fontSize, activeTextInput.pageNum, activeTextInput.id);
    } else if (activeTextInput.id) {
      onTextDelete(activeTextInput.id);
    } else {
      onCloseTextInput(activeTextInput.pageNum, activeTextInput.x, activeTextInput.y, activeTextInput.id, activeTextInput.initialContent);
    }
  }, [x, y, width, fontSize, color, activeTextInput, onTextSubmit, onTextDelete, onCloseTextInput]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    let isMounted = true;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSaveRef.current();
      }
    };
    
    // Delay adding the listener so it doesn't catch the mousedown event that opened it
    setTimeout(() => {
      if (isMounted) {
        document.addEventListener('mousedown', handleClickOutside, true);
      }
    }, 0);
    
    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      
      if (isDragging) {
        const newX = (e.clientX - rect.left) / rect.width - dragOffset.x;
        const newY = (e.clientY - rect.top) / rect.height - dragOffset.y;
        setX(Math.max(0, Math.min(newX, 1)));
        setY(Math.max(0, Math.min(newY, 1)));
      } else if (isResizing) {
        const newWidth = (e.clientX - rect.left) / rect.width - x;
        setWidth(Math.max(0.05, Math.min(newWidth, 1 - x)));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, x, dragOffset]);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (inputRef.current) {
      inputRef.current.focus();
      if (savedRange) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(savedRange);
      }
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, newColor);
      contentRef.current = inputRef.current.innerHTML;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute z-50 flex flex-col box-border"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${width * 100}%`,
        transform: 'translateY(-50%)',
        pointerEvents: (tool === 'highlight' || tool === 'draw') ? 'none' : 'auto'
      }}
    >
      {/* Toolbar */}
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-md shadow-lg border border-gray-200 flex items-center p-1 gap-1 whitespace-nowrap">
        <div className="relative group">
          <button className="p-1.5 hover:bg-gray-100 rounded flex flex-col items-center justify-center w-8 h-8">
            <span className="font-serif font-bold text-sm leading-none">A</span>
            <div className="w-4 h-1 mt-0.5 rounded-full" style={{ backgroundColor: color }}></div>
          </button>
          <input 
            type="color" 
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <button onClick={() => setFontSize(f => Math.min(f + 2, 72))} className="p-1.5 hover:bg-gray-100 rounded w-8 h-8 flex items-center justify-center font-serif font-bold text-sm relative">
          A<svg className="absolute top-1 right-1" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </button>
        <button onClick={() => setFontSize(f => Math.max(f - 2, 8))} className="p-1.5 hover:bg-gray-100 rounded w-8 h-8 flex items-center justify-center font-serif font-bold text-sm relative">
          A<svg className="absolute top-1 right-1" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <button onClick={() => {
          if (activeTextInput.id) onTextDelete(activeTextInput.id);
          else onCloseTextInput(activeTextInput.pageNum, activeTextInput.x, activeTextInput.y, activeTextInput.id, activeTextInput.initialContent);
        }} className="p-1.5 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded w-8 h-8 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
        <button onClick={handleSave} className="p-1.5 hover:bg-green-50 text-gray-600 hover:text-green-600 rounded w-8 h-8 flex items-center justify-center ml-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>

      {/* Input Area */}
      <div className="relative flex items-stretch border-2 border-dashed border-blue-500 bg-white/50 group box-border">
        {/* Drag Handle */}
        <div 
          className="w-6 bg-blue-500 flex items-center justify-center cursor-move shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            if (containerRef.current && containerRef.current.parentElement) {
              const parentRect = containerRef.current.parentElement.getBoundingClientRect();
              const mouseX = (e.clientX - parentRect.left) / parentRect.width;
              const mouseY = (e.clientY - parentRect.top) / parentRect.height;
              setDragOffset({ x: mouseX - x, y: mouseY - y });
            }
            setIsDragging(true);
          }}
        >
          <svg width="12" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
        </div>
        
        {/* Text Input Wrapper */}
        <div style={{
            color: baseColor,
            fontSize: `${fontSize * scale * 1.5}px`,
            minHeight: `${fontSize * scale * 1.5 * 1.2}px`,
            lineHeight: 1.2,
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap'
        }} className="w-full">
          {editableDiv}
        </div>

        {/* Resize Handle */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize"
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        />
      </div>
    </div>
  );
};

const SignatureOverlay: React.FC<{
  activeSignature: NonNullable<PDFEditorPageProps['activeSignature']>;
  scale: number;
  onSignatureSubmit: PDFEditorPageProps['onSignatureSubmit'];
  onSignatureCancel: PDFEditorPageProps['onSignatureCancel'];
}> = ({ activeSignature, scale, onSignatureSubmit, onSignatureCancel }) => {
  const [x, setX] = useState(activeSignature.x);
  const [y, setY] = useState(activeSignature.y);
  const [width, setWidth] = useState(activeSignature.width || 0.2);
  const [height, setHeight] = useState(activeSignature.height || 0.1);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    onSignatureSubmit(activeSignature.imageUrl, x, y, width, height, activeSignature.pageNum);
  }, [x, y, width, height, activeSignature, onSignatureSubmit]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    let isMounted = true;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSaveRef.current();
      }
    };
    
    setTimeout(() => {
      if (isMounted) {
        document.addEventListener('mousedown', handleClickOutside);
      }
    }, 0);
    
    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && containerRef.current.parentElement) {
      const parentRect = containerRef.current.parentElement.getBoundingClientRect();
      const img = new Image();
      img.onload = () => {
        const imgAspect = img.width / img.height;
        
        if (!activeSignature.width || !activeSignature.height) {
          const defaultWidth = 0.2;
          const pixelWidth = defaultWidth * parentRect.width;
          const pixelHeight = pixelWidth / imgAspect;
          const newHeight = pixelHeight / parentRect.height;
          setWidth(defaultWidth);
          setHeight(newHeight);
        }
      };
      img.src = activeSignature.imageUrl;
    }
  }, [activeSignature.imageUrl, activeSignature.width, activeSignature.height]);

  useEffect(() => {
    let isMounted = true;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMounted || !containerRef.current || !containerRef.current.parentElement) return;
      const parentRect = containerRef.current.parentElement.getBoundingClientRect();
      
      if (isDragging) {
        let newX = (e.clientX - parentRect.left) / parentRect.width - dragOffset.x;
        let newY = (e.clientY - parentRect.top) / parentRect.height - dragOffset.y;
        setX(Math.max(0, Math.min(newX, 1 - width)));
        setY(Math.max(0, Math.min(newY, 1 - height)));
      } else if (isResizing) {
        let newWidth = (e.clientX - parentRect.left) / parentRect.width - x;
        newWidth = Math.max(0.05, newWidth);
        
        const imgElement = containerRef.current.querySelector('img');
        const imgAspect = imgElement ? (imgElement.naturalWidth / imgElement.naturalHeight) : 2;
        
        const pixelWidth = newWidth * parentRect.width;
        const pixelHeight = pixelWidth / imgAspect;
        const newHeight = pixelHeight / parentRect.height;
        
        setWidth(newWidth);
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      isMounted = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, x, y, width, height, dragOffset]);

  return (
    <div
      ref={containerRef}
      className="absolute border-2 border-dashed border-blue-500 bg-white/20 group box-border z-50"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }}
    >
      {/* Action Buttons */}
      <div className="absolute -top-10 right-0 flex items-center bg-white shadow-lg rounded-lg border border-slate-200 overflow-hidden transition-opacity">
        <button onClick={onSignatureCancel} className="p-1.5 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded w-8 h-8 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
        <button onClick={() => onSignatureSubmit(activeSignature.imageUrl, x, y, width, height, activeSignature.pageNum)} className="p-1.5 hover:bg-green-50 text-gray-600 hover:text-green-600 rounded w-8 h-8 flex items-center justify-center ml-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>

      {/* Drag Handle */}
      <div 
        className="absolute inset-0 cursor-move"
        onMouseDown={(e) => { 
          e.preventDefault(); 
          e.stopPropagation();
          if (containerRef.current && containerRef.current.parentElement) {
            const parentRect = containerRef.current.parentElement.getBoundingClientRect();
            const mouseX = (e.clientX - parentRect.left) / parentRect.width;
            const mouseY = (e.clientY - parentRect.top) / parentRect.height;
            setDragOffset({ x: mouseX - x, y: mouseY - y });
          }
          setIsDragging(true); 
        }}
      >
        <img src={activeSignature.imageUrl} alt="Signature" className="w-full h-full pointer-events-none" />
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-10"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsResizing(true); }}
      />
    </div>
  );
};

const PADDING_ADJUSTMENT = 2;

const PDFEditorPage: React.FC<PDFEditorPageProps> = ({
  pdf, pageNum, scale, rotation, annotations, tool, isDrawing, drawingPage, currentPoints,
  highlightColor, highlightThickness, drawColor, drawThickness,
  activeTextInput, activeSignature, onMouseDown, onMouseMove, onMouseUp, onTextSubmit, onTextDelete, onCloseTextInput, onSignatureSubmit, onSignatureCancel
}) => {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  const drawAnnotations = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pageAnnotations = annotations.filter(a => a.pageNumber === pageNum);
    
    pageAnnotations.forEach(ann => {
      ctx.save();
      if (ann.type === 'text' && ann.content) {
        const fontSize = (ann.fontSize || 12) * scale * 1.5;
        ctx.textBaseline = 'top';
        
        const tokens = parseHtmlToTokens(ann.content, ann.color || '#000000');
        const maxWidth = (ann.width || 0.3) * viewport.width;
        const lineHeight = fontSize * 1.2;
        let currentX = ann.x * viewport.width;
        let currentY = ann.y * viewport.height;

        const words: { text: string, color: string }[] = [];
        for (const token of tokens) {
          if (token.text === '\n') {
            words.push({ text: '\n', color: token.color });
          } else {
            const splitWords = token.text.split(/(\s+)/);
            for (const w of splitWords) {
              if (w.length > 0) words.push({ text: w, color: token.color });
            }
          }
        }

        let lineX = currentX;
        for (const word of words) {
          if (word.text === '\n') {
            currentY += lineHeight;
            lineX = currentX;
            continue;
          }

          ctx.font = `${fontSize}px sans-serif`;
          const wordWidth = ctx.measureText(word.text).width;

          if (lineX + wordWidth > currentX + maxWidth && word.text.trim().length > 0 && lineX > currentX) {
            currentY += lineHeight;
            lineX = currentX;
            if (word.text.trim().length === 0) continue;
          }

          ctx.fillStyle = word.color;
          ctx.fillText(word.text, lineX, currentY);
          lineX += wordWidth;
        }
      } else if (ann.type === 'highlight') {
        if (ann.points) {
          ctx.strokeStyle = ann.color || 'rgba(255, 255, 0, 0.4)';
          ctx.lineWidth = (ann.width || 10) * scale * 1.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ann.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x * viewport.width, p.y * viewport.height);
            else ctx.lineTo(p.x * viewport.width, p.y * viewport.height);
          });
          ctx.stroke();
        } else {
          ctx.fillStyle = ann.color || 'rgba(255, 255, 0, 0.4)';
          ctx.fillRect(
            ann.x * viewport.width, 
            ann.y * viewport.height, 
            (ann.width || 0.1) * viewport.width, 
            (ann.height || 0.02) * viewport.height
          );
        }
      } else if (ann.type === 'draw' && ann.points) {
        ctx.strokeStyle = ann.color || '#ef4444';
        ctx.lineWidth = (ann.width || 2) * scale * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ann.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x * viewport.width, p.y * viewport.height);
          else ctx.lineTo(p.x * viewport.width, p.y * viewport.height);
        });
        ctx.stroke();
      } else if (ann.type === 'signature' && ann.imageUrl) {
        const img = imageCache.current[ann.imageUrl];
        if (img) {
          ctx.drawImage(
            img,
            ann.x * viewport.width,
            ann.y * viewport.height,
            (ann.width || 0.2) * viewport.width,
            (ann.height || 0.1) * viewport.height
          );
        } else {
          const newImg = new Image();
          newImg.onload = () => {
            imageCache.current[ann.imageUrl!] = newImg;
            drawAnnotationsRef.current();
          };
          newImg.src = ann.imageUrl;
        }
      }
      ctx.restore();
    });

    if (isDrawing && drawingPage === pageNum && currentPoints.length > 0) {
      ctx.save();
      if (tool === 'draw') {
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawThickness * scale * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        currentPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x * viewport.width, p.y * viewport.height);
          else ctx.lineTo(p.x * viewport.width, p.y * viewport.height);
        });
        ctx.stroke();
      } else if (tool === 'highlight') {
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = highlightThickness * scale * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        currentPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x * viewport.width, p.y * viewport.height);
          else ctx.lineTo(p.x * viewport.width, p.y * viewport.height);
        });
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [annotations, pageNum, scale, isDrawing, drawingPage, currentPoints, tool, highlightColor, highlightThickness, drawColor, drawThickness]);

  const drawAnnotationsRef = useRef(drawAnnotations);
  useEffect(() => {
    drawAnnotationsRef.current = drawAnnotations;
  }, [drawAnnotations]);

  const renderIdRef = useRef(0);

  const renderPDF = useCallback(async () => {
    if (!pdf || !pdfCanvasRef.current) return;

    const renderId = ++renderIdRef.current;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      try {
        await renderTaskRef.current.promise;
      } catch (e) {}
    }

    try {
      const page = await pdf.getPage(pageNum);
      
      // Abort if another render was requested while waiting for getPage
      if (renderId !== renderIdRef.current) return;

      const viewport = page.getViewport({ scale: scale * 1.5, rotation });
      viewportRef.current = viewport;

      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (annotationCanvasRef.current) {
        annotationCanvasRef.current.height = viewport.height;
        annotationCanvasRef.current.width = viewport.width;
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      
      if (renderId === renderIdRef.current) {
        renderTaskRef.current = null;
        drawAnnotationsRef.current();
      }
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNum}:`, error);
      }
    }
  }, [pdf, pageNum, scale, rotation]);

  useEffect(() => {
    renderPDF();
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [renderPDF]);

  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  return (
    <div className="mb-12 last:mb-0 relative pdf-page-container">
      <canvas 
        ref={pdfCanvasRef} 
        className="block" 
      />
      <canvas 
        ref={annotationCanvasRef} 
        className="absolute top-0 left-0 block" 
        onMouseDown={(e) => onMouseDown(e, pageNum)}
        onMouseMove={(e) => onMouseMove(e, pageNum)}
        onMouseUp={() => onMouseUp(pageNum)}
        style={{ cursor: (tool === 'text' && activeTextInput) ? 'default' : (tool === 'text' && !activeTextInput) ? `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='2' y='2' width='28' height='28' fill='none' stroke='%234f46e5' stroke-width='2' stroke-dasharray='4,4'/%3E%3Cpath d='M16 6v20M10 6h12M10 26h12' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E") 16 16, text` : tool === 'eraser' ? `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='12' width='20' height='8' rx='2' fill='%23f3f4f6' stroke='%23374151' stroke-width='2'/%3E%3Crect x='6' y='12' width='6' height='8' rx='2' fill='%23ef4444' stroke='%23374151' stroke-width='2'/%3E%3C/svg%3E") 16 16, default` : tool !== 'none' ? 'crosshair' : 'inherit' }}
      />
      {activeTextInput?.pageNum === pageNum && (
        <TextInputOverlay
          key={activeTextInput.id || `new-${activeTextInput.x}-${activeTextInput.y}`}
          activeTextInput={activeTextInput}
          scale={scale}
          tool={tool}
          onTextSubmit={onTextSubmit}
          onTextDelete={onTextDelete}
          onCloseTextInput={onCloseTextInput}
        />
      )}
      {activeSignature?.pageNum === pageNum && (
        <SignatureOverlay
          activeSignature={activeSignature}
          scale={scale}
          onSignatureSubmit={onSignatureSubmit}
          onSignatureCancel={onSignatureCancel}
        />
      )}
    </div>
  );
};

const PDFEditor: React.FC<PDFEditorProps> = ({ url, onSave, onClose, readOnly = false, fileName }) => {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState<Record<number, number>>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [highlightColor, setHighlightColor] = useState('rgba(255, 255, 0, 0.4)');
  const [highlightThickness, setHighlightThickness] = useState(10);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawThickness, setDrawThickness] = useState(2);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showSignatureManager, setShowSignatureManager] = useState(false);
  const [activeSignature, setActiveSignature] = useState<{ pageNum: number, x: number, y: number, width: number, height: number, imageUrl: string } | null>(null);
  const lastTextCloseTimeRef = useRef(0);

  const toggleTool = (toolName: string) => {
    setTool(prev => prev === toolName ? 'none' : toolName);
    if (activeTextInput) {
      setActiveTextInput(null);
    }
    if (activeSignature) {
      setActiveSignature(null);
    }
  };

  const addAnnotation = (newAnnotation: Annotation) => {
    const newAnnotations = [...annotations, newAnnotation];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAnnotations(newAnnotations);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const eraseAt = (x: number, y: number, pageNum: number) => {
    const threshold = 0.05;
    let removed = false;
    
    const newAnnotations = annotations.filter(ann => {
      if (ann.pageNumber !== pageNum) return true;
      
      let hit = false;
      if (ann.type === 'highlight') {
        if (ann.points) {
          hit = ann.points.some(p => Math.hypot(p.x - x, p.y - y) < threshold);
        } else {
          hit = (x >= ann.x && x <= ann.x + (ann.width || 0.2) &&
                 y >= ann.y && y <= ann.y + (ann.height || 0.03));
        }
      } else if (ann.type === 'draw' && ann.points) {
        hit = ann.points.some(p => Math.hypot(p.x - x, p.y - y) < threshold);
      } else if (ann.type === 'text') {
        hit = Math.hypot(ann.x - x, ann.y - y) < threshold;
      }
      
      if (hit) removed = true;
      return !hit;
    });
    
    if (removed) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setAnnotations(newAnnotations);
    }
  };

  const [activeTextInput, setActiveTextInput] = useState<{ pageNum: number, x: number, y: number, width?: number, color?: string, fontSize?: number, initialContent?: string, id?: string } | null>(null);
  const [tool, setTool] = useState<'none' | 'text' | 'highlight' | 'draw' | 'eraser'>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPage, setDrawingPage] = useState<number | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSignatureSubmit = (imageUrl: string, x: number, y: number, width: number, height: number, pageNum: number) => {
    const newAnnotation: Annotation = {
      id: `signature-${Date.now()}`,
      type: 'signature',
      pageNumber: pageNum,
      x,
      y,
      width,
      height,
      imageUrl
    };
    addAnnotation(newAnnotation);
    setActiveSignature(null);
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if (tool !== 'none') return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    scrollContainerRef.current.scrollLeft -= dx;
    scrollContainerRef.current.scrollTop -= dy;
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleSignatureCancel = () => {
    setActiveSignature(null);
  };

  // Load PDF
  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(
      (loadedPdf) => {
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
      },
      (error) => {
        console.error('Error loading PDF:', error);
      }
    );
  }, [url]);

  // Track current page on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const pages = container.querySelectorAll('.pdf-page-container');
      let current = 1;
      let minDiff = Infinity;

      pages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        // Check which page is closest to the top of the viewport
        const diff = Math.abs(rect.top - 100); // Offset for toolbar
        if (diff < minDiff) {
          minDiff = diff;
          current = index + 1;
        }
      });
      setCurrentPage(current);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pdf]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => {
    setShowMobileToolsMenu(false);
    setShowMobileToolOptions(false);
    if (readOnly) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Check if clicking on existing text or highlight first (only when no tool or text tool is selected)
    if (tool === 'none' || tool === 'text') {
      const clickedAnnotation = annotations.find(ann => {
        if (ann.pageNumber !== pageNum) return false;
        if (ann.type === 'text') {
          const textWidth = ann.width || ((ann.content?.length || 0) * 0.01);
          const textHeight = ann.width ? ((ann.content?.split('\n').length || 1) * 0.03) : 0.02; // rough estimate
          return x >= ann.x - 0.01 && x <= ann.x + textWidth && y >= ann.y - 0.01 && y <= ann.y + textHeight;
        } else if (ann.type === 'highlight') {
          const width = ann.width || 0.2;
          const height = ann.height || 0.03;
          return x >= ann.x && x <= ann.x + width && y >= ann.y && y <= ann.y + height;
        } else if (ann.type === 'signature') {
          const width = ann.width || 0.2;
          const height = ann.height || 0.1;
          return x >= ann.x && x <= ann.x + width && y >= ann.y && y <= ann.y + height;
        }
        return false;
      });

      if (clickedAnnotation) {
        e.stopPropagation();
        if (activeTextInput) return;
        if (activeSignature) return;
        setAnnotations(prev => prev.filter(a => a.id !== clickedAnnotation.id));
        if (clickedAnnotation.type === 'text') {
          setActiveTextInput({ 
            pageNum, 
            x: clickedAnnotation.x, 
            y: clickedAnnotation.y, 
            width: clickedAnnotation.width,
            color: clickedAnnotation.color,
            fontSize: clickedAnnotation.fontSize,
            initialContent: clickedAnnotation.content, 
            id: clickedAnnotation.id 
          });
          setTool('text'); // Switch to text tool
        } else if (clickedAnnotation.type === 'highlight') {
          setTool('highlight');
        } else if (clickedAnnotation.type === 'signature') {
          setActiveSignature({
            pageNum,
            x: clickedAnnotation.x,
            y: clickedAnnotation.y,
            width: clickedAnnotation.width,
            height: clickedAnnotation.height,
            imageUrl: clickedAnnotation.imageUrl!
          });
          setTool('none');
        }
        return;
      }
    }

    if (tool === 'none') return;
    
    e.stopPropagation();

    if (tool === 'draw') {
      setIsDrawing(true);
      setDrawingPage(pageNum);
      setCurrentPoints([{ x, y }]);
    } else if (tool === 'eraser') {
      setIsDrawing(true);
      setDrawingPage(pageNum);
      eraseAt(x, y, pageNum);
    } else if (tool === 'text') {
      if (activeTextInput) return;
      if (Date.now() - lastTextCloseTimeRef.current < 100) return;
      setActiveTextInput({ pageNum, x, y });
    } else if (tool === 'highlight') {
      setIsDrawing(true);
      setDrawingPage(pageNum);
      setCurrentPoints([{ x, y }]);
    }
  };

  const handleTextSubmit = (content: string, x: number, y: number, width: number, color: string, fontSize: number, pageNum: number, id?: string) => {
    const newAnnotation: Annotation = {
      id: id || Math.random().toString(36).substr(2, 9),
      type: 'text',
      pageNumber: pageNum,
      x,
      y,
      width,
      content,
      color,
      fontSize
    };
    addAnnotation(newAnnotation);
    lastTextCloseTimeRef.current = Date.now();
    setActiveTextInput(null);
  };

  const handleTextDelete = (id: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(annotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    lastTextCloseTimeRef.current = Date.now();
    setActiveTextInput(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => {
    if (!isDrawing || drawingPage !== pageNum) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (tool === 'draw') {
      setCurrentPoints(prev => [...prev, { x, y }]);
    } else if (tool === 'eraser') {
      eraseAt(x, y, pageNum);
    } else if (tool === 'highlight') {
      setCurrentPoints(prev => [...prev, { x, y }]);
    }
  };

  const handleCanvasMouseUp = (pageNum: number) => {
    if (isDrawing && drawingPage === pageNum) {
      if (tool === 'draw') {
        const newAnnotation: Annotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'draw',
          pageNumber: pageNum,
          x: 0, y: 0,
          points: currentPoints,
          color: drawColor,
          width: drawThickness
        };
        addAnnotation(newAnnotation);
      } else if (tool === 'highlight') {
        const newAnnotation: Annotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'highlight',
          pageNumber: pageNum,
          x: 0, y: 0,
          points: currentPoints,
          color: highlightColor,
          width: highlightThickness
        };
        addAnnotation(newAnnotation);
      }
      setIsDrawing(false);
      setDrawingPage(null);
      setCurrentPoints([]);
    }
  };

  const rotateAll = () => {
    const newRotation: Record<number, number> = {};
    for (let i = 1; i <= numPages; i++) {
      newRotation[i] = (rotation[i] || 0) + 90;
    }
    setRotation(newRotation);
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [showMobileToolsMenu, setShowMobileToolsMenu] = useState(false);
  const [showMobileToolOptions, setShowMobileToolOptions] = useState(false);
  const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileToolsMenu(false);
        setShowMobileToolOptions(false);
        setShowMobileActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generatePdfBlob = async () => {
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Apply rotations
    Object.entries(rotation).forEach(([pageNum, rot]) => {
      const page = pages[parseInt(pageNum) - 1];
      if (page) {
        page.setRotation(degrees(rot as number));
      }
    });

    // Apply annotations - Sort so highlights are drawn first (bottom layer)
    const sortedAnnotations = [...annotations].sort((a, b) => {
      if (a.type === 'highlight' && b.type !== 'highlight') return -1;
      if (a.type !== 'highlight' && b.type === 'highlight') return 1;
      return 0;
    });

    for (const ann of sortedAnnotations) {
      const page = pages[ann.pageNumber - 1];
      if (!page) continue;

      const { width, height } = page.getSize();
      
      if (ann.type === 'text' && ann.content) {
        const fontSize = ann.fontSize || 12;
        const tokens = parseHtmlToTokens(ann.content, ann.color || '#000000');
        const maxWidth = (ann.width || 0.3) * width;
        const lineHeight = fontSize * 1.2;
        let currentX = ann.x * width;
        
        // Calculate Y-coordinate with baseline correction: (PageHeight - ClickY) - (FontSize * 0.8)
        let currentY = (height - (ann.y * height)) - (fontSize * 0.8);

        const words: { text: string, color: string }[] = [];
        for (const token of tokens) {
          if (token.text === '\n') {
            words.push({ text: '\n', color: token.color });
          } else {
            const splitWords = token.text.split(/(\s+)/);
            for (const w of splitWords) {
              if (w.length > 0) words.push({ text: w, color: token.color });
            }
          }
        }

        let lineX = currentX;
        for (const word of words) {
          if (word.text === '\n') {
            currentY -= lineHeight;
            lineX = currentX;
            continue;
          }

          const wordWidth = font.widthOfTextAtSize(word.text, fontSize);

          if (lineX + wordWidth > currentX + maxWidth && word.text.trim().length > 0 && lineX > currentX) {
            currentY -= lineHeight;
            lineX = currentX;
            if (word.text.trim().length === 0) continue;
          }

          let rVal = 0, gVal = 0, bVal = 0;
          if (word.color.startsWith('rgb')) {
            const match = word.color.match(/\d+/g);
            if (match && match.length >= 3) {
              rVal = parseInt(match[0]) / 255;
              gVal = parseInt(match[1]) / 255;
              bVal = parseInt(match[2]) / 255;
            }
          } else if (word.color.startsWith('#')) {
            rVal = parseInt(word.color.slice(1, 3) || '00', 16) / 255;
            gVal = parseInt(word.color.slice(3, 5) || '00', 16) / 255;
            bVal = parseInt(word.color.slice(5, 7) || '00', 16) / 255;
          }

          page.drawText(word.text, {
            x: lineX,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(rVal, gVal, bVal),
          });
          lineX += wordWidth;
        }
      } else if (ann.type === 'highlight' && ann.points) {
        // Draw highlight as a series of connected lines with high thickness and low opacity
        for (let i = 0; i < ann.points.length - 1; i++) {
          const p1 = ann.points[i];
          const p2 = ann.points[i+1];
          
          let rVal = 1, gVal = 1, bVal = 0; // Default yellow
          if (ann.color) {
            if (ann.color.startsWith('#')) {
              rVal = parseInt(ann.color.slice(1, 3), 16) / 255;
              gVal = parseInt(ann.color.slice(3, 5), 16) / 255;
              bVal = parseInt(ann.color.slice(5, 7), 16) / 255;
            }
          }

          page.drawLine({
            start: { x: p1.x * width, y: height - (p1.y * height) },
            end: { x: p2.x * width, y: height - (p2.y * height) },
            thickness: ann.width || 20,
            color: rgb(rVal, gVal, bVal),
            opacity: 0.1,
            lineCap: 1, // Round
          });
        }
      } else if (ann.type === 'draw' && ann.points) {
        for (let i = 0; i < ann.points.length - 1; i++) {
          const p1 = ann.points[i];
          const p2 = ann.points[i+1];
          
          let rVal = 0.94, gVal = 0.27, bVal = 0.27; // Default red
          if (ann.color) {
            if (ann.color.startsWith('#')) {
              rVal = parseInt(ann.color.slice(1, 3), 16) / 255;
              gVal = parseInt(ann.color.slice(3, 5), 16) / 255;
              bVal = parseInt(ann.color.slice(5, 7), 16) / 255;
            }
          }

          page.drawLine({
            start: { x: p1.x * width, y: height - (p1.y * height) },
            end: { x: p2.x * width, y: height - (p2.y * height) },
            thickness: ann.width || 2,
            color: rgb(rVal, gVal, bVal),
            lineCap: 1, // Round
          });
        }
      } else if (ann.type === 'signature' && ann.imageUrl) {
        try {
          const imageBytes = await fetch(ann.imageUrl).then(res => res.arrayBuffer());
          const image = await pdfDoc.embedPng(imageBytes);
          const imgWidth = (ann.width || 0.2) * width;
          const imgHeight = (ann.height || 0.1) * height;
          page.drawImage(image, {
            x: ann.x * width,
            y: height - (ann.y * height) - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
        } catch (error) {
          console.error('Error embedding signature image:', error);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await generatePdfBlob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = () => {
    setShowConfirmSave(true);
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const blob = await generatePdfBlob();
      await onSave(blob);
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('Failed to save PDF changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!pdf) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto animate-spin shadow-2xl">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Preparing Review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Toolbar */}
      <div ref={mobileMenuRef} className="flex items-center justify-between px-2 md:px-4 py-2 bg-slate-100 border-b border-slate-300 shrink-0 shadow-sm z-30 relative text-slate-700">
        {/* Left Section: Tools Menu */}
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              {/* Mobile Tools Menu (Hidden on lg screens) */}
              <div className="flex lg:hidden items-center gap-2">
                {(tool !== 'none' || activeSignature) && (
                  <div className="relative flex items-center bg-slate-200 rounded-md">
                    <button 
                      className="p-2 text-indigo-600 hover:bg-slate-300 rounded-l-md transition-colors"
                      onClick={() => {
                        if (activeSignature) setActiveSignature(null);
                        else setTool('none');
                        setShowMobileToolOptions(false);
                      }}
                      title="Unselect Tool"
                    >
                      {tool === 'highlight' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 4v4" /><path d="M17 4v4" /><path d="M7 8h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z" /><path d="M10 13v7l4-2v-5" />
                        </svg>
                      )}
                      {tool === 'draw' && (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      )}
                      {tool === 'eraser' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" />
                        </svg>
                      )}
                      {tool === 'text' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 8h6" /><path d="M12 8v8" /><path d="M10 16h4" />
                        </svg>
                      )}
                      {activeSignature && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      )}
                    </button>
                    {(tool === 'draw' || tool === 'highlight') && (
                      <button 
                        onClick={() => setShowMobileToolOptions(!showMobileToolOptions)}
                        className="p-2 border-l border-slate-300 hover:bg-slate-300 rounded-r-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                    
                    {showMobileToolOptions && (tool === 'draw' || tool === 'highlight') && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-slate-200 p-3 z-50 flex flex-col gap-3">
                        {tool === 'draw' && (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-medium">Color</span>
                              <input 
                                type="color" 
                                value={drawColor}
                                onChange={(e) => setDrawColor(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-medium">Size</span>
                              <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={drawThickness} 
                                onChange={(e) => setDrawThickness(Number(e.target.value))}
                                className="w-24"
                              />
                            </div>
                          </>
                        )}
                        {tool === 'highlight' && (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-medium">Color</span>
                              <input 
                                type="color" 
                                value={highlightColor.startsWith('rgba') ? '#ffff00' : highlightColor.substring(0, 7)}
                                onChange={(e) => setHighlightColor(e.target.value + '66')}
                                className="w-8 h-8 rounded cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-medium">Size</span>
                              <input 
                                type="range" 
                                min="5" 
                                max="30" 
                                value={highlightThickness} 
                                onChange={(e) => setHighlightThickness(Number(e.target.value))}
                                className="w-24"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowMobileToolsMenu(!showMobileToolsMenu);
                      setShowMobileToolOptions(false);
                    }}
                    className={`p-2 rounded-md transition-colors flex items-center gap-1 ${showMobileToolsMenu ? 'bg-slate-200' : 'hover:bg-slate-200'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                  
                  {showMobileToolsMenu && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                      <button onClick={() => { toggleTool('highlight'); setShowMobileToolsMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 ${tool === 'highlight' ? 'bg-slate-50 text-indigo-600' : 'text-slate-700'}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 4v4" /><path d="M17 4v4" /><path d="M7 8h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z" /><path d="M10 13v7l4-2v-5" />
                        </svg>
                        Highlight
                      </button>
                      <button onClick={() => { toggleTool('draw'); setShowMobileToolsMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 ${tool === 'draw' ? 'bg-slate-50 text-indigo-600' : 'text-slate-700'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Draw
                      </button>
                      <button onClick={() => { toggleTool('eraser'); setShowMobileToolsMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 ${tool === 'eraser' ? 'bg-slate-50 text-indigo-600' : 'text-slate-700'}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" />
                        </svg>
                        Erase
                      </button>
                      <div className="h-px bg-slate-200 my-1"></div>
                      <button onClick={() => { toggleTool('text'); setShowMobileToolsMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 ${tool === 'text' ? 'bg-slate-50 text-indigo-600' : 'text-slate-700'}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 8h6" /><path d="M12 8v8" /><path d="M10 16h4" />
                        </svg>
                        Add text
                      </button>
                      <button onClick={() => { 
                        if (activeSignature) setActiveSignature(null);
                        else setShowSignatureManager(true);
                        setShowMobileToolsMenu(false);
                      }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 ${activeSignature ? 'bg-slate-50 text-indigo-600' : 'text-slate-700'}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Sign
                      </button>
                      <div className="h-px bg-slate-200 my-1"></div>
                      <button onClick={() => { rotateAll(); setShowMobileToolsMenu(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 text-slate-700">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><circle cx="12" cy="12" r="1" fill="currentColor" />
                        </svg>
                        Rotate All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Tools (Hidden on smaller screens) */}
              <div className="hidden lg:flex items-center gap-1">
                <button 
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-30"
                  title="Undo"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={historyIndex === history.length - 1}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-30"
                  title="Redo"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                </button>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                <button 
                  onClick={() => toggleTool('text')}
                  className={`p-2 rounded-md transition-colors ${tool === 'text' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                  title="Add Text"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <path d="M9 8h6" />
                    <path d="M12 8v8" />
                    <path d="M10 16h4" />
                  </svg>
                </button>
                <button 
                  onClick={() => toggleTool('draw')}
                  className={`p-2 rounded-md transition-colors ${tool === 'draw' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                  title="Draw"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {tool === 'draw' && (
                  <div className="flex items-center gap-2 px-2 border-l border-slate-300">
                    <input 
                      type="color" 
                      value={drawColor}
                      onChange={(e) => setDrawColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={drawThickness} 
                      onChange={(e) => setDrawThickness(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
                <button 
                  onClick={() => toggleTool('highlight')}
                  className={`p-2 rounded-md transition-colors ${tool === 'highlight' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                  title="Highlight"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4v4" />
                    <path d="M17 4v4" />
                    <path d="M7 8h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z" />
                    <path d="M10 13v7l4-2v-5" />
                  </svg>
                </button>
                {tool === 'highlight' && (
                  <div className="flex items-center gap-2 px-2 border-l border-slate-300">
                    <input 
                      type="color" 
                      value={highlightColor.startsWith('rgba') ? '#ffff00' : highlightColor.substring(0, 7)}
                      onChange={(e) => setHighlightColor(e.target.value + '66')}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <input 
                      type="range" 
                      min="5" 
                      max="30" 
                      value={highlightThickness} 
                      onChange={(e) => setHighlightThickness(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
                <button 
                  onClick={() => toggleTool('eraser')}
                  className={`p-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                  title="Eraser"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                    <path d="M22 21H7" />
                    <path d="m5 11 9 9" />
                  </svg>
                </button>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                <button 
                  onClick={() => {
                    if (activeSignature) {
                      setActiveSignature(null);
                    } else {
                      setShowSignatureManager(true);
                    }
                  }}
                  className={`p-2 rounded-md transition-colors ${activeSignature ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                  title="Sign Document"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button 
                  onClick={rotateAll}
                  className="p-2 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                  title="Rotate All"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center Section: Zoom & Page Number */}
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button 
            onClick={() => setScale(prev => Math.min(5, prev + 0.1))}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          
          <div className="flex items-center gap-2 text-sm">
            <div className="px-2 py-1 bg-white border border-slate-300 rounded text-center min-w-[2rem]">
              {currentPage}
            </div>
            <span className="text-slate-500">of {numPages}</span>
          </div>
        </div>

        {/* Right Section: Actions Menu */}
        <div className="flex items-center gap-1">
          <div className="relative lg:hidden">
            <button 
              onClick={() => setShowMobileActionsMenu(!showMobileActionsMenu)}
              className={`p-2 rounded-md transition-colors flex items-center gap-1 ${showMobileActionsMenu ? 'bg-slate-200' : 'hover:bg-slate-200'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
            
            {showMobileActionsMenu && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                <button onClick={() => { handleDownload(); setShowMobileActionsMenu(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 text-slate-700">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </div>
                </button>
                {!readOnly && (
                  <button onClick={() => { handleSave(); setShowMobileActionsMenu(false); }} disabled={isSaving} className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 text-slate-700 disabled:opacity-50">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save
                    </div>
                  </button>
                )}
                <div className="h-px bg-slate-200 my-1"></div>
                <button onClick={() => { onClose(); setShowMobileActionsMenu(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 text-rose-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close Editor
                </button>
              </div>
            )}
          </div>

          {/* Desktop Actions (Hidden on smaller screens) */}
          <div className="hidden lg:flex items-center gap-2">
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              title="Download PDF"
            >
              {isDownloading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
            {!readOnly && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-600 hover:bg-rose-100 hover:text-rose-600 rounded-md transition-colors"
              title="Close Editor"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-4 md:p-12 bg-slate-200 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        style={{ cursor: isPanning ? 'grabbing' : (tool === 'none' ? 'grab' : 'default') }}
      >
        <div className="flex flex-col items-center w-max min-w-full">
          {pdf && Array.from({ length: numPages }, (_, i) => (
            <PDFEditorPage 
              key={i}
              pdf={pdf}
              pageNum={i + 1}
              scale={scale}
              rotation={rotation[i + 1] || 0}
              annotations={annotations}
              tool={tool}
              isDrawing={isDrawing}
              drawingPage={drawingPage}
              currentPoints={currentPoints}
              highlightColor={highlightColor}
              highlightThickness={highlightThickness}
              drawColor={drawColor}
              drawThickness={drawThickness}
              activeTextInput={activeTextInput}
              activeSignature={activeSignature}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onTextSubmit={handleTextSubmit}
              onTextDelete={handleTextDelete}
              onSignatureSubmit={handleSignatureSubmit}
              onSignatureCancel={handleSignatureCancel}
              onCloseTextInput={(p, x, y, id, initialContent) => {
                if (id && initialContent) {
                  setAnnotations(prev => [...prev, {
                    id, type: 'text', pageNumber: p, x, y, content: initialContent, color: '#000000'
                  }]);
                }
                lastTextCloseTimeRef.current = Date.now();
                setActiveTextInput(null);
              }}
            />
          ))}
        </div>
      </div>

      {showSignatureManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 relative">
            <button 
              onClick={() => setShowSignatureManager(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SignatureManager 
              pdfUrl={url} 
              onInsert={(signatureUrl) => {
                setShowSignatureManager(false);
                setTool('none');
                
                let targetX = 0.4;
                let targetY = 0.45;

                if (scrollContainerRef.current) {
                  const container = scrollContainerRef.current;
                  const pages = container.querySelectorAll('.pdf-page-container');
                  const targetPage = pages[currentPage - 1];
                  
                  if (targetPage) {
                    const containerRect = container.getBoundingClientRect();
                    const pageRect = targetPage.getBoundingClientRect();
                    
                    const viewportCenterX = containerRect.left + containerRect.width / 2;
                    const viewportCenterY = containerRect.top + containerRect.height / 2;
                    
                    let x = (viewportCenterX - pageRect.left) / pageRect.width;
                    let y = (viewportCenterY - pageRect.top) / pageRect.height;
                    
                    x = x - 0.1;
                    y = y - 0.05;
                    
                    targetX = Math.max(0, Math.min(x, 0.8));
                    targetY = Math.max(0, Math.min(y, 0.9));
                  }
                }

                setActiveSignature({
                  pageNum: currentPage,
                  x: targetX,
                  y: targetY,
                  imageUrl: signatureUrl
                });
              }}
            />
          </div>
        </div>
      )}

      {showConfirmSave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-white/10">
            <h2 className="text-lg font-bold text-white mb-2">Confirm Save</h2>
            <p className="text-sm text-slate-400 mb-6">Are you sure you want to save the changes to this PDF?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmSave(false)} className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors">Cancel</button>
              <button onClick={() => { setShowConfirmSave(false); performSave(); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFEditor;

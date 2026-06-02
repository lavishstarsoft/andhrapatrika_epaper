'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ClipImagePreviewProps {
  src: string;
  onLoaded?: () => void;
}

export default function ClipImagePreview({ src, onLoaded }: ClipImagePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Check if image is already cached/complete on mount
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoading(false);
      onLoaded?.();
    }
  }, [onLoaded]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Pointer dragging handlers for touch and mouse
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only allow dragging when zoomed in
    if (scale <= 1) return;
    isDragging.current = true;
    setIsDraggingState(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    // Set bounding limits based on scale to prevent dragging completely out of view
    const limitX = window.innerWidth * (scale - 0.5);
    const limitY = window.innerHeight * (scale - 0.5);
    
    setPosition({ 
      x: Math.max(-limitX, Math.min(limitX, newX)), 
      y: Math.max(-limitY, Math.min(limitY, newY)) 
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    setIsDraggingState(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 min-h-[250px]">
          <Loader2 className="w-10 h-10 animate-spin text-[#1721d8]" />
        </div>
      )}
      
      {/* Main Preview Image - Clickable to open zoom */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt="Shared Snippet"
        className="w-full h-auto object-contain border border-gray-100 cursor-zoom-in hover:opacity-95 transition-opacity"
        onLoad={() => {
          setLoading(false);
          onLoaded?.();
        }}
        onError={() => {
          setLoading(false);
          onLoaded?.();
        }}
        onClick={() => setIsZoomed(true)}
      />

      {/* Fullscreen Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[150] bg-black flex flex-col overflow-hidden animate-in fade-in duration-200"
          onClick={handleClose}
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-md text-white border-b border-white/10 shrink-0 z-10 select-none">
            <div className="flex flex-col">
              <span className="font-bold text-sm">Snippet Zoom View</span>
              <span className="text-[10px] text-[#0088ff] font-bold uppercase tracking-wider">
                {scale > 1 ? 'Drag with finger/mouse to pan' : 'Tap anywhere to close'}
              </span>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Close Zoom"
            >
              <X size={22} />
            </button>
          </div>

          {/* Interactive Image Container */}
          <div 
            className="flex-1 relative overflow-hidden bg-black/40 flex items-center justify-center p-4 touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div 
              className="origin-center pointer-events-none select-none"
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                transition: isDraggingState ? 'none' : 'transform 0.15s ease-out'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Zoomed Snippet"
                className="max-w-[90vw] max-h-[75vh] object-contain shadow-2xl pointer-events-none select-none"
                draggable={false}
              />
            </div>
          </div>

          {/* Bottom Floating Zoom Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center p-4 pointer-events-none z-10 select-none">
            <div className="flex items-center gap-1.5 pointer-events-auto bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="p-2.5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all active:scale-90"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={handleReset}
                disabled={scale === 1 && position.x === 0 && position.y === 0}
                className="p-2.5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all active:scale-90"
                title="Reset Zoom"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="p-2.5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all active:scale-90"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

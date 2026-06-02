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
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const touchStartRef = useRef<{
    touches: { x: number; y: number }[];
    scale: number;
    x: number;
    y: number;
  } | null>(null);
  const lastDistanceRef = useRef<number>(0);
  const lastTapRef = useRef<number>(0);

  // Check if image is already cached/complete on mount
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoading(false);
      onLoaded?.();
    }
  }, [onLoaded]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.25, 8));
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

  // Pointer dragging handlers for desktop mouse only
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
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
    if (e.pointerType !== 'mouse') return;
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
    if (e.pointerType !== 'mouse') return;
    isDragging.current = false;
    setIsDraggingState(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Mobile pinch-to-zoom and double-tap zoom handlers
  const getDistance = (touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    touchStartRef.current = {
      touches,
      scale: scale,
      x: position.x,
      y: position.y
    };
    if (touches.length === 2) {
      lastDistanceRef.current = getDistance(touches[0], touches[1]);
    }
    if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const centerX = touches[0].x - rect.left - rect.width / 2;
            const centerY = touches[0].y - rect.top - rect.height / 2;
            const targetScale = 5.0; // Raise double tap zoom to 5.0 scale
            const maxX = (rect.width * (targetScale - 1)) / 2;
            const maxY = (rect.height * (targetScale - 1)) / 2;
            const targetX = Math.max(-maxX, Math.min(maxX, -centerX * (targetScale - 1)));
            const targetY = Math.max(-maxY, Math.min(maxY, -centerY * (targetScale - 1)));
            setScale(targetScale);
            setPosition({ x: targetX, y: targetY });
          }
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return;
    const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    const startData = touchStartRef.current;
    const container = containerRef.current.getBoundingClientRect();

    if (touches.length === 2 && startData.touches.length >= 2) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const scaleDiff = currentDistance / lastDistanceRef.current;
      // Allow scale up to 8.0 matching pinch zoom limit in edition reader
      const newScale = Math.min(8.0, Math.max(0.5, startData.scale * scaleDiff));
      
      const centerX = (touches[0].x + touches[1].x) / 2;
      const centerY = (touches[0].y + touches[1].y) / 2;
      const startCenterX = (startData.touches[0].x + startData.touches[1].x) / 2;
      const startCenterY = (startData.touches[0].y + startData.touches[1].y) / 2;
      
      let newX = startData.x + (centerX - startCenterX);
      let newY = startData.y + (centerY - startCenterY);
      
      const maxX = (container.width * (newScale - 1)) / 2;
      const maxY = (container.height * (newScale - 1)) / 2;
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));
      
      setScale(newScale);
      setPosition({ x: newX, y: newY });
    } else if (touches.length === 1 && scale > 1) {
      const dx = touches[0].x - startData.touches[0].x;
      const dy = touches[0].y - startData.touches[0].y;
      
      let newX = startData.x + dx;
      let newY = startData.y + dy;
      
      const maxX = (container.width * (scale - 1)) / 2;
      const maxY = (container.height * (scale - 1)) / 2;
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    if (scale < 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
    if (scale > 0.95 && scale < 1.05) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
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
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-black/40 flex items-center justify-center p-4 touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
                disabled={scale >= 8}
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

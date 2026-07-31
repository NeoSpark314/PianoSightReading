import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { GeneratedResult } from '../engine/generator';
import { ArrowLeft, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface ReadingViewProps {
  currentPieceResult: GeneratedResult;
  onGenerateNext: () => void;
  onGeneratePrev: () => void;
  onExit: () => void;
  historyIndex: number;
  historyCount: number;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  currentPieceResult,
  onGenerateNext,
  onGeneratePrev,
  onExit,
  historyIndex,
  historyCount
}) => {
  const osmdContainerRef = useRef<HTMLDivElement>(null);
  const osmdInstanceRef = useRef<OpenSheetMusicDisplay | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  
  const [leftTouchFlash, setLeftTouchFlash] = useState(false);
  const [rightTouchFlash, setRightTouchFlash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize and update OSMD when piece changes
  useEffect(() => {
    if (!osmdContainerRef.current) return;

    // Clear previous container content
    osmdContainerRef.current.innerHTML = '';

    const osmd = new OpenSheetMusicDisplay(osmdContainerRef.current, {
      autoResize: true,
      drawTitle: true,
      drawSubtitle: true,
      drawComposer: true,
      drawCredits: false,
      drawPartNames: false,
      drawMetronomeMarks: true,
      backend: 'svg',
      pageFormat: 'Endless',
      stretchLastSystemLine: true,
      spacingFactorSoftmax: 10,
      pageBackgroundColor: '#fafafa'
    });

    // Configure OSMD built-in Engraving Rules for elegant, balanced measure spacing
    (osmd as any).rules.RenderXMeasuresPerLineAkaSystem = 4;
    (osmd as any).rules.StretchLastSystemLine = true;
    (osmd as any).rules.MinNoteDistance = 2.0;
    (osmd as any).rules.PageBackgroundColor = '#fafafa';

    osmdInstanceRef.current = osmd;

    // Calculate optimal zoom factor BEFORE rendering to achieve a 1-pass fast render on tablets
    const renderWithOptimalZoom = () => {
      if (!osmdInstanceRef.current) return;
      const instance = osmdInstanceRef.current;

      const totalMeasures = currentPieceResult.piece.measures.length;
      const systemCount = Math.ceil(totalMeasures / 4);
      
      // Estimated height per grand staff system + margins
      const estimatedHeight = systemCount * 170 + 90;
      const availableHeight = window.innerHeight - 90;

      let optimalZoom = 1.0;
      if (estimatedHeight > availableHeight && estimatedHeight > 0) {
        optimalZoom = Math.max(0.42, Math.min(1.0, (availableHeight / estimatedHeight) * 0.98));
      }

      instance.zoom = optimalZoom;
      instance.render(); // Single fast render pass!
    };

    osmd.load(currentPieceResult.musicXml).then(() => {
      renderWithOptimalZoom();
      // Unlock navigation after rendering completes
      isNavigatingRef.current = false;
    }).catch(err => {
      console.error('Error rendering MusicXML in OSMD:', err);
      isNavigatingRef.current = false;
    });

    // Resize listener for orientation change & window resize
    const handleResize = () => {
      renderWithOptimalZoom();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentPieceResult]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        triggerRightAction();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerLeftAction();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyCount]);

  const triggerLeftAction = () => {
    // Debounce guard to prevent double-firing touch/click events on tablet
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setLeftTouchFlash(true);
    setTimeout(() => setLeftTouchFlash(false), 200);
    onGeneratePrev();
  };

  const triggerRightAction = () => {
    // Debounce guard to prevent double-firing touch/click events on tablet
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setRightTouchFlash(true);
    setTimeout(() => setRightTouchFlash(false), 200);
    onGenerateNext();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  };

  return (
    <div className="sheet-music-container">
      {/* Invisible Touch Overlay (Left 50% / Right 50%) */}
      <div 
        className={`touch-zone-left ${leftTouchFlash ? 'touch-flash' : ''}`}
        onClick={triggerLeftAction}
        title="Tap left to view previous piece"
      />
      <div 
        className={`touch-zone-right ${rightTouchFlash ? 'touch-flash' : ''}`}
        onClick={triggerRightAction}
        title="Tap right to generate next piece"
      />

      {/* Floating Control Bar Overlay */}
      <nav className="reading-overlay-bar">
        <button className="icon-btn" onClick={onExit} title="Back to Settings">
          <ArrowLeft size={20} />
        </button>

        <div style={{
          height: '20px',
          width: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          margin: '0 0.25rem'
        }} />

        {/* Piece info tag */}
        <span style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#f8fafc',
          padding: '0 0.5rem',
          whiteSpace: 'nowrap'
        }}>
          Piece #{historyIndex + 1} ({currentPieceResult.piece.keyName})
        </span>

        <div style={{
          height: '20px',
          width: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          margin: '0 0.25rem'
        }} />

        {/* Next Piece Regenerate */}
        <button className="icon-btn" onClick={triggerRightAction} title="Generate Next Piece">
          <RefreshCw size={18} />
        </button>

        {/* Fullscreen Toggle */}
        <button className="icon-btn" onClick={toggleFullscreen} title="Toggle Fullscreen Mode">
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </nav>

      {/* OSMD Sheet Music Canvas */}
      <div className="osmd-canvas-wrapper" style={{ marginTop: '3.5rem' }}>
        <div ref={osmdContainerRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
};

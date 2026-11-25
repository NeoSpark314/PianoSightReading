import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { GeneratedResult } from '../engine/generator';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface ReadingViewProps {
  currentPieceResult: GeneratedResult;
  onGenerateNext: () => void;
  onGeneratePrev: () => void;
  onExit: () => void;
  historyIndex: number;
  historyCount: number;
}

const ZOOM_STORAGE_KEY = 'piano_sight_reading_zoom_scale';
const MIN_ZOOM_SCALE = 0.7;
const MAX_ZOOM_SCALE = 1.4;

function getInitialZoomScale(): number {
  try {
    const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!Number.isNaN(parsed) && parsed >= MIN_ZOOM_SCALE && parsed <= MAX_ZOOM_SCALE) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return 1.0;
}

function computeResponsiveLayout(containerWidth: number, zoomScale: number) {
  let baseZoom = 0.95;
  let measuresPerSystem = 4;

  if (containerWidth < 560) {
    // Narrow phone / split-screen
    baseZoom = 0.78;
    measuresPerSystem = 2;
  } else if (containerWidth < 940) {
    // Portrait tablet: let OSMD flow naturally by note density (typically 2-4 bars/system)
    baseZoom = 0.86;
    measuresPerSystem = 0;
  } else {
    // Landscape tablet / desktop
    baseZoom = 0.95;
    measuresPerSystem = 4;
  }

  const zoom = Math.max(0.55, Math.min(1.45, Number((baseZoom * zoomScale).toFixed(2))));
  return { zoom, measuresPerSystem };
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  currentPieceResult,
  onGenerateNext,
  onGeneratePrev,
  onExit,
  historyIndex
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const osmdContainerRef = useRef<HTMLDivElement>(null);
  const osmdInstanceRef = useRef<OpenSheetMusicDisplay | null>(null);
  const isLoadedRef = useRef<boolean>(false);
  const isNavigatingRef = useRef<boolean>(false);
  const lastRenderedWidthRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [leftTouchFlash, setLeftTouchFlash] = useState(false);
  const [rightTouchFlash, setRightTouchFlash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showToolbar, setShowToolbar] = useState(true);
  const [zoomScale, setZoomScale] = useState<number>(getInitialZoomScale);

  const canGoPrev = historyIndex > 0;

  // Apply responsive layout & render on the existing OSMD instance
  const applyLayoutAndRender = useCallback(
    (scale: number) => {
      const osmd = osmdInstanceRef.current;
      const container = osmdContainerRef.current;
      if (!osmd || !container || !isLoadedRef.current) return;

      const width = container.clientWidth;
      if (width <= 0) return;

      const { zoom, measuresPerSystem } = computeResponsiveLayout(width, scale);
      osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerSystem;
      osmd.zoom = zoom;
      osmd.render();
      lastRenderedWidthRef.current = width;
    },
    []
  );

  // 1. Create OSMD instance ONCE on mount and clean up on unmount
  useEffect(() => {
    const container = osmdContainerRef.current;
    if (!container) return;

    const osmd = new OpenSheetMusicDisplay(container, {
      autoResize: false,
      drawTitle: true,
      drawSubtitle: false,
      drawComposer: true,
      drawCredits: false,
      drawPartNames: false,
      drawMetronomeMarks: true,
      backend: 'svg',
      pageFormat: 'Endless',
      stretchLastSystemLine: false,
      spacingFactorSoftmax: 8,
      pageBackgroundColor: '#fdfcf8',
      defaultFontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif"
    });

    const rules = osmd.EngravingRules;
    rules.PageBackgroundColor = '#fdfcf8';
    rules.DefaultFontFamily = "'Playfair Display', Georgia, 'Times New Roman', serif";
    rules.PageTopMargin = 2.5;
    rules.PageBottomMargin = 3.5;
    rules.PageLeftMargin = 2.2;
    rules.PageRightMargin = 2.2;
    rules.TitleTopDistance = 1.8;
    rules.TitleBottomDistance = 1.5;
    rules.StaffDistance = 6.5;
    rules.BetweenStaffDistance = 5.5;
    rules.MinimumDistanceBetweenSystems = 7.5;
    rules.MinNoteDistance = 2.2;
    rules.StretchLastSystemLine = false;
    rules.LastSystemMaxScalingFactor = 1.4;
    rules.RenderMeasureNumbersOnlyAtSystemStart = true;
    rules.MetronomeMarkXShift = 0;
    rules.MetronomeMarkYShift = -3.2;
    rules.TempoYSpacing = 1.5;

    osmdInstanceRef.current = osmd;

    return () => {
      isLoadedRef.current = false;
      try {
        osmd.clear();
      } catch {
        // Ignore cleanup errors if container is already detached
      }
      osmdInstanceRef.current = null;
    };
  }, []);

  // 2. Load new MusicXML whenever the piece changes (with stale-load cancellation)
  useEffect(() => {
    const osmd = osmdInstanceRef.current;
    if (!osmd) return;

    let cancelled = false;
    isLoadedRef.current = false;

    osmd
      .load(currentPieceResult.musicXml)
      .then(() => {
        if (cancelled) return;
        isLoadedRef.current = true;
        applyLayoutAndRender(zoomScale);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        isNavigatingRef.current = false;
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Error rendering MusicXML in OSMD:', err);
        isNavigatingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
    // Intentionally exclude zoomScale here so zoom adjustments re-render without reloading XML
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPieceResult, applyLayoutAndRender]);

  // 3. Re-render when user adjusts zoom scale
  useEffect(() => {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(zoomScale));
    } catch {
      // Ignore storage errors
    }
    if (isLoadedRef.current) {
      applyLayoutAndRender(zoomScale);
    }
  }, [zoomScale, applyLayoutAndRender]);

  // 4. Debounced ResizeObserver on container width (ignores Android vertical address-bar jitter)
  useEffect(() => {
    const container = osmdContainerRef.current;
    if (!container) return;

    let timer: number | undefined;
    const handleWidthChange = () => {
      const currentWidth = container.clientWidth;
      if (Math.abs(currentWidth - lastRenderedWidthRef.current) < 4) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        applyLayoutAndRender(zoomScale);
      }, 150);
    };

    const observer = new ResizeObserver(handleWidthChange);
    observer.observe(container);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [zoomScale, applyLayoutAndRender]);

  // 5. Screen Wake Lock so the tablet stays awake on a music stand
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let released = false;

    const requestWakeLock = async () => {
      if (released || !('wakeLock' in navigator)) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock may be unavailable or denied in background tabs
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // 6. Auto-hide toolbar shortly after opening ReadingView
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowToolbar(false);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, []);

  // 7. Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const triggerLeftAction = useCallback(() => {
    if (!canGoPrev || isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setLeftTouchFlash(true);
    window.setTimeout(() => setLeftTouchFlash(false), 200);
    onGeneratePrev();
  }, [canGoPrev, onGeneratePrev]);

  const triggerRightAction = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setRightTouchFlash(true);
    window.setTimeout(() => setRightTouchFlash(false), 200);
    onGenerateNext();
  }, [onGenerateNext]);

  const adjustZoom = useCallback((delta: number) => {
    setZoomScale(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, next));
    });
  }, []);

  // 8. Keyboard navigation shortcuts
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
      } else if (e.key === '+' || e.key === '=') {
        adjustZoom(0.1);
      } else if (e.key === '-') {
        adjustZoom(-0.1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerLeftAction, triggerRightAction, onExit, adjustZoom]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Horizontal swipe gesture (doesn't interfere with vertical scrolling)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      if (dx < 0) {
        triggerRightAction();
      } else {
        triggerLeftAction();
      }
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="sheet-music-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Edge Touch Zones (Leaves center unobstructed for scrolling & toolbar toggle) */}
      <div
        className={`touch-zone-left ${leftTouchFlash ? 'touch-flash' : ''} ${!canGoPrev ? 'touch-zone-disabled' : ''}`}
        onClick={triggerLeftAction}
        title={canGoPrev ? 'Tap left edge for previous piece' : undefined}
        aria-label="Previous piece"
      />
      <div
        className={`touch-zone-right ${rightTouchFlash ? 'touch-flash' : ''}`}
        onClick={triggerRightAction}
        title="Tap right edge for next piece"
        aria-label="Next piece"
      />

      {/* Auto-Hiding Floating Control Bar */}
      <nav className={`reading-overlay-bar ${showToolbar ? '' : 'reading-overlay-bar--hidden'}`}>
        <button className="icon-btn" onClick={onExit} title="Back to Settings" aria-label="Back to Settings">
          <ArrowLeft size={19} />
        </button>

        <div className="reading-bar-divider" />

        <button
          className="icon-btn"
          onClick={triggerLeftAction}
          disabled={!canGoPrev}
          title="Previous Piece"
          aria-label="Previous Piece"
        >
          <ChevronLeft size={19} />
        </button>

        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#f8fafc',
            padding: '0 0.25rem',
            whiteSpace: 'nowrap'
          }}
        >
          #{historyIndex + 1} · {currentPieceResult.piece.keyName}
        </span>

        <button
          className="icon-btn"
          onClick={triggerRightAction}
          title="Next Piece"
          aria-label="Next Piece"
        >
          <ChevronRight size={19} />
        </button>

        <div className="reading-bar-divider" />

        <button
          className="icon-btn"
          onClick={() => adjustZoom(-0.1)}
          disabled={zoomScale <= MIN_ZOOM_SCALE}
          title="Decrease Staff Size"
          aria-label="Decrease Staff Size"
        >
          <ZoomOut size={17} />
        </button>

        <button
          className="icon-btn"
          onClick={() => adjustZoom(0.1)}
          disabled={zoomScale >= MAX_ZOOM_SCALE}
          title="Increase Staff Size"
          aria-label="Increase Staff Size"
        >
          <ZoomIn size={17} />
        </button>

        <div className="reading-bar-divider" />

        <button
          className="icon-btn"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen Mode"
          aria-label="Toggle Fullscreen Mode"
        >
          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </nav>

      {/* OSMD Paper Sheet Canvas (Tap center to toggle controls) */}
      <div
        className="osmd-paper-sheet"
        onClick={() => setShowToolbar(prev => !prev)}
      >
        <div ref={osmdContainerRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
};

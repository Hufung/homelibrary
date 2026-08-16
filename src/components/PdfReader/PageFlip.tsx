import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PageFlipProps {
  currentPage: React.ReactNode;
  nextPage: React.ReactNode | null;
  canFlipNext: boolean;
  onFlipNext: () => void;
  width: number;
  height: number;
}

type Phase = 'idle' | 'dragging' | 'flipping' | 'returning';

export const PageFlip: React.FC<PageFlipProps> = ({
  currentPage,
  nextPage,
  canFlipNext,
  onFlipNext,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const startXRef = useRef<number>(0);
  const startProgressRef = useRef<number>(0);
  const triggeredRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const commitFlip = useCallback(() => {
    if (!canFlipNext || !nextPage) return;
    setPhase('flipping');
    setProgress(1);
    setTimeout(() => {
      onFlipNext();
      setProgress(0);
      setPhase('idle');
      triggeredRef.current = false;
    }, 520);
  }, [canFlipNext, nextPage, onFlipNext]);

  const animateTo = useCallback((target: number, onDone?: () => void) => {
    const start = performance.now();
    const from = progress;
    const delta = target - from;
    const duration = 320;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        if (onDone) onDone();
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [progress]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canFlipNext || !nextPage) return;
      if (phase !== 'idle') return;
      const target = e.currentTarget as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      if (localX < rect.width * 0.35) return;
      isMouseDownRef.current = true;
      startXRef.current = e.clientX;
      startProgressRef.current = 0;
      triggeredRef.current = false;
      setPhase('dragging');
      try {
        target.setPointerCapture(e.pointerId);
      } catch {}
    },
    [canFlipNext, nextPage, phase]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== 'dragging') return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const moved = startXRef.current - e.clientX;
      const next = Math.max(0, Math.min(1, startProgressRef.current + moved / rect.width));
      setProgress(next);
      if (next > 0.55 && !triggeredRef.current) {
        triggeredRef.current = true;
        commitFlip();
      }
    },
    [phase, commitFlip]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== 'dragging') return;
      const target = e.currentTarget as HTMLDivElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {}
      isMouseDownRef.current = false;
      if (triggeredRef.current) return;
      setPhase('returning');
      animateTo(0, () => {
        setPhase('idle');
        setProgress(0);
      });
    },
    [phase, animateTo]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const angle = -180 * progress;
  const shadowOpacity = Math.min(0.35, progress * 0.7);
  const showCursor =
    phase === 'idle' && canFlipNext && nextPage;
  const isFlippingForward =
    phase === 'dragging' || (phase === 'flipping' && progress > 0);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width,
        height,
        perspective: 1800,
        perspectiveOrigin: 'left center',
        touchAction: 'pan-y',
      }}
    >
      {/* Static current page underneath */}
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: 'hidden',
        }}
      >
        {currentPage}
      </div>

      {/* Flip layer */}
      {canFlipNext && nextPage && isFlippingForward && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${angle}deg)`,
            transformOrigin: 'left center',
            transition: phase === 'flipping' ? 'none' : 'none',
            willChange: 'transform',
            boxShadow: `${-shadowOpacity * 30}px 0 ${shadowOpacity * 30}px rgba(0,0,0,${shadowOpacity})`,
            cursor: phase === 'dragging' ? 'grabbing' : 'grab',
          }}
        >
          {/* Front face: current page */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              background: '#FFFFFF',
            }}
          >
            {currentPage}
          </div>
          {/* Back face: next page (mirrored) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: '#FFFFFF',
            }}
          >
            {nextPage}
          </div>
        </div>
      )}

      {/* Hover grab zone (right portion of page) */}
      {showCursor && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute top-0 right-0 h-full z-10"
          style={{
            width: '60%',
            cursor: 'grab',
          }}
        >
          {/* Folded corner indicator (subtle) */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: 56,
              height: 56,
              background:
                'linear-gradient(225deg, rgba(90,90,64,0.18) 0%, rgba(90,90,64,0.0) 60%)',
              borderTopRightRadius: 4,
              opacity: 0.85,
            }}
          />
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PageFlipProps {
  currentPageInteractive: React.ReactNode;
  currentPage: React.ReactNode;
  nextPage: React.ReactNode | null;
  previousPage: React.ReactNode | null;
  canFlipNext: boolean;
  canFlipPrev: boolean;
  onFlipNext: () => void;
  onFlipPrev: () => void;
  width: number;
  height: number;
}

type Direction = 'next' | 'prev';
type Phase = 'idle' | 'dragging' | 'flipping' | 'returning';

const COMMIT_THRESHOLD = 0.3;
const VELOCITY_COMMIT = 0.4;
const SWIPE_LOCK_PX = 8;

export const PageFlip: React.FC<PageFlipProps> = ({
  currentPageInteractive,
  currentPage,
  nextPage,
  previousPage,
  canFlipNext,
  canFlipPrev,
  onFlipNext,
  onFlipPrev,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  const phaseRef = useRef<Phase>('idle');
  const progressRef = useRef(0);
  const directionRef = useRef<Direction | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lockedRef = useRef(false);
  const triggeredRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const canFlipNextRef = useRef(canFlipNext);
  const canFlipPrevRef = useRef(canFlipPrev);
  const nextPageRef = useRef(nextPage);
  const previousPageRef = useRef(previousPage);

  canFlipNextRef.current = canFlipNext;
  canFlipPrevRef.current = canFlipPrev;
  nextPageRef.current = nextPage;
  previousPageRef.current = previousPage;

  const forceRender = useCallback(() => setRenderTick((t) => t + 1), []);

  const animateReturn = useCallback(() => {
    const start = performance.now();
    const from = progressRef.current;
    const duration = 250;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      progressRef.current = from * (1 - eased);
      forceRender();
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        progressRef.current = 0;
        directionRef.current = null;
        lockedRef.current = false;
        triggeredRef.current = false;
        phaseRef.current = 'idle';
        forceRender();
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [forceRender]);

  const commitFlip = useCallback(
    (dir: Direction) => {
      if (dir === 'next' && (!canFlipNextRef.current || !nextPageRef.current)) return;
      if (dir === 'prev' && (!canFlipPrevRef.current || !previousPageRef.current)) return;
      phaseRef.current = 'flipping';
      progressRef.current = 1;
      forceRender();
      setTimeout(() => {
        if (dir === 'next') onFlipNext();
        else onFlipPrev();
        progressRef.current = 0;
        directionRef.current = null;
        lockedRef.current = false;
        triggeredRef.current = false;
        phaseRef.current = 'idle';
        forceRender();
      }, 420);
    },
    [onFlipNext, onFlipPrev, forceRender]
  );

  const resetGesture = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    progressRef.current = 0;
    directionRef.current = null;
    lockedRef.current = false;
    triggeredRef.current = false;
    pointerIdRef.current = null;
    phaseRef.current = 'idle';
    forceRender();
  }, [forceRender]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phaseRef.current !== 'idle') return;
      if (!e.isPrimary) return;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      lastXRef.current = e.clientX;
      lastTimeRef.current = performance.now();
      triggeredRef.current = false;
      directionRef.current = null;
      lockedRef.current = false;
      try {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      } catch {}
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const phase = phaseRef.current;

      if (phase !== 'idle' && phase !== 'dragging') return;

      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;

      if (!lockedRef.current) {
        if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.1) return;

        lockedRef.current = true;
        const dir: Direction = dx < 0 ? 'next' : 'prev';
        directionRef.current = dir;

        if (dir === 'next' && (!canFlipNextRef.current || !nextPageRef.current)) {
          resetGesture();
          return;
        }
        if (dir === 'prev' && (!canFlipPrevRef.current || !previousPageRef.current)) {
          resetGesture();
          return;
        }

        phaseRef.current = 'dragging';
      }

      const dir = directionRef.current;
      if (!dir) return;

      const container = e.currentTarget as HTMLDivElement;
      const containerWidth = container.clientWidth || width;
      const signed = dir === 'next' ? -dx : dx;
      const nextProgress = Math.max(0, Math.min(1, signed / containerWidth));
      progressRef.current = nextProgress;

      const now = performance.now();
      const dt = Math.max(1, now - lastTimeRef.current);
      const vx = (e.clientX - lastXRef.current) / dt;
      lastXRef.current = e.clientX;
      lastTimeRef.current = now;
      const velocityProgress = dir === 'next' ? -vx : vx;

      if (!triggeredRef.current && (nextProgress > COMMIT_THRESHOLD || velocityProgress > VELOCITY_COMMIT)) {
        triggeredRef.current = true;
        commitFlip(dir);
      } else {
        forceRender();
      }
    },
    [width, commitFlip, resetGesture, forceRender]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {}

      if (phaseRef.current === 'idle' || !lockedRef.current) {
        resetGesture();
        return;
      }
      if (triggeredRef.current) return;

      phaseRef.current = 'returning';
      animateReturn();
    },
    [animateReturn, resetGesture]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {}
      resetGesture();
    },
    [resetGesture]
  );

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const phase = phaseRef.current;
  const progress = progressRef.current;
  const dir = directionRef.current;

  const isDragging = phase === 'dragging';
  const isFlipping = phase === 'flipping';
  const isReturning = phase === 'returning';
  const showOverlay = isDragging || isFlipping || isReturning;

  const sign = dir === 'prev' ? 1 : -1;
  const angle = sign * 180 * progress;
  const shadowOpacity = Math.min(0.4, progress * 0.75);

  const frontPage = dir === 'prev' ? previousPage : currentPage;
  const backPage = dir === 'prev' ? currentPage : nextPage;

  const canInteract = canFlipNext || canFlipPrev;
  const cursor =
    phase === 'idle'
      ? canInteract
        ? 'grab'
        : 'default'
      : 'grabbing';

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width,
        height,
        perspective: 1800,
        perspectiveOrigin: 'center center',
        touchAction: 'pan-y',
      }}
    >
      {!showOverlay && (
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          {currentPageInteractive}
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="absolute inset-0 z-20"
        style={{ touchAction: 'pan-y', cursor }}
      />
      {showOverlay && frontPage && backPage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${angle}deg)`,
            transformOrigin: dir === 'prev' ? 'right center' : 'left center',
            willChange: 'transform',
            boxShadow: `${-sign * shadowOpacity * 30}px 0 ${shadowOpacity * 30}px rgba(0,0,0,${shadowOpacity})`,
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: '#FFFFFF' }}>
            {frontPage}
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#FFFFFF' }}>
            {backPage}
          </div>
        </div>
      )}
    </div>
  );
};

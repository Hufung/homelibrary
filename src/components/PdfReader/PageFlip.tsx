import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PageFlipProps {
  /** The currently-displayed page with full text + annotation layers (interactive). */
  currentPageInteractive: React.ReactNode;
  /** Lightweight current-page render used on the flip layer's front face. */
  currentPage: React.ReactNode;
  /** Lightweight next-page render used on the flip layer's back face. */
  nextPage: React.ReactNode | null;
  /** Lightweight previous-page render used on the flip layer's front face when swiping back. */
  previousPage: React.ReactNode | null;
  canFlipNext: boolean;
  canFlipPrev: boolean;
  onFlipNext: () => void;
  onFlipPrev: () => void;
  width: number;
  height: number;
}

type Phase = 'idle' | 'dragging-next' | 'dragging-prev' | 'flipping' | 'returning';
type Direction = 'next' | 'prev';

const COMMIT_THRESHOLD = 0.35;
const VELOCITY_COMMIT = 0.55;
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
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<Direction>('next');

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const triggeredRef = useRef<boolean>(false);
  const directionRef = useRef<Direction | null>(null);
  const lockedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const commitFlip = useCallback(
    (dir: Direction) => {
      if (dir === 'next' && (!canFlipNext || !nextPage)) return;
      if (dir === 'prev' && (!canFlipPrev || !previousPage)) return;
      setPhase('flipping');
      setProgress(1);
      setTimeout(() => {
        if (dir === 'next') onFlipNext();
        else onFlipPrev();
        setProgress(0);
        setPhase('idle');
        triggeredRef.current = false;
        directionRef.current = null;
      }, 480);
    },
    [canFlipNext, nextPage, canFlipPrev, previousPage, onFlipNext, onFlipPrev]
  );

  const animateTo = useCallback(
    (target: number, onDone?: () => void) => {
      const start = performance.now();
      const from = progress;
      const delta = target - from;
      const duration = 300;
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
    },
    [progress]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setPhase('idle');
    directionRef.current = null;
    lockedRef.current = false;
    triggeredRef.current = false;
    pointerIdRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== 'idle') return;
      // Only react to primary pointer / touch / pen
      if (!e.isPrimary) return;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      lastXRef.current = e.clientX;
      startTimeRef.current = performance.now();
      lastTimeRef.current = startTimeRef.current;
      triggeredRef.current = false;
      directionRef.current = null;
      lockedRef.current = false;
      try {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      } catch {}
    },
    [phase]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== 'idle' || pointerIdRef.current !== e.pointerId) return;
      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;

      // Decide whether the gesture is horizontal enough to lock.
      if (!lockedRef.current) {
        if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
        // Lock only if horizontal motion dominates.
        if (Math.abs(dx) < Math.abs(dy) * 1.1) return;

        lockedRef.current = true;
        const dir: Direction = dx < 0 ? 'next' : 'prev';
        directionRef.current = dir;
        if (dir === 'next' && (!canFlipNext || !nextPage)) {
          // Locked into a no-op direction — release.
          reset();
          return;
        }
        if (dir === 'prev' && (!canFlipPrev || !previousPage)) {
          reset();
          return;
        }
        setDirection(dir);
        setPhase(dir === 'next' ? 'dragging-next' : 'dragging-prev');
        try {
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        } catch {}
      }

      const now = performance.now();
      const dir = directionRef.current;
      if (!dir) return;
      const containerWidth = (e.currentTarget as HTMLDivElement).clientWidth || width;
      // For "next" we want progress to grow as we drag left (dx < 0).
      // For "prev" we want progress to grow as we drag right (dx > 0).
      const signed = dir === 'next' ? -dx : dx;
      const nextProgress = Math.max(0, Math.min(1, signed / containerWidth));
      setProgress(nextProgress);

      // Track velocity for fling-to-flip.
      const dt = Math.max(1, now - lastTimeRef.current);
      const vx = (e.clientX - lastXRef.current) / dt; // px per ms
      lastXRef.current = e.clientX;
      lastTimeRef.current = now;
      const velocityProgress = dir === 'next' ? -vx : vx;

      if (!triggeredRef.current && (nextProgress > COMMIT_THRESHOLD || velocityProgress > VELOCITY_COMMIT)) {
        triggeredRef.current = true;
        commitFlip(dir);
      }
    },
    [phase, width, canFlipNext, canFlipPrev, nextPage, previousPage, commitFlip, reset]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const target = e.currentTarget as HTMLDivElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {}
      if (phase === 'idle' || !lockedRef.current) {
        // Tap / click without motion — don't flip.
        reset();
        return;
      }
      if (triggeredRef.current) return; // already committing
      const dir = directionRef.current;
      if (!dir) {
        reset();
        return;
      }
      setPhase('returning');
      animateTo(0, () => {
        setPhase('idle');
        setProgress(0);
        directionRef.current = null;
        lockedRef.current = false;
      });
      // dir kept referenced so TS is happy
      void dir;
    },
    [phase, animateTo, reset]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const target = e.currentTarget as HTMLDivElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {}
      reset();
    },
    [reset]
  );

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const isDraggingForward =
    phase === 'dragging-next' || (phase === 'flipping' && direction === 'next');
  const isDraggingBackward =
    phase === 'dragging-prev' || (phase === 'flipping' && direction === 'prev');
  const showOverlay =
    isDraggingForward || isDraggingBackward || phase === 'returning';
  const sign = isDraggingBackward ? 1 : -1; // forward: rotateY negative; backward: rotateY positive
  const angle = sign * 180 * progress;
  const shadowOpacity = Math.min(0.4, progress * 0.75);
  const frontPage = direction === 'prev' ? previousPage : currentPage;
  const backPage = direction === 'prev' ? currentPage : nextPage;
  const cursor = phase === 'idle' ? (canFlipNext || canFlipPrev ? 'grab' : 'default') : 'grabbing';

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
      {/* Static current page underneath — only when idle. While a flip is in
          progress the flip layer's front face already shows the same page, so
          rendering the static layer here would produce a "same page twice"
          duplicate. */}
      {!showOverlay && (
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {currentPageInteractive}
        </div>
      )}

      {/* Full-screen swipe overlay (also acts as the gesture capture surface) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="absolute inset-0 z-20"
        style={{ touchAction: 'pan-y', cursor }}
      />

      {/* Flip layer */}
      {showOverlay && frontPage && backPage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${angle}deg)`,
            transformOrigin: isDraggingBackward ? 'right center' : 'left center',
            willChange: 'transform',
            boxShadow: `${-sign * shadowOpacity * 30}px 0 ${shadowOpacity * 30}px rgba(0,0,0,${shadowOpacity})`,
            pointerEvents: 'none',
          }}
        >
          {/* Front face */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              background: '#FFFFFF',
            }}
          >
            {frontPage}
          </div>
          {/* Back face (mirrored 180°) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: '#FFFFFF',
            }}
          >
            {backPage}
          </div>
        </div>
      )}
    </div>
  );
};

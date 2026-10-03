import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Loader2Icon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  // Light version, shown immediately
  src: string;
  // Optional full-quality version, loaded in the background and swapped in when ready
  fullSrc?: string | null;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

type Transform = { scale: number; x: number; y: number };
const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Fullscreen photo viewer: pinch / wheel / double-tap to zoom, drag to pan.
// Built on Radix Dialog so it stacks correctly on top of a Drawer (also a Radix Dialog).
export function ImageLightbox({ src, fullSrc, alt, open, onOpenChange }: ImageLightboxProps) {
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  // URL of the full-quality version once it's fully downloaded
  const [loadedFullSrc, setLoadedFullSrc] = useState<string | null>(null);

  // Light version first, then the original in the background. Swapping only after
  // onload means the photo never shows half-drawn - it just gets sharper.
  useEffect(() => {
    if (!open || !fullSrc) return;
    const image = new Image();
    image.onload = () => setLoadedFullSrc(fullSrc);
    image.src = fullSrc;
    return () => {
      image.onload = null;
    };
  }, [open, fullSrc]);

  const isFullLoaded = !!fullSrc && loadedFullSrc === fullSrc;
  const shownSrc = isFullLoaded ? fullSrc : src;
  // True while a finger/mouse is down - disables the transition so the photo follows instantly
  const [isGesturing, setIsGesturing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  // Point relative to the container's centre (the transform origin)
  const toLocal = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  // Zoom keeping the given point fixed under the finger / cursor.
  // A function gets the latest scale, so quick repeated zooms don't read a stale value.
  const zoomAt = (nextScale: number | ((current: number) => number), clientX: number, clientY: number) => {
    setTransform((t) => {
      const target = typeof nextScale === "function" ? nextScale(t.scale) : nextScale;
      const scale = clamp(target, MIN_SCALE, MAX_SCALE);
      if (scale === MIN_SCALE) return IDENTITY;
      const p = toLocal(clientX, clientY);
      const ratio = scale / t.scale;
      return { scale, x: p.x - (p.x - t.x) * ratio, y: p.y - (p.y - t.y) * ratio };
    });
  };

  const zoomCenter = (factor: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    zoomAt((current) => current * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsGesturing(true);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: transform.scale };
    }

    // Double tap / double click toggles zoom
    if (pointers.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (transform.scale > 1) setTransform(IDENTITY);
        else zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && gesture.current) {
      // Pinch: scale by finger distance, around the midpoint
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(gesture.current.scale * (distance / gesture.current.distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.current.size === 1 && transform.scale > 1) {
      // Pan only when zoomed in
      setTransform((t) => ({ ...t, x: t.x + e.clientX - previous.x, y: t.y + e.clientY - previous.y }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) setIsGesturing(false);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTransform(IDENTITY);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-open:animate-in data-open:zoom-in-95 data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>

          {/* Top bar - kept clear of the notch / Dynamic Island */}
          <div className="relative z-10 flex items-center justify-end gap-2 px-3 pt-[max(12px,var(--safe-top))] pb-2">
            <Button variant="secondary" size="icon-lg" aria-label="Oddal" onClick={() => zoomCenter(1 / 1.5)} disabled={transform.scale <= MIN_SCALE}>
              <ZoomOutIcon />
            </Button>
            <Button variant="secondary" size="icon-lg" aria-label="Przybliż" onClick={() => zoomCenter(1.5)} disabled={transform.scale >= MAX_SCALE}>
              <ZoomInIcon />
            </Button>
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" size="icon-lg" aria-label="Zamknij">
                <XIcon />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Gesture area. touch-none: we handle pinch/pan ourselves instead of the browser */}
          <div
            ref={containerRef}
            className="relative flex flex-1 touch-none items-center justify-center overflow-hidden select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={(e) => zoomAt((current) => current * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY)}
            onClick={(e) => {
              // Tap on the empty dark area (not the photo) closes when not zoomed
              if (e.target === e.currentTarget && transform.scale === 1) onOpenChange(false);
            }}
          >
            <img
              src={shownSrc}
              alt={alt}
              draggable={false}
              className="max-h-full max-w-full object-contain"
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                // Smooth for buttons / double tap, instant while a finger is moving
                transition: isGesturing ? "none" : "transform 200ms ease-out",
                // Only while a finger is moving: a permanent will-change makes the browser
                // rasterize once at scale 1 and just enlarge that, so a zoomed photo stays soft
                // even when the full-quality original is loaded
                willChange: isGesturing ? "transform" : "auto",
              }}
            />
          </div>

          <p className="flex items-center justify-center gap-1.5 pb-[max(16px,var(--safe-bottom))] text-center text-xs text-white/50">
            {fullSrc && !isFullLoaded ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" /> Wczytuję pełną jakość…
              </>
            ) : (
              "Uszczypnij lub kliknij dwukrotnie, aby przybliżyć"
            )}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

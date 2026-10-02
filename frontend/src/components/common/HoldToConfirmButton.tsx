import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  // Idle label, e.g. "Przytrzymaj, aby wykorzystać"
  children: React.ReactNode;
  holdingLabel?: string;
  doneLabel?: string;
  durationMs?: number;
  // raised = main orange action, destructive = delete etc.
  variant?: "raised" | "destructive";
  disabled?: boolean;
  className?: string;
}

type HoldState = "idle" | "holding" | "done";

// How fast the fill drains back after letting go early (ms for a full bar)
const DRAIN_MS = 300;

// A button that fires only after being held for durationMs. Progress is driven by
// requestAnimationFrame from elapsed time, so the fill, the countdown and the
// moment onConfirm fires are always in sync. Letting go early drains it back.
export function HoldToConfirmButton({
  onConfirm,
  children,
  holdingLabel = "Trzymaj…",
  doneLabel = "Gotowe",
  durationMs = 1200,
  variant = "raised",
  disabled = false,
  className,
}: HoldToConfirmButtonProps) {
  const [state, setState] = useState<HoldState>("idle");
  const [progress, setProgress] = useState(0); // 0..1
  const frameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  // Latest onConfirm without restarting the animation when the parent re-renders
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  const stopFrame = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  useEffect(() => stopFrame, []);

  const setBoth = (value: number) => {
    progressRef.current = value;
    setProgress(value);
  };

  const start = () => {
    if (disabled || state === "done") return;
    stopFrame();
    setState("holding");

    // Continue from wherever a previous drain left off
    const startedAt = performance.now() - progressRef.current * durationMs;
    const tick = (now: number) => {
      const previous = progressRef.current;
      const value = Math.min((now - startedAt) / durationMs, 1);
      setBoth(value);
      // Light haptic tick halfway through, so the hold "counts" in the hand too
      if (previous < 0.5 && value >= 0.5) navigator.vibrate?.(8);
      if (value < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      frameRef.current = null;
      setState("done");
      navigator.vibrate?.(30); // short haptic tick on Android, no-op elsewhere
      onConfirmRef.current();
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (state !== "holding") return;
    stopFrame();
    setState("idle");

    const from = progressRef.current;
    const startedAt = performance.now();
    const drain = (now: number) => {
      const value = Math.max(from - (now - startedAt) / DRAIN_MS, 0);
      setBoth(value);
      if (value > 0) frameRef.current = requestAnimationFrame(drain);
      else frameRef.current = null;
    };
    frameRef.current = requestAnimationFrame(drain);
  };

  // Seconds left, e.g. "0,7 s" - the countdown makes the wait feel intentional (linear time)
  const secondsLeft = ((1 - progress) * durationMs) / 1000;
  // The fill itself eases in and out: a slow start, a rush through the middle,
  // a settle at the end - feels livelier than a constant-speed bar
  const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
  const isRaised = variant === "raised";
  const countdown = `${secondsLeft.toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;

  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled}
      // data-vaul-no-drag: holding inside a Drawer must not start dragging it
      data-vaul-no-drag
      className={cn(
        "relative touch-manipulation overflow-hidden select-none [-webkit-touch-callout:none]",
        // Springy bounce when the hold completes
        state === "done" && "motion-safe:animate-hold-pop",
        className,
      )}
      // Pressed in deeper the longer it's held (up to 4%)
      style={{ scale: state === "done" ? undefined : 1 - 0.04 * eased }}
      onPointerDown={(e) => {
        if (e.button === 0) start();
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      // Long-press on mobile would otherwise open the context menu / text selection
      onContextMenu={(e) => e.preventDefault()}
      // Keyboard: hold Space/Enter the same way
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
    >
      {/* Fill layer, revealed from the left with clip-path (not scaleX, which would
          stretch the shimmer inside it) */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden",
          isRaised ? "bg-white/25" : "bg-destructive/25",
        )}
        style={{ clipPath: `inset(0 ${(1 - eased) * 100}% 0 0)` }}
      >
        {/* Light sweeping across the fill while holding */}
        {state === "holding" && (
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent to-transparent motion-safe:animate-hold-shimmer",
              isRaised ? "via-white/40" : "via-destructive/30",
            )}
          />
        )}
      </span>

      {/* Glowing leading edge of the fill */}
      {progress > 0 && state !== "done" && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 w-0.5 -translate-x-full",
            isRaised
              ? "bg-white/80 shadow-[0_0_10px_2px_rgb(255_255_255/0.6)]"
              : "bg-destructive shadow-[0_0_10px_2px_var(--destructive)]",
          )}
          style={{ left: `${eased * 100}%` }}
        />
      )}

      {/* One-off flash of light when the hold completes */}
      {state === "done" && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 motion-safe:animate-hold-flash",
            isRaised ? "bg-white" : "bg-destructive/50",
          )}
        />
      )}

      <span className="relative flex items-center gap-1.5">
        {state === "done" ? (
          <>
            <CheckIcon className="motion-safe:animate-in motion-safe:spin-in-45 motion-safe:zoom-in-50 motion-safe:duration-300" />
            {doneLabel}
          </>
        ) : state === "holding" ? (
          <>
            {holdingLabel}
            <span className="min-w-10 text-left font-mono tabular-nums opacity-80">{countdown}</span>
          </>
        ) : (
          children
        )}
      </span>
    </Button>
  );
}

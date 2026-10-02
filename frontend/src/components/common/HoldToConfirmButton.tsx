import { useEffect, useRef, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { CheckIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { showInfoToast } from "@/utils/toastHandler";

// How long to hold, by how serious the action is - change the feel of the whole app here
const HOLD_DURATIONS = {
  short: 500, // bulk but easy to undo (mark / unmark all)
  normal: 800, // important but undoable (use a voucher)
  delete: 1200, // can't be undone in the app (delete list / items / recipe / voucher)
} as const;

export type HoldDuration = keyof typeof HOLD_DURATIONS;

// Colour of the fill layer - pick what reads well on the button's background
type HoldTone = "light" | "destructive" | "neutral";

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  // Idle content, e.g. "Przytrzymaj, aby wykorzystać" or an icon + "Usuń listę"
  children: React.ReactNode;
  // Shown on a too-short tap, e.g. "Przytrzymaj, aby usunąć listę"
  hint: string;
  duration?: HoldDuration;
  // Replaces children while holding; by default the children stay and a countdown is added
  holdingLabel?: string;
  // Shown after confirming; "" = only the check icon (icon-only buttons)
  doneLabel?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  tone?: HoldTone;
  // "row" = menu-row layout: content on the left, countdown on the right
  layout?: "center" | "row";
  showCountdown?: boolean;
  disabled?: boolean;
  className?: string;
}

type HoldState = "idle" | "holding" | "done";

// How fast the fill drains back after letting go early (ms for a full bar)
const DRAIN_MS = 300;
// A release before this much progress counts as a tap -> show the hint
const TAP_THRESHOLD = 0.15;
// If the action fails (button still mounted), go back to idle after this
const RESET_AFTER_DONE_MS = 2000;

const TONES: Record<HoldTone, { fill: string; shimmer: string; edge: string; flash: string }> = {
  light: {
    fill: "bg-white/25",
    shimmer: "via-white/40",
    edge: "bg-white/80 shadow-[0_0_10px_2px_rgb(255_255_255/0.6)]",
    flash: "bg-white",
  },
  destructive: {
    fill: "bg-destructive/25",
    shimmer: "via-destructive/30",
    edge: "bg-destructive shadow-[0_0_10px_2px_var(--destructive)]",
    flash: "bg-destructive/50",
  },
  neutral: {
    fill: "bg-foreground/10",
    shimmer: "via-foreground/15",
    edge: "bg-highlight shadow-[0_0_10px_2px_var(--highlight)]",
    flash: "bg-foreground/20",
  },
};

// A button that fires only after being held. Progress is driven by
// requestAnimationFrame from elapsed time, so the fill, the countdown and the
// moment onConfirm fires are always in sync. Letting go early drains it back,
// a quick tap explains what to do instead of silently doing nothing.
export function HoldToConfirmButton({
  onConfirm,
  children,
  hint,
  duration = "delete",
  holdingLabel,
  doneLabel = "Gotowe",
  variant = "raised",
  size,
  tone = variant === "raised" || variant === "accent" ? "light" : variant === "destructive" ? "destructive" : "neutral",
  layout = "center",
  showCountdown = true,
  disabled = false,
  className,
}: HoldToConfirmButtonProps) {
  const durationMs = HOLD_DURATIONS[duration];
  const [state, setState] = useState<HoldState>("idle");
  const [progress, setProgress] = useState(0); // 0..1
  const frameRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
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

  useEffect(
    () => () => {
      stopFrame();
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    },
    [],
  );

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

      // Usually the parent closes / unmounts us on success. If it doesn't
      // (e.g. the request failed), become usable again.
      resetTimerRef.current = window.setTimeout(() => {
        setState("idle");
        setBoth(0);
      }, RESET_AFTER_DONE_MS);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (state !== "holding") return;
    stopFrame();
    setState("idle");

    const from = progressRef.current;
    if (from < TAP_THRESHOLD) showInfoToast(hint);

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
  const countdown = `${secondsLeft.toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
  // The fill itself eases in and out: a slow start, a rush through the middle,
  // a settle at the end - feels livelier than a constant-speed bar
  const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
  const colors = TONES[tone];
  const isRow = layout === "row";
  // Menu rows sit flush inside a grouped list - shrinking / bouncing one row
  // pulls it away from its neighbours, so rows only get the fill effects
  const canScale = !isRow;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      aria-label={hint}
      // data-vaul-no-drag: holding inside a Drawer must not start dragging it
      data-vaul-no-drag
      className={cn(
        "relative touch-manipulation overflow-hidden select-none [-webkit-touch-callout:none]",
        // Springy bounce when the hold completes
        state === "done" && canScale && "motion-safe:animate-hold-pop",
        // Rows also skip the base Button's 1px press-down shift
        !canScale && "active:translate-y-0",
        className,
      )}
      // Pressed in deeper the longer it's held (up to 4%)
      style={{ scale: canScale && state !== "done" ? 1 - 0.04 * eased : undefined }}
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
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", colors.fill)}
        style={{ clipPath: `inset(0 ${(1 - eased) * 100}% 0 0)` }}
      >
        {/* Light sweeping across the fill while holding */}
        {state === "holding" && (
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent to-transparent motion-safe:animate-hold-shimmer",
              colors.shimmer,
            )}
          />
        )}
      </span>

      {/* Glowing leading edge of the fill */}
      {progress > 0 && state !== "done" && (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute inset-y-0 w-0.5 -translate-x-full", colors.edge)}
          style={{ left: `${eased * 100}%` }}
        />
      )}

      {/* One-off flash of light when the hold completes */}
      {state === "done" && (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 opacity-0 motion-safe:animate-hold-flash", colors.flash)}
        />
      )}

      <span className={cn("relative flex items-center gap-1.5", isRow && "w-full")}>
        {state === "done" ? (
          <>
            <CheckIcon className="motion-safe:animate-in motion-safe:spin-in-45 motion-safe:zoom-in-50 motion-safe:duration-300" />
            {doneLabel}
          </>
        ) : (
          <>
            {state === "holding" && holdingLabel ? holdingLabel : children}
            {state === "holding" && showCountdown && (
              <span className={cn("min-w-10 font-mono tabular-nums opacity-80", isRow ? "ml-auto text-right" : "text-left")}>
                {countdown}
              </span>
            )}
          </>
        )}
      </span>
    </Button>
  );
}

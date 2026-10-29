import { useEffect, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { LoaderCircle } from "lucide-react";

interface LoadingProps {
  title?: string;
  description?: string;
}

// Most loads finish in well under this, and a spinner that shows up for a few frames reads
// as a flicker, not as feedback. So the loader only appears if the wait is a real one.
const SHOW_AFTER_MS = 250;

// The one loader of the app: always centred in the whole screen area (never under a header),
// so every screen waits the same way
export function Loading({ title, description }: LoadingProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Keeps the screen's space, so nothing jumps when the real content (or the loader) arrives
  if (!isVisible) return <div className="w-full h-full" />;

  return (
    <div className="w-full h-full px-4 flex flex-col gap-3 items-center justify-center animate-in fade-in-0 duration-200">
      {/* reducedMotion="never" - a spinner communicates "still loading, not stuck";
          the global MotionConfig(reducedMotion="user") in main.tsx freezes rotate
          animations under prefers-reduced-motion, which would make this look hung
          instead of just simplifying a decorative transition. */}
      <MotionConfig reducedMotion="never">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
        >
          <LoaderCircle className="w-12 h-12 text-muted-foreground stroke-[1.5]" />
        </motion.div>
      </MotionConfig>
      <div className="flex flex-col gap-1 items-center max-w-xs">
        <h1 className="text-center text-base font-medium text-balance text-foreground">{title}</h1>
        <p className="text-center text-xs text-balance text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

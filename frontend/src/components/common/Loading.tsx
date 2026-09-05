import { motion, MotionConfig } from "framer-motion";
import { LoaderCircle } from "lucide-react";

interface LoadingProps {
  title?: string;
  description?: string;
}

export function Loading({ title, description }: LoadingProps) {
  return (
    <div className="w-full h-full px-4 flex flex-col gap-3 items-center justify-center">
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

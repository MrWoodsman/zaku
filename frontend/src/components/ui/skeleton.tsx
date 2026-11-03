import { cn } from "@/lib/utils";

// A grey placeholder block. Pulses by fading (opacity only, so it costs nothing to animate)
// and stands still for reduced motion.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted animate-pulse motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };

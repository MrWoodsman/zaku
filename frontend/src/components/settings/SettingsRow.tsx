import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SettingsRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

// forwardRef + ...rest is required here, not just style: Radix's
// DropdownMenuTrigger asChild clones a ref and aria-*/data-* props onto its
// child to open/position the menu - without forwarding them the trigger
// silently does nothing when clicked.
//
// Two explicit branches (button vs. div) instead of a single JSX element with
// a dynamic `Comp` tag: TypeScript checks a variable-tag element against the
// INTERSECTION of both elements' prop types, which onClick can't satisfy
// (MouseEventHandler<HTMLButtonElement> vs. MouseEventHandler<HTMLDivElement>
// aren't mutually assignable) - a real tsc -b build fails on it even though
// this repo's `tsc --noEmit` pass didn't catch it.
export const SettingsRow = forwardRef<HTMLButtonElement | HTMLDivElement, SettingsRowProps>(
  ({ icon, label, trailing, destructive, className, onClick, ...rest }, ref) => {
    const content = (
      <>
        {icon && (
          <span className={cn("shrink-0", destructive ? "text-destructive" : "text-muted-foreground")}>
            {icon}
          </span>
        )}
        <span
          className={cn(
            "flex-1 text-sm",
            destructive ? "font-medium text-destructive" : "text-foreground",
          )}
        >
          {label}
        </span>
        {trailing}
      </>
    );

    const rowClassName = cn(
      "flex w-full items-center gap-3 px-1 py-3 text-left",
      onClick && "transition-colors active:bg-foreground/5",
      className,
    );

    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={onClick}
          className={rowClassName}
          {...rest}
        >
          {content}
        </button>
      );
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={rowClassName}
        {...(rest as React.HTMLAttributes<HTMLDivElement>)}
      >
        {content}
      </div>
    );
  },
);
SettingsRow.displayName = "SettingsRow";

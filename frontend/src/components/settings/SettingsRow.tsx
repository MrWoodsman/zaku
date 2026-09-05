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
export const SettingsRow = forwardRef<HTMLButtonElement | HTMLDivElement, SettingsRowProps>(
  ({ icon, label, trailing, destructive, className, onClick, ...rest }, ref) => {
    const Comp = onClick ? "button" : "div";

    return (
      <Comp
        ref={ref as never}
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-1 py-3 text-left",
          onClick && "transition-colors active:bg-foreground/5",
          className,
        )}
        {...rest}
      >
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
      </Comp>
    );
  },
);
SettingsRow.displayName = "SettingsRow";

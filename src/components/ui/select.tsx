import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-xl border-2 border-simpson-ink bg-white px-3 text-sm outline-none ring-simpson-cyan/50 focus:ring-4",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

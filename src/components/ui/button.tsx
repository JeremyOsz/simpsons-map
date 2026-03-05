import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl border-2 border-simpson-ink px-4 py-2 text-sm font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-simpson-cyan text-simpson-ink hover:bg-sky-300",
        outline: "bg-white/90 text-simpson-ink hover:bg-sky-50"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within <Dialog>.");
  return context;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

type DialogOverlayProps = React.HTMLAttributes<HTMLDivElement>;

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  const { open, onOpenChange } = useDialogContext();
  if (!open) return null;
  return createPortal(
    <div
      className={cn("fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px]", className)}
      onClick={() => onOpenChange(false)}
      {...props}
    />,
    document.body
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showClose?: boolean;
  containerClassName?: string;
}

export function DialogContent({ className, children, showClose = true, containerClassName, ...props }: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext();
  if (!open) return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-50 grid place-items-center p-4", containerClassName)}>
      <div
        className={cn(
          "relative w-full max-w-lg rounded-2xl border-2 border-simpson-ink bg-white p-4 shadow-cartoon sm:p-5",
          className
        )}
        onClick={(event) => event.stopPropagation()}
        {...props}
      >
        {showClose && (
          <button
            type="button"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("pr-8 text-xl font-black text-slate-900", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm font-semibold text-slate-600", className)} {...props} />;
}

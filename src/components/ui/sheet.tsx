"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>;
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "bottom" | "right";
}

export function SheetContent({ className, side = "bottom", ...props }: SheetContentProps) {
  return (
    <>
      <DialogOverlay />
      <DialogContent
        containerClassName="place-items-end p-0"
        className={cn(
          "max-w-fit rounded-none border-2 border-simpson-ink p-4 sm:p-5",
          side === "bottom"
            ? "fixed inset-x-2 bottom-0 top-[20px] max-h-none rounded-t-3xl border-b-0"
            : "fixed inset-y-0 right-0 left-auto h-full w-[88vw] max-w-md rounded-l-3xl border-r-0",
          className
        )}
        {...props}
      />
    </>
  );
}

export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;

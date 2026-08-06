"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Sheet({ ...props }: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cx(
        "fixed inset-0 z-50 bg-slate-950/35",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right" | "top" | "bottom";
}) {
  const sideClasses = {
    left: "inset-y-0 left-0 h-full w-full max-w-xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
    right:
      "inset-y-0 right-0 h-full w-full max-w-xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
    top: "inset-x-0 top-0 h-auto w-full data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom:
      "inset-x-0 bottom-0 h-auto w-full data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cx(
          "fixed z-50 bg-white shadow-2xl transition ease-in-out p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:duration-300 data-[state=open]:duration-500",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
        className={cx("mb-6 space-y-1.5", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cx(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cx("text-lg font-semibold text-slate-900", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cx("text-sm text-slate-600", className)}
      {...props}
    />
  );
}

type SheetActionButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

function SheetActionButton({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "secondary",
}: SheetActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-sky-700 text-white hover:bg-sky-800"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

export {
  Sheet,
  SheetActionButton,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};

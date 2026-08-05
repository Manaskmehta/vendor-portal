"use client";

import Image from "next/image";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: ReactNode;
};

export default function SubmitButton({
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: SubmitButtonProps) {
  const busy = Boolean(loading || disabled);

  return (
    <button
      type={type}
      {...props}
      disabled={busy}
      aria-busy={loading || undefined}
      className={cn(className, loading && "pointer-events-none")}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Image
            src="/ring.png"
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 animate-spin"
            aria-hidden
            unoptimized
          />
          {loadingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

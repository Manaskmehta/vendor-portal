import Image from "next/image";
import { cn } from "@/lib/utils";

export function LoaderSpinner({
  text = "Loading...",
  className,
  size = 72,
}: {
  text?: string;
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Image
        src="/ring.png"
        alt=""
        width={size}
        height={size}
        className="animate-spin"
        aria-hidden
        unoptimized
        priority
      />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-300">{text}</p>
    </div>
  );
}

export default function Loader({ text = "Loading..." }: { text?: string }) {
  return (
    <div
      className="flex min-h-[50vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderSpinner text={text} />
    </div>
  );
}

export function SectionLoader({
  text = "Loading...",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex w-full items-center justify-center py-16", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderSpinner text={text} />
    </div>
  );
}

export function TableLoader({
  colSpan,
  text = "Loading...",
  className,
}: {
  colSpan: number;
  text?: string;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("px-6 py-20 text-center", className)}>
        <LoaderSpinner text={text} />
      </td>
    </tr>
  );
}

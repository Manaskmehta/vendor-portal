"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, ImageIcon } from "lucide-react";
import { API_BASE } from "@/lib/config";

function resolveUploadUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

function getFileKind(fileUrl: string | null): "image" | "pdf" | "other" {
  if (!fileUrl) return "other";
  const normalized = fileUrl.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?|#|$)/.test(normalized)) return "image";
  if (/\.pdf(\?|#|$)/.test(normalized)) return "pdf";
  return "other";
}

export default function ViewerPage() {
  const searchParams = useSearchParams();
  const fileName = searchParams.get("name") || "Uploaded File";
  const fileUrl = useMemo(() => resolveUploadUrl(searchParams.get("url")), [searchParams]);
  const fileKind = useMemo(() => getFileKind(fileUrl), [fileUrl]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-black">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">File Viewer</p>
            <h1 className="text-3xl font-black tracking-tighter">{fileName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em]">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            {fileUrl && (
              <>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em]">
                  <ExternalLink className="h-4 w-4" />
                  Open Original
                </a>
                <a href={fileUrl} download className="inline-flex items-center gap-2 rounded-lg border border-black bg-black px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </>
            )}
          </div>
        </div>

        {!fileUrl ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 text-center">
            <FileText className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-bold text-gray-500">No file URL was provided.</p>
          </div>
        ) : fileKind === "image" ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-4">
            <img src={fileUrl} alt={fileName} className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain" />
          </div>
        ) : fileKind === "pdf" ? (
          <div className="h-[78vh] overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <iframe title={fileName} src={fileUrl} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 text-center">
            <ImageIcon className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-bold text-gray-600">Preview is not available for this file type.</p>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-black bg-black px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white">
              Open File
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

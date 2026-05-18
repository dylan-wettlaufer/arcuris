"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

type DownloadPdfButtonProps = {
  applicationId: string;
};

function filenameFromDisposition(disposition: string | null): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "resume.pdf";
}

export function DownloadPdfButton({ applicationId }: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload(): Promise<void> {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}/pdf`);

      if (!response.ok) {
        throw new Error("PDF download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromDisposition(
        response.headers.get("Content-Disposition")
      );
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={loading}
      onClick={() => {
        void handleDownload();
      }}
      type="button"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Download PDF
        </>
      )}
    </button>
  );
}

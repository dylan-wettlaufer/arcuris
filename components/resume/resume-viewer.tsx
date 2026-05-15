"use client";

import { AlertCircle, Printer } from "lucide-react";
import { type BulletFeedback } from "@/lib/types";
import { useState } from "react";

type ResumeViewerProps = {
  bulletFeedback: BulletFeedback[];
  resumeMarkdown: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeMarkdownLine(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[-*]\s*/, "- ")
    .replace(/\*\*/g, "")
    .trim();
}

function JakeResumePreview({ resumeMarkdown }: { resumeMarkdown: string }) {
  const lines = resumeMarkdown
    .split("\n")
    .map((line) => normalizeMarkdownLine(line))
    .filter((line) => line.length > 0);
  const name = lines[0] ?? "Generated Resume";
  const contactLine = lines[1] ?? "";
  const bodyLines = lines.slice(contactLine.length > 0 ? 2 : 1);

  return (
    <div className="aspect-[8.5/11] w-full overflow-hidden bg-white p-8 text-black shadow-xl">
      <div className="text-center">
        <h2 className="font-serif text-[22px] leading-tight text-black">
          {name}
        </h2>
        {contactLine.length > 0 ? (
          <p className="mt-1 font-serif text-[9px] leading-tight text-black">
            {contactLine}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-1.5 font-serif text-[9.5px] leading-snug text-black">
        {bodyLines.map((line, index) => {
          const isBullet = line.startsWith("- ");
          const nextLine = bodyLines[index + 1] ?? "";
          const isSection =
            !isBullet &&
            line.length < 40 &&
            line === line.toUpperCase() &&
            nextLine.startsWith("- ");

          if (isSection) {
            return (
              <div className="pt-2" key={`${line}-${index}`}>
                <h3 className="border-b border-black pb-0.5 text-[10px] uppercase tracking-normal">
                  {line}
                </h3>
              </div>
            );
          }

          return (
            <p
              className={isBullet ? "pl-4 -indent-3" : "font-semibold"}
              key={`${line}-${index}`}
            >
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function ResumeViewer({
  bulletFeedback,
  resumeMarkdown
}: ResumeViewerProps) {
  const [error, setError] = useState<string | null>(null);

  function handlePrintResume() {
    setError(null);

    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (printWindow === null) {
      setError("Allow popups to print the generated resume.");
      return;
    }

    const resumeLines = resumeMarkdown
      .split("\n")
      .map((line) => normalizeMarkdownLine(line))
      .filter((line) => line.length > 0)
      .join("\n");

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Generated Resume</title>
    <style>
      body {
        color: #000;
        font-family: "Times New Roman", Times, serif;
        line-height: 1.15;
        margin: 0;
        padding: 0.45in 0.55in;
      }

      pre {
        font-family: "Times New Roman", Times, serif;
        font-size: 10px;
        white-space: pre-wrap;
      }

      @page {
        margin: 0.45in;
      }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(resumeLines)}</pre>
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="grid gap-6">
      {error !== null ? (
        <div
          className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(460px,1.15fr)]">
        <section className="grid content-start gap-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Bullet changes
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Original vault bullets and the tailored changes made for this
              application.
            </p>
          </div>

          {bulletFeedback.length > 0 ? (
            <div className="grid max-h-[760px] gap-4 overflow-auto pr-1">
              {bulletFeedback.map((item, index) => (
                <article
                  className="grid gap-3 rounded-xl border border-border bg-secondary p-4"
                  key={`${item.source}-${index}`}
                >
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.source}
                  </p>

                  <div className="grid gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Original vault bullet
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.originalBullet}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Tailored resume bullet
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.rewrittenBullet}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        What changed
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.feedback}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary p-5">
              <p className="text-sm font-medium text-foreground">
                Bullet history was not saved for this application.
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                New generated resumes will show original vault bullets beside
                the AI-tailored rewrites here.
              </p>
            </div>
          )}
        </section>

        <section className="grid content-start gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Resume preview
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Jake-style single-page PDF layout preview.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              onClick={handlePrintResume}
              type="button"
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              Print PDF
            </button>
          </div>
          <div className="overflow-auto rounded-xl border border-border bg-secondary p-4">
            <JakeResumePreview resumeMarkdown={resumeMarkdown} />
          </div>
        </section>
      </div>
    </section>
  );
}

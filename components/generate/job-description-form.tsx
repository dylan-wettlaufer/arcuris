"use client";

import { type GeneratedResume } from "@/lib/types";
import { AlertCircle, ArrowLeft, Loader2, Printer, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

const maxJobDescriptionLength = 60_000;
const minJobDescriptionLength = 200;

type GenerateResult = GeneratedResume & {
  applicationId: string;
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
    .replace(/^\s*[-*]\s*/, "• ")
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
          const isBullet = line.startsWith("• ");
          const nextLine = bodyLines[index + 1] ?? "";
          const isSection =
            !isBullet &&
            line.length < 40 &&
            line === line.toUpperCase() &&
            nextLine.startsWith("• ");

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

export function JobDescriptionForm() {
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const trimmedJobDescription = jobDescription.trim();
  const canContinue =
    trimmedJobDescription.length >= minJobDescriptionLength &&
    trimmedJobDescription.length <= maxJobDescriptionLength;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (trimmedJobDescription.length < minJobDescriptionLength) {
      setError("Paste the full job description before generating.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ jobDescription: trimmedJobDescription })
      });

      const responseBody = (await response.json().catch(() => null)) as
        | (GenerateResult & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(
          responseBody?.error ?? "Resume generation failed. Try again."
        );
      }

      if (responseBody === null || responseBody.error !== undefined) {
        throw new Error(responseBody?.error ?? "Resume generation failed.");
      }

      setResult(responseBody);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Resume generation failed. Try again."
      );
    } finally {
      setPending(false);
    }
  }

  function handlePrintResume() {
    if (result === null) {
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (printWindow === null) {
      setError("Allow popups to print the generated resume.");
      return;
    }

    const resumeLines = result.refinedResumeMarkdown
      .split("\n")
      .map((line) => normalizeMarkdownLine(line))
      .filter((line) => line.length > 0)
      .join("\n");

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(result.roleTitle)} Resume</title>
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

  if (result !== null) {
    return (
      <section className="grid gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Application logged</p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight text-foreground">
              {result.companyName} - {result.roleTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Refined from {result.draftScore}/10 to {result.refinedScore}/10.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => setResult(null)}
              type="button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              New JD
            </button>
            <button
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              onClick={handlePrintResume}
              type="button"
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              Print PDF
            </button>
          </div>
        </div>

        {error !== null ? (
          <div
            className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
          <section className="grid content-start gap-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Bullet rewrite review
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Original bullets, draft rewrites, final rewrites, and the
                refinement feedback applied.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["ATS", result.atsFriendliness],
                ["Impact", result.impactClarity],
                ["JD Fit", result.narrativeFit]
              ].map(([label, score]) => (
                <div
                  className="rounded-xl border border-border bg-secondary p-4"
                  key={label}
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-medium text-foreground">
                    {score}/10
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              {result.bulletFeedback.map((item, index) => (
                <article
                  className="rounded-xl border border-border bg-secondary p-4"
                  key={`${item.source}-${index}`}
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {item.source}
                  </p>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Original
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.originalBullet}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Draft rewrite
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.draftBullet}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Final rewrite
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.rewrittenBullet}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Refinement feedback
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.feedback}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid content-start gap-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Resume preview
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Jake-style single-page PDF layout preview.
              </p>
            </div>
            <div className="overflow-auto rounded-xl border border-border bg-secondary p-4">
              <JakeResumePreview resumeMarkdown={result.refinedResumeMarkdown} />
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <form
      className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
      onSubmit={handleSubmit}
    >
      {error !== null ? (
        <div
          className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="grid gap-3">
        <label className="grid gap-2" htmlFor="job-description">
          <span className="text-base font-medium text-foreground">
            Paste job description
          </span>
          <span className="text-sm leading-6 text-muted-foreground">
            Include the full posting text, requirements, responsibilities, and
            company context.
          </span>
        </label>
        <textarea
          className="min-h-96 rounded-lg border border-input bg-secondary px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          disabled={pending}
          id="job-description"
          name="job_description"
          onChange={(event) => {
            setError(null);
            setJobDescription(event.target.value);
          }}
          placeholder="Paste the job description here..."
          value={jobDescription}
        />
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {trimmedJobDescription.length.toLocaleString()} /{" "}
            {maxJobDescriptionLength.toLocaleString()} characters
          </span>
          <span>Minimum {minJobDescriptionLength.toLocaleString()} characters</span>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          This will generate and log an application record.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canContinue || pending}
          type="submit"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Running three-pass review
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Generate resume
            </>
          )}
        </button>
      </div>
    </form>
  );
}

"use client";

import { AlertCircle, BriefcaseBusiness, FileText, Loader2, Printer, Sparkles } from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { type GeneratedResume } from "@/lib/types";

const acceptedTextTypes = new Set(["text/plain", "text/markdown"]);
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

export function JobDescriptionForm() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const trimmedJobDescription = jobDescription.trim();
  const canContinue =
    trimmedJobDescription.length >= minJobDescriptionLength &&
    trimmedJobDescription.length <= maxJobDescriptionLength;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError(null);

    if (selectedFile === null) {
      return;
    }

    if (
      !acceptedTextTypes.has(selectedFile.type) &&
      !selectedFile.name.toLowerCase().endsWith(".txt") &&
      !selectedFile.name.toLowerCase().endsWith(".md")
    ) {
      event.target.value = "";
      setError("Upload a plain text job description, or paste it below.");
      return;
    }

    const fileText = await selectedFile.text();

    if (fileText.trim().length === 0) {
      event.target.value = "";
      setError("That job description file is empty.");
      return;
    }

    if (fileText.length > maxJobDescriptionLength) {
      event.target.value = "";
      setError("That job description is too long.");
      return;
    }

    setSourceName(selectedFile.name);
    setJobDescription(fileText);
  }

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

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(result.roleTitle)} Resume</title>
    <style>
      body {
        color: #111827;
        font-family: "DM Sans", Arial, sans-serif;
        line-height: 1.45;
        margin: 0;
        padding: 32px;
      }

      pre {
        font-family: "DM Sans", Arial, sans-serif;
        font-size: 11px;
        white-space: pre-wrap;
      }

      @page {
        margin: 0.5in;
      }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(result.refinedResumeMarkdown)}</pre>
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

      <section className="grid gap-4 rounded-xl border border-border bg-secondary p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-medium text-foreground">
              Job description file
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Upload a .txt or .md job description when you have one saved.
            </p>
          </div>
        </div>

        <input
          accept=".txt,.md,text/plain,text/markdown"
          className="sr-only"
          id="job-description-file"
          name="job_description_file"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center transition hover:bg-muted"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">
            {sourceName ?? "Choose a job description file"}
          </span>
          <span className="text-xs text-muted-foreground">
            Plain text and markdown files are accepted.
          </span>
        </button>
      </section>

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
          className="min-h-80 rounded-lg border border-input bg-secondary px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
          {sourceName !== null ? <span>Loaded from {sourceName}</span> : null}
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
              Generating resume
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Generate resume
            </>
          )}
        </button>
      </div>

      {result !== null ? (
        <section className="grid gap-5 border-t border-border pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Application logged
              </p>
              <h2 className="mt-1 text-2xl font-medium tracking-tight text-foreground">
                {result.companyName} - {result.roleTitle}
              </h2>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={handlePrintResume}
              type="button"
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              Print resume
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Draft", result.draftScore],
              ["Refined", result.refinedScore],
              ["ATS", result.atsFriendliness],
              ["Impact", result.impactClarity]
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

          <section className="rounded-xl border border-border bg-secondary p-5">
            <h3 className="text-base font-medium text-foreground">
              Improvements applied
            </h3>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              {result.improvements.map((improvement) => (
                <li className="flex gap-3" key={improvement}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-secondary p-5">
            <h3 className="text-base font-medium text-foreground">
              Final resume
            </h3>
            <pre className="mt-4 max-h-[720px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-5 font-sans text-sm leading-6 text-foreground">
              {result.refinedResumeMarkdown}
            </pre>
          </section>
        </section>
      ) : null}
    </form>
  );
}

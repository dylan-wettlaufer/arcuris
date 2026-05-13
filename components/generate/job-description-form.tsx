"use client";

import { AlertCircle, BriefcaseBusiness, FileText, Sparkles } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

const acceptedTextTypes = new Set(["text/plain", "text/markdown"]);
const maxJobDescriptionLength = 60_000;

export function JobDescriptionForm() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedJobDescription = jobDescription.trim();
  const canContinue =
    trimmedJobDescription.length > 0 &&
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

  function handleGenerateClick() {
    setError("Generation will be wired in the next implementation pass.");
  }

  return (
    <form className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
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
          Generation wiring comes next.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canContinue}
          onClick={handleGenerateClick}
          type="button"
        >
          <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
          Generate resume
        </button>
      </div>
    </form>
  );
}

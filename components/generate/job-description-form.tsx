"use client";

import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const maxJobDescriptionLength = 60_000;
const minJobDescriptionLength = 200;

type GenerateResult = {
  applicationId: string;
  error?: string;
};

export function JobDescriptionForm() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        | GenerateResult
        | null;

      if (!response.ok) {
        throw new Error(
          responseBody?.error ?? "Resume generation failed. Try again."
        );
      }

      if (responseBody === null || responseBody.error !== undefined) {
        throw new Error(responseBody?.error ?? "Resume generation failed.");
      }

      router.push(`/resume/${responseBody.applicationId}`);
      router.refresh();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Resume generation failed. Try again."
      );
      setPending(false);
    }
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

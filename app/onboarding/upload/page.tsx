"use client";

import { AlertCircle, FileText, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

const acceptedPdfType = "application/pdf";

export default function OnboardingUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError(null);

    if (selectedFile === null) {
      setResumeFile(null);
      return;
    }

    if (selectedFile.type !== acceptedPdfType) {
      setResumeFile(null);
      event.target.value = "";
      setError("Upload a pdf file, or paste your resume text below.");
      return;
    }

    setResumeFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedResumeText = resumeText.trim();

    if (resumeFile === null && trimmedResumeText.length === 0) {
      setError("Upload a pdf file or paste your resume text to continue.");
      return;
    }

    setPending(true);

    try {
      const formData = new FormData();

      if (resumeFile !== null) {
        formData.append("resume_file", resumeFile);
      }

      if (trimmedResumeText.length > 0) {
        formData.append("resume_text", trimmedResumeText);
      }

      const response = await fetch("/api/onboarding/parse-resume", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const fallbackMessage =
          response.status >= 500
            ? "Resume parsing failed. Try again in a moment."
            : "Check your resume input and try again.";

        throw new Error(fallbackMessage);
      }

      router.push("/onboarding/interview");
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Resume parsing failed. Try again in a moment."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">
      <div className="mb-8">
        <p className="mb-3 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
          Onboarding
        </p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Add your baseline resume.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Upload a pdf resume or paste the text directly. Arcuris will parse it
          into your inventory, then ask a few follow-up questions.
        </p>
      </div>

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
              <Upload className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground">
                Upload pdf
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use your current master resume. Pdf files are accepted for this
                onboarding step.
              </p>
            </div>
          </div>

          <input
            accept=".pdf,application/pdf"
            className="sr-only"
            id="resume-file"
            name="resume_file"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {resumeFile?.name ?? "Choose a pdf file"}
            </span>
            <span className="text-xs text-muted-foreground">
              You can also paste your resume below.
            </span>
          </button>
        </section>

        <section className="grid gap-3">
          <label className="grid gap-2" htmlFor="resume-text">
            <span className="text-base font-medium text-foreground">
              Paste resume text
            </span>
            <span className="text-sm leading-6 text-muted-foreground">
              Paste is useful when your pdf is hard to parse or you want to
              start from plain text.
            </span>
          </label>
          <textarea
            className="min-h-64 rounded-lg border border-input bg-secondary px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            id="resume-text"
            name="resume_text"
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your resume here..."
            value={resumeText}
          />
        </section>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Submit when at least one input is ready.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Parsing resume
              </>
            ) : (
              "Continue to interview"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

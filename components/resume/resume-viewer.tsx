"use client";

import { DownloadPdfButton } from "@/components/resume/download-pdf-button";
import { JakeResumeStructuredPreview } from "@/components/resume/jake-resume-structured-preview";
import { resumePreviewFontClass } from "@/components/resume/resume-preview-font";
import { ResumeJsonEditor } from "@/components/resume/resume-json-editor";
import {
  generatedResumeJsonSchema,
  type BulletFeedback,
  type GeneratedResumeJson
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ResumeViewerProps = {
  applicationId: string;
  bulletFeedback: BulletFeedback[];
  resumeJson: GeneratedResumeJson | null;
  resumeMarkdown: string;
};

function normalizeMarkdownLine(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[-*]\s*/, "- ")
    .replace(/\*\*/g, "")
    .trim();
}

function JakeResumeMarkdownPreview({
  resumeMarkdown
}: {
  resumeMarkdown: string;
}) {
  const lines = resumeMarkdown
    .split("\n")
    .map((line) => normalizeMarkdownLine(line))
    .filter((line) => line.length > 0);
  const name = lines[0] ?? "Generated Resume";
  const contactLine = lines[1] ?? "";
  const bodyLines = lines.slice(contactLine.length > 0 ? 2 : 1);

  return (
    <div
      className={`aspect-[8.5/11] w-full overflow-hidden bg-white p-[0.55in] text-neutral-950 shadow-xl ${resumePreviewFontClass}`}
    >
      <div className="text-center">
        <h2 className="text-[16pt] font-medium leading-[1.15] tracking-tight text-neutral-950">
          {name}
        </h2>
        {contactLine.length > 0 ? (
          <p className="mt-1 text-[9.5pt] leading-normal text-neutral-800">
            {contactLine}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-1.5 text-[10pt] leading-[1.42] text-neutral-950">
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
                <h3 className="border-b-[0.5px] border-neutral-800 pb-1 text-[11pt] font-medium uppercase tracking-[0.06em]">
                  {line}
                </h3>
              </div>
            );
          }

          return (
            <p
              className={isBullet ? "pl-4 -indent-3" : "font-medium"}
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
  applicationId,
  bulletFeedback,
  resumeJson,
  resumeMarkdown
}: ResumeViewerProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "editor">("preview");
  const [currentResumeJson, setCurrentResumeJson] =
    useState<GeneratedResumeJson | null>(resumeJson);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "invalid" | "error"
  >("idle");
  const lastSavedJsonRef = useRef(
    resumeJson === null ? "" : JSON.stringify(resumeJson)
  );
  const hasStructuredPdf = currentResumeJson !== null;

  useEffect(() => {
    if (currentResumeJson === null) {
      return;
    }

    const serialized = JSON.stringify(currentResumeJson);
    if (serialized === lastSavedJsonRef.current) {
      return;
    }

    const parsed = generatedResumeJsonSchema.safeParse(currentResumeJson);
    if (!parsed.success) {
      setSaveStatus("invalid");
      return;
    }

    setSaveStatus("saving");
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/applications/${encodeURIComponent(applicationId)}/resume-json`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.data)
            }
          );
          const body = (await response.json().catch(() => null)) as
            | { resumeJson?: GeneratedResumeJson; error?: string }
            | null;

          if (!response.ok || body?.resumeJson === undefined) {
            throw new Error(body?.error ?? "Could not save resume changes.");
          }

          const saved = generatedResumeJsonSchema.parse(body.resumeJson);
          lastSavedJsonRef.current = JSON.stringify(saved);
          setCurrentResumeJson(saved);
          setSaveStatus("saved");
          toast.success("Resume changes saved");
        } catch (error: unknown) {
          setSaveStatus("error");
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not save resume changes."
          );
        }
      })();
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [applicationId, currentResumeJson]);

  return (
    <section className="grid gap-6">
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
                Resume
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasStructuredPdf
                  ? "Preview the generated resume or edit its saved structured fields."
                  : "Markdown-only preview until structured resume data is available."}
              </p>
            </div>
            {hasStructuredPdf ? (
              <DownloadPdfButton applicationId={applicationId} />
            ) : (
              <span className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground">
                PDF unavailable
              </span>
            )}
          </div>

          {currentResumeJson !== null ? (
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex w-fit rounded-lg border border-border bg-secondary p-1">
                  {(["preview", "editor"] as const).map((tab) => (
                    <button
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium transition",
                        activeTab === tab
                          ? "bg-card text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                      }}
                      type="button"
                    >
                      {tab === "preview" ? "Preview" : "Editor"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                      ? "Saved"
                      : saveStatus === "invalid"
                        ? "Finish required fields to autosave"
                        : saveStatus === "error"
                          ? "Save failed"
                          : "Autosave on"}
                </p>
              </div>

              {activeTab === "preview" ? (
                <div className="overflow-auto rounded-xl border border-border bg-secondary p-4">
                  <JakeResumeStructuredPreview resume={currentResumeJson} />
                </div>
              ) : (
                <ResumeJsonEditor
                  resume={currentResumeJson}
                  onChange={setCurrentResumeJson}
                />
              )}
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-border bg-secondary p-4">
              {resumeMarkdown.length > 0 ? (
                <JakeResumeMarkdownPreview resumeMarkdown={resumeMarkdown} />
              ) : (
                <div className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>This resume does not have editable structured data.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

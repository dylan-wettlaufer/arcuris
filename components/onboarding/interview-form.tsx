"use client";

import {
  type InterviewAnswersRecord,
  type InterviewQuestion
} from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type InterviewFormProps = {
  questions: InterviewQuestion[];
  initialAnswers: InterviewAnswersRecord;
};

type QuestionBlock = {
  experienceLabel: string;
  experienceIndex: number;
  rows: InterviewQuestion[];
};

export function InterviewForm({
  questions,
  initialAnswers
}: InterviewFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<InterviewAnswersRecord>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const questionBlocks = useMemo((): QuestionBlock[] => {
    const ordered = [...questions].sort((a, b) => {
      const byIndex = a.experienceIndex - b.experienceIndex;
      return byIndex !== 0
        ? byIndex
        : a.id.localeCompare(b.id);
    });

    const byIndex = new Map<number, QuestionBlock>();
    for (const question of ordered) {
      const existing = byIndex.get(question.experienceIndex);
      if (!existing) {
        byIndex.set(question.experienceIndex, {
          experienceLabel: question.experienceLabel,
          experienceIndex: question.experienceIndex,
          rows: [question]
        });
      } else {
        existing.rows.push(question);
      }
    }

    return [...byIndex.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, block]) => block);
  }, [questions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const submittedAnswers = questions.map((question) => ({
      questionId: question.id,
      answer: (answers[question.id] ?? "").trim()
    }));

    if (submittedAnswers.some((answer) => answer.answer.length === 0)) {
      setError("Answer each question before continuing.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/onboarding/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ answers: submittedAnswers })
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(responseBody?.error ?? "Could not save your answers.");
      }

      const responseBody = (await response.json()) as { redirectTo?: string };
      router.push(responseBody.redirectTo ?? "/dashboard");
      router.refresh();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your answers."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 grid gap-10" onSubmit={handleSubmit}>
      {error !== null ? (
        <div
          className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {questionBlocks.map((block) => (
        <div className="grid gap-5" key={block.experienceIndex}>
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-medium text-foreground">{block.experienceLabel}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Same four prompts per technical role so tailored bullets stay grounded.
            </p>
          </div>

          {block.rows.map((question, slot) => (
            <section className="rounded-xl border border-border bg-secondary p-5" key={question.id}>
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card font-mono text-sm text-primary">
                  {slot + 1}
                </span>
                <div>
                  <label className="text-base font-medium text-foreground" htmlFor={`answer-${question.id}`}>
                    {question.question}
                  </label>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{question.reason}</p>
                </div>
              </div>
              <textarea
                className="min-h-32 w-full rounded-lg border border-input bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending}
                id={`answer-${question.id}`}
                onChange={(event) => {
                  setAnswers((currentAnswers) => ({
                    ...currentAnswers,
                    [question.id]: event.target.value
                  }));
                }}
                placeholder="Facts and specifics work best—the model only uses what you confirm here..."
                value={answers[question.id] ?? ""}
              />
            </section>
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">These answers will be saved with your inventory.</p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving answers
            </>
          ) : (
            "Finish onboarding"
          )}
        </button>
      </div>
    </form>
  );
}

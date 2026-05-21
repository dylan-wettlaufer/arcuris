import { z } from "zod";

function getAiServiceBaseUrl(): string {
  const base = process.env.AI_SERVICE_URL?.trim();
  if (base === undefined || base.length === 0) {
    throw new Error(
      "Missing AI_SERVICE_URL (e.g. http://127.0.0.1:8001 when ai-service maps host 8001 to container port 8000)."
    );
  }
  return base.replace(/\/$/, "");
}

const enqueueResponseSchema = z.object({
  task_id: z.string().min(1)
});

const jobStatusSchema = z.union([
  z.object({
    status: z.literal("PENDING"),
    result: z.null(),
    error: z.null()
  }),
  z.object({
    status: z.literal("SUCCESS"),
    result: z.unknown(),
    error: z.null()
  }),
  z.object({
    status: z.literal("FAILURE"),
    result: z.null(),
    error: z.string()
  }),
  z.object({
    status: z.string(),
    result: z.null(),
    error: z.null().optional()
  })
]);

export async function enqueueResumeGenerationJob(body: {
  parsed_resume: unknown;
  interview_answers: Record<string, string>;
  archive_notes: unknown[];
  job_description: string;
}): Promise<string> {
  const url = `${getAiServiceBaseUrl()}/jobs/generate`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parsed_resume: body.parsed_resume,
      interview_answers: body.interview_answers,
      archive_notes: body.archive_notes,
      job_description: body.job_description
    })
  });

  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof raw === "object" && raw !== null && "detail" in raw
        ? (raw as { detail: unknown }).detail
        : null;
    const message =
      typeof detail === "string"
        ? detail
        : detail !== null
          ? JSON.stringify(detail)
          : `AI service enqueue failed (${response.status}).`;
    throw new Error(message);
  }

  const parsed = enqueueResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("AI service returned an unexpected enqueue payload.");
  }
  return parsed.data.task_id;
}

export async function fetchResumeGenerationJobStatus(taskId: string): Promise<
  | { kind: "pending" }
  | { kind: "failure"; error: string }
  | { kind: "success"; result: unknown }
> {
  const url = `${getAiServiceBaseUrl()}/jobs/${encodeURIComponent(taskId)}`;
  const response = await fetch(url, { method: "GET" });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`AI service status failed (${response.status}).`);
  }
  const parsed = jobStatusSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("AI service returned an unexpected status payload.");
  }
  const body = parsed.data;
  if (body.status === "PENDING") {
    return { kind: "pending" };
  }
  if (body.status === "FAILURE") {
    return { kind: "failure", error: body.error ?? "Task failed." };
  }
  if (body.status === "SUCCESS") {
    return { kind: "success", result: body.result };
  }
  return { kind: "pending" };
}

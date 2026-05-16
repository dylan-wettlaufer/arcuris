import {
  enqueueResumeGenerationJob,
  fetchResumeGenerationJobStatus
} from "@/lib/ai-service-client";
import { createClient } from "@/lib/supabase/server";
import {
  generatedResumeSchema,
  interviewAnswersRecordSchema,
  jobDescriptionRequestSchema,
  parsedResumeSchema,
  type GeneratedResume
} from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

type GenerateSuccessBody = GeneratedResume & {
  status: "SUCCESS";
  applicationId: string;
};

type GenerateStatusBody =
  | { status: "PENDING" }
  | { status: "FAILURE"; error: string }
  | GenerateSuccessBody;

type GenerateEnqueueBody = { taskId: string } | { error: string };

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid generation request.";
  }

  if (error instanceof SyntaxError) {
    return "AI returned invalid JSON. Try generating again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Resume generation failed.";
}

async function resolveApplicationIdAfterInsert(args: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  taskId: string;
  insertPayload: {
    user_id: string;
    company_name: string;
    role_title: string;
    job_description: string;
    resume_markdown: string;
    resume_json: GeneratedResume["resumeJson"];
    bullet_feedback: GeneratedResume["bulletFeedback"];
    draft_score: number;
    refined_score: number;
    source_task_id: string;
  };
}): Promise<string> {
  const { supabase, userId, taskId, insertPayload } = args;
  const { data: inserted, error: insertError } = await supabase
    .from("applications")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError === null && inserted !== null) {
    return inserted.id as string;
  }

  if (insertError !== null && insertError.code === "23505") {
    const { data: existing, error: selectError } = await supabase
      .from("applications")
      .select("id")
      .eq("source_task_id", taskId)
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError !== null || existing === null) {
      throw new Error(
        selectError?.message ??
          "Could not resolve application after duplicate insert."
      );
    }
    return existing.id as string;
  }

  throw new Error(insertError?.message ?? "Failed to save application.");
}

export async function POST(
  request: Request
): Promise<NextResponse<GenerateEnqueueBody>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobDescription: string;

  try {
    const body = (await request.json()) as unknown;
    jobDescription = jobDescriptionRequestSchema.parse(body).jobDescription;
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("parsed_json, interview_answers")
    .eq("user_id", user.id)
    .maybeSingle();

  if (inventoryError !== null) {
    return NextResponse.json(
      { error: inventoryError.message },
      { status: 500 }
    );
  }

  if (inventory === null) {
    return NextResponse.json(
      { error: "Resume inventory was not found." },
      { status: 404 }
    );
  }

  let parsedResume: ReturnType<typeof parsedResumeSchema.parse>;
  let interviewAnswers: Record<string, string>;

  try {
    parsedResume = parsedResumeSchema.parse(inventory.parsed_json);
    interviewAnswers = interviewAnswersRecordSchema.parse(
      inventory.interview_answers
    );
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 400 }
    );
  }

  let taskId: string;

  try {
    taskId = await enqueueResumeGenerationJob({
      parsed_resume: parsedResume,
      interview_answers: interviewAnswers,
      job_description: jobDescription
    });
  } catch (enqueueError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(enqueueError) },
      { status: 502 }
    );
  }

  const { error: jobInsertError } = await supabase.from("generation_jobs").insert({
    user_id: user.id,
    celery_task_id: taskId,
    job_description: jobDescription
  });

  if (jobInsertError !== null) {
    return NextResponse.json(
      { error: jobInsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ taskId });
}

const taskIdQuerySchema = z.string().trim().min(1, "taskId is required.");

export async function GET(
  request: Request
): Promise<NextResponse<GenerateStatusBody | { error: string }>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskIdRaw = new URL(request.url).searchParams.get("taskId");

  let taskId: string;
  try {
    taskId = taskIdQuerySchema.parse(taskIdRaw ?? "");
  } catch {
    return NextResponse.json({ error: "taskId is required." }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("id, application_id, job_description")
    .eq("celery_task_id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError !== null) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  if (job === null) {
    return NextResponse.json({ error: "Generation job was not found." }, {
      status: 404
    });
  }

  let aiStatus: Awaited<ReturnType<typeof fetchResumeGenerationJobStatus>>;
  try {
    aiStatus = await fetchResumeGenerationJobStatus(taskId);
  } catch (statusError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(statusError) },
      { status: 502 }
    );
  }

  if (aiStatus.kind === "pending") {
    return NextResponse.json({ status: "PENDING" });
  }

  if (aiStatus.kind === "failure") {
    return NextResponse.json({
      status: "FAILURE",
      error: aiStatus.error
    });
  }

  let parsedGeneratedResume: GeneratedResume;
  try {
    parsedGeneratedResume = generatedResumeSchema.parse(aiStatus.result);
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 500 }
    );
  }

  let applicationId: string;
  try {
    applicationId = await resolveApplicationIdAfterInsert({
      supabase,
      userId: user.id,
      taskId,
      insertPayload: {
        user_id: user.id,
        company_name: parsedGeneratedResume.companyName,
        role_title: parsedGeneratedResume.roleTitle,
        job_description: job.job_description,
        resume_markdown: parsedGeneratedResume.refinedResumeMarkdown,
        resume_json: parsedGeneratedResume.resumeJson,
        bullet_feedback: parsedGeneratedResume.bulletFeedback,
        draft_score: parsedGeneratedResume.draftScore,
        refined_score: parsedGeneratedResume.refinedScore,
        source_task_id: taskId
      }
    });
  } catch (resolveError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(resolveError) },
      { status: 500 }
    );
  }

  const { error: jobUpdateError } = await supabase
    .from("generation_jobs")
    .update({ application_id: applicationId })
    .eq("id", job.id)
    .eq("user_id", user.id);

  if (jobUpdateError !== null) {
    return NextResponse.json(
      { error: jobUpdateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "SUCCESS",
    applicationId,
    ...parsedGeneratedResume
  });
}

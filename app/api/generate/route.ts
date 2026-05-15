import { generateTailoredResume } from "@/lib/resume-generation";
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

type GenerateResponse =
  | (GeneratedResume & {
      applicationId: string;
    })
  | {
      error: string;
    };

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

export async function POST(
  request: Request
): Promise<NextResponse<GenerateResponse>> {
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

  let generatedResume: GeneratedResume;

  try {
    const parsedResume = parsedResumeSchema.parse(inventory.parsed_json);
    const interviewAnswers = interviewAnswersRecordSchema.parse(
      inventory.interview_answers
    );

    generatedResume = await generateTailoredResume({
      parsedResume,
      interviewAnswers,
      jobDescription
    });
  } catch (generationError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(generationError) },
      { status: 500 }
    );
  }

  const parsedGeneratedResume = generatedResumeSchema.parse(generatedResume);

  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company_name: parsedGeneratedResume.companyName,
      role_title: parsedGeneratedResume.roleTitle,
      job_description: jobDescription,
      resume_markdown: parsedGeneratedResume.refinedResumeMarkdown,
      resume_json: parsedGeneratedResume.resumeJson,
      bullet_feedback: parsedGeneratedResume.bulletFeedback,
      draft_score: parsedGeneratedResume.draftScore,
      refined_score: parsedGeneratedResume.refinedScore
    })
    .select("id")
    .single();

  if (insertError !== null) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...parsedGeneratedResume,
    applicationId: application.id as string
  });
}

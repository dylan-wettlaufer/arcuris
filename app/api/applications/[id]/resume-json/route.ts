import { createClient } from "@/lib/supabase/server";
import { generatedResumeJsonSchema } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

type ResumeJsonRouteContext = {
  params: {
    id: string;
  };
};

type UpdateResumeJsonResponse =
  | {
      resumeJson: ReturnType<typeof generatedResumeJsonSchema.parse>;
    }
  | {
      error: string;
    };

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid resume data.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not save resume.";
}

export async function PATCH(
  request: Request,
  { params }: ResumeJsonRouteContext
): Promise<NextResponse<UpdateResumeJsonResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let resumeJson: ReturnType<typeof generatedResumeJsonSchema.parse>;

  try {
    const body = (await request.json()) as unknown;
    resumeJson = generatedResumeJsonSchema.parse(body);
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  const { data: application, error: updateError } = await supabase
    .from("applications")
    .update({ resume_json: resumeJson })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("resume_json")
    .maybeSingle();

  if (updateError !== null) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (application === null) {
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 }
    );
  }

  try {
    return NextResponse.json({
      resumeJson: generatedResumeJsonSchema.parse(application.resume_json)
    });
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 500 }
    );
  }
}

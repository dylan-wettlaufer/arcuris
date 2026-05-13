import { createClient } from "@/lib/supabase/server";
import {
  interviewAnswersRequestSchema,
  interviewQuestionsSchema,
  type InterviewAnswersRecord
} from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

type InterviewSaveResponse =
  | {
      redirectTo: string;
    }
  | {
      error: string;
    };

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid interview answers.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not save interview answers.";
}

export async function POST(
  request: Request
): Promise<NextResponse<InterviewSaveResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let answersRecord: InterviewAnswersRecord;

  try {
    const body = (await request.json()) as unknown;
    const parsedBody = interviewAnswersRequestSchema.parse(body);
    const { data: inventory } = await supabase
      .from("inventory")
      .select("interview_questions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (inventory === null) {
      return NextResponse.json(
        { error: "Resume inventory was not found." },
        { status: 404 }
      );
    }

    const questions = interviewQuestionsSchema.parse(inventory.interview_questions);
    const questionIds = new Set(questions.map((question) => question.id));
    const answerIds = new Set(
      parsedBody.answers.map((answer) => answer.questionId)
    );

    if (
      answerIds.size !== questionIds.size ||
      questions.some((question) => !answerIds.has(question.id))
    ) {
      return NextResponse.json(
        { error: "Answer every interview question before continuing." },
        { status: 400 }
      );
    }

    answersRecord = Object.fromEntries(
      parsedBody.answers.map((answer) => [answer.questionId, answer.answer])
    );
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("inventory")
    .update({ interview_answers: answersRecord })
    .eq("user_id", user.id);

  if (updateError !== null) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ redirectTo: "/dashboard" });
}

import { InterviewForm } from "@/components/onboarding/interview-form";
import { createClient } from "@/lib/supabase/server";
import {
  interviewAnswersRecordSchema,
  interviewQuestionsSchema
} from "@/lib/types";
import { redirect } from "next/navigation";

export default async function OnboardingInterviewPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login");
  }

  const { data: inventory } = await supabase
    .from("inventory")
    .select("interview_questions, interview_answers")
    .eq("user_id", user.id)
    .maybeSingle();

  if (inventory === null) {
    redirect("/onboarding/upload");
  }

  const parsedQuestions = interviewQuestionsSchema.safeParse(
    inventory.interview_questions
  );

  if (!parsedQuestions.success) {
    redirect("/onboarding/upload");
  }

  const parsedAnswers = interviewAnswersRecordSchema.safeParse(
    inventory.interview_answers
  );
  const initialAnswers = parsedAnswers.success ? parsedAnswers.data : {};

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="mb-3 inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground">
          Onboarding
        </p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground">
          Add missing context.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Answer these follow-up questions so Arcuris can build a richer
          inventory for future tailored resumes.
        </p>
        <InterviewForm
          initialAnswers={initialAnswers}
          questions={parsedQuestions.data}
        />
      </div>
    </main>
  );
}

import { JobDescriptionForm } from "@/components/generate/job-description-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GeneratePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login");
  }

  const { data: inventory } = await supabase
    .from("inventory")
    .select("user_id, interview_answers")
    .eq("user_id", user.id)
    .maybeSingle();

  if (inventory === null) {
    redirect("/onboarding/upload");
  }

  const hasInterviewAnswers =
    inventory.interview_answers !== null &&
    typeof inventory.interview_answers === "object" &&
    !Array.isArray(inventory.interview_answers) &&
    Object.keys(inventory.interview_answers).length > 0;

  if (!hasInterviewAnswers) {
    redirect("/onboarding/interview");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            Resume generation
          </p>
          <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Add the target role.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Paste or upload the job description that should guide the tailored
            resume.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>

      <JobDescriptionForm />
    </main>
  );
}

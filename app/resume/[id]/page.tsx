import { ResumeViewer } from "@/components/resume/resume-viewer";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ResumePageProps = {
  params: {
    id: string;
  };
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export default async function ResumePage({ params }: ResumePageProps) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login");
  }

  const { data: application, error } = await supabase
    .from("applications")
    .select(
      "id, company_name, role_title, job_description, resume_markdown, draft_score, refined_score, status, created_at"
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error !== null) {
    throw new Error(error.message);
  }

  if (application === null) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            Application {formatDate(application.created_at as string)}
          </p>
          <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {application.company_name} - {application.role_title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {application.status} - Refined from{" "}
            {application.draft_score as number}/10 to{" "}
            {application.refined_score as number}/10.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            href="/generate"
          >
            New resume
          </Link>
        </div>
      </div>

      <ResumeViewer
        companyName={application.company_name as string}
        roleTitle={application.role_title as string}
        resumeMarkdown={application.resume_markdown as string}
      />

      <section className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">Job description</h2>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-sans text-sm leading-6 text-foreground">
          {application.job_description as string}
        </pre>
      </section>
    </main>
  );
}

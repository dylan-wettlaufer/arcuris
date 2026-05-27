import { signOut } from "@/app/actions/auth";
import { ApplicationsTable } from "@/components/dashboard/applications-table";
import { createClient } from "@/lib/supabase/server";
import { applicationStatusSchema } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login");
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("id, company_name, role_title, status, created_at, refined_score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (applicationsError !== null) {
    throw new Error(applicationsError.message);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <div className="grid gap-6 rounded-2xl border border-border bg-card p-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Application tracker and generated resumes.
          </p>
          {user.email !== undefined ? (
            <p className="mt-4 text-sm text-foreground">
              Signed in as{" "}
              <span className="font-mono text-muted-foreground">
                {user.email}
              </span>
            </p>
          ) : null}
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-foreground transition hover:bg-muted"
            href="/"
          >
            Home
          </Link>
          <Link
            className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground transition hover:opacity-90"
            href="/generate"
          >
            Generate resume
          </Link>
          <Link
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-foreground transition hover:bg-muted"
            href="/archive"
          >
            Archive
          </Link>
          <Link
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-foreground transition hover:bg-muted"
            href="/onboarding/upload"
          >
            Upload new resume
          </Link>
        </nav>

        <section className="grid gap-3 border-t border-border pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                Applications
              </h2>
              <p className="text-sm text-muted-foreground">
                Open any saved resume by its application record.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {applications?.length ?? 0} total
            </p>
          </div>

          {applications !== null && applications.length > 0 ? (
            <ApplicationsTable
              applications={applications.map((application) => ({
                id: application.id as string,
                companyName: application.company_name as string,
                roleTitle: application.role_title as string,
                status: applicationStatusSchema.parse(application.status),
                createdAt: application.created_at as string,
                refinedScore: application.refined_score as number
              }))}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary p-6">
              <p className="text-sm font-medium text-foreground">
                No applications yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate a resume from a job description and it will appear here.
              </p>
            </div>
          )}
        </section>

        <form action={signOut}>
          <button
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            type="submit"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}

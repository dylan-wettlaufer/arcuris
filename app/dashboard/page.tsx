import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

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
            href="/onboarding/upload"
          >
            Upload resume
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
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="hidden grid-cols-[1.3fr_1fr_120px_100px] gap-4 border-b border-border bg-secondary px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
                <span>Role</span>
                <span>Company</span>
                <span>Status</span>
                <span>Score</span>
              </div>
              <div className="divide-y divide-border">
                {applications.map((application) => (
                  <Link
                    className="grid gap-2 px-4 py-4 transition hover:bg-secondary md:grid-cols-[1.3fr_1fr_120px_100px] md:items-center md:gap-4"
                    href={`/resume/${application.id as string}`}
                    key={application.id as string}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {application.role_title as string}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(application.created_at as string)}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">
                      {application.company_name as string}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {application.status as string}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {application.refined_score as number}/10
                    </p>
                  </Link>
                ))}
              </div>
            </div>
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

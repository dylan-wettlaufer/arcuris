import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Application tracker and onboarding will live here.
          </p>
          {user?.email !== undefined ? (
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
            href="/onboarding/upload"
          >
            Upload resume
          </Link>
          <span className="text-muted-foreground">
            Onboarding and generate routes will wire in next.
          </span>
        </nav>
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

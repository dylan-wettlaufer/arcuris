import Link from "next/link";

export default function OnboardingInterviewPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="mb-3 inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground">
          Onboarding
        </p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground">
          Resume parsed.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The interview step will ask targeted follow-up questions based on
          your resume. This placeholder confirms the parsing flow can redirect
          here successfully.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

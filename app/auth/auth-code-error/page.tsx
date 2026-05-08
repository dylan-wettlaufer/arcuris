import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-medium text-foreground">
          Could not complete sign in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The confirmation link may be invalid or expired. Request a new link
          from the sign up page or log in with your password.
        </p>
        <Link
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          href="/login"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}

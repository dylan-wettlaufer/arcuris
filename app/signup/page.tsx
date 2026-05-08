import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <h1 className="text-center text-2xl font-medium tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign up with email and password. Sessions persist across visits.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/login"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

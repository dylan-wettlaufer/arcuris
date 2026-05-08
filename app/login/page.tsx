import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <h1 className="text-center text-2xl font-medium tracking-tight text-foreground">
          Log in to Arcuris
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Use the email and password for your account.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/signup"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

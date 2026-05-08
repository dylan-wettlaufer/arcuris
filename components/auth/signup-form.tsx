"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          origin.length > 0
            ? `${origin}/auth/callback?next=/dashboard`
            : undefined
      }
    });
    setPending(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    if (data.session !== null) {
      router.refresh();
      router.push("/dashboard");
      return;
    }
    setInfo(
      "Check your email for a confirmation link, then log in."
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error !== null ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground"
          >
            {error}
          </p>
        ) : null}
        {info !== null ? (
          <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {info}{" "}
            <Link className="font-medium text-primary underline" href="/login">
              Go to login
            </Link>
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Email</span>
          <input
            autoComplete="email"
            className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            id="signup-email"
            name="email"
            onChange={(ev) => {
              setEmail(ev.target.value);
            }}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Password</span>
          <input
            autoComplete="new-password"
            className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            id="signup-password"
            name="password"
            minLength={6}
            onChange={(ev) => {
              setPassword(ev.target.value);
            }}
            required
            type="password"
            value={password}
          />
        </label>
        <button
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

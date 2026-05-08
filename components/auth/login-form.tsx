"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setPending(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      {error !== null ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground"
        >
          {error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Email</span>
        <input
          autoComplete="email"
          className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          id="login-email"
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
          autoComplete="current-password"
          className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          id="login-password"
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
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}

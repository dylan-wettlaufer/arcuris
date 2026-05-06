import { ArrowRight, Archive, FileText, ListChecks } from "lucide-react";

const steps = [
  {
    title: "Archive your experience",
    description:
      "Upload your baseline resume once so Arcuris can build a durable inventory of your work."
  },
  {
    title: "Curate for each role",
    description:
      "Paste a job description and generate a resume tuned to the company, role, and required skills."
  },
  {
    title: "Track automatically",
    description:
      "Every generated resume becomes an application record without another form to fill out."
  }
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-primary">
              <Archive className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium tracking-tight">Arcuris</span>
          </div>
          <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            MVP foundation
          </span>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
              Resume generation and application tracking for new grads
            </p>
            <h1 className="max-w-3xl text-4xl font-medium tracking-tight text-foreground sm:text-6xl">
              Tailor every resume without losing track of every application.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Arcuris turns a pasted job description into an AI-refined resume,
              then logs the application automatically so your tracker stays
              current.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Open dashboard
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/generate"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Generate resume
              </a>
            </div>
          </div>

          <div className="rounded-2xl  p-5">
            <div className="rounded-xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Application flow
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Foundation scaffold ready for MVP routes
                  </p>
                </div>
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <h2 className="text-sm font-medium text-foreground">
                          {step.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
                <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                Next up: Supabase schema, auth, and AI route handlers.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

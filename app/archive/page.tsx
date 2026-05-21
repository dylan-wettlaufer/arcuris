import { ArchiveViewer } from "@/components/archive/archive-viewer";
import { mapArchiveNoteRows } from "@/lib/archive";
import { createClient } from "@/lib/supabase/server";
import { parsedResumeSchema } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ArchivePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login");
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("parsed_json")
    .eq("user_id", user.id)
    .maybeSingle();

  if (inventoryError !== null) {
    throw new Error(inventoryError.message);
  }

  if (inventory === null) {
    redirect("/onboarding/upload");
  }

  const { data: noteRows, error: notesError } = await supabase
    .from("archive_notes")
    .select("id, item_type, item_index, content, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (notesError !== null) {
    throw new Error(notesError.message);
  }

  const parsedResume = parsedResumeSchema.parse(inventory.parsed_json);
  const notes = mapArchiveNoteRows(noteRows ?? []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            Archive
          </p>
          <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Your source material.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review the resume facts Arcuris has saved and add context to the
            experiences or projects that need more detail.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            href="/generate"
          >
            Generate resume
          </Link>
        </div>
      </div>

      <ArchiveViewer initialNotes={notes} parsedResume={parsedResume} />
    </main>
  );
}

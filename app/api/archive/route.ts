import { mapArchiveNoteRows } from "@/lib/archive";
import { createClient } from "@/lib/supabase/server";
import { parsedResumeSchema } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

type ArchiveResponse =
  | {
      parsedResume: ReturnType<typeof parsedResumeSchema.parse>;
      notes: ReturnType<typeof mapArchiveNoteRows>;
    }
  | {
      error: string;
    };

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid archive data.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not load archive.";
}

export async function GET(): Promise<NextResponse<ArchiveResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("parsed_json")
    .eq("user_id", user.id)
    .maybeSingle();

  if (inventoryError !== null) {
    return NextResponse.json(
      { error: inventoryError.message },
      { status: 500 }
    );
  }

  if (inventory === null) {
    return NextResponse.json(
      { error: "Resume inventory was not found." },
      { status: 404 }
    );
  }

  const { data: noteRows, error: notesError } = await supabase
    .from("archive_notes")
    .select("id, item_type, item_index, content, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (notesError !== null) {
    return NextResponse.json({ error: notesError.message }, { status: 500 });
  }

  try {
    return NextResponse.json({
      parsedResume: parsedResumeSchema.parse(inventory.parsed_json),
      notes: mapArchiveNoteRows(noteRows ?? [])
    });
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 400 }
    );
  }
}

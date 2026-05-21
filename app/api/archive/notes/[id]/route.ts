import { mapArchiveNoteRow } from "@/lib/archive";
import { createClient } from "@/lib/supabase/server";
import { archiveNoteUpdateSchema } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

type NoteRouteProps = {
  params: {
    id: string;
  };
};

type MutateNoteResponse =
  | {
      note: ReturnType<typeof mapArchiveNoteRow>;
    }
  | {
      ok: true;
    }
  | {
      error: string;
    };

const noteIdSchema = z.string().uuid();

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid archive note.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update archive note.";
}

export async function PATCH(
  request: Request,
  { params }: NoteRouteProps
): Promise<NextResponse<MutateNoteResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let noteId: string;
  let parsedBody: ReturnType<typeof archiveNoteUpdateSchema.parse>;

  try {
    noteId = noteIdSchema.parse(params.id);
    parsedBody = archiveNoteUpdateSchema.parse(await request.json());
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  const { data: noteRow, error: updateError } = await supabase
    .from("archive_notes")
    .update({ content: parsedBody.content })
    .eq("id", noteId)
    .eq("user_id", user.id)
    .select("id, item_type, item_index, content, created_at, updated_at")
    .maybeSingle();

  if (updateError !== null) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (noteRow === null) {
    return NextResponse.json(
      { error: "Archive note was not found." },
      { status: 404 }
    );
  }

  try {
    return NextResponse.json({ note: mapArchiveNoteRow(noteRow) });
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: NoteRouteProps
): Promise<NextResponse<MutateNoteResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let noteId: string;

  try {
    noteId = noteIdSchema.parse(params.id);
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase
    .from("archive_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (deleteError !== null) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

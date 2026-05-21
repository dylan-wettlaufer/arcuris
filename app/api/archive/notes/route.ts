import {
  assertArchiveItemExists,
  mapArchiveNoteRow
} from "@/lib/archive";
import { createClient } from "@/lib/supabase/server";
import {
  archiveNoteRequestSchema,
  parsedResumeSchema
} from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

type CreateNoteResponse =
  | {
      note: ReturnType<typeof mapArchiveNoteRow>;
    }
  | {
      error: string;
    };

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid archive note.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not save archive note.";
}

export async function POST(
  request: Request
): Promise<NextResponse<CreateNoteResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody: ReturnType<typeof archiveNoteRequestSchema.parse>;

  try {
    parsedBody = archiveNoteRequestSchema.parse(await request.json());
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
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

  try {
    const parsedResume = parsedResumeSchema.parse(inventory.parsed_json);
    assertArchiveItemExists({
      parsedResume,
      itemType: parsedBody.itemType,
      itemIndex: parsedBody.itemIndex
    });
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 400 }
    );
  }

  const { data: noteRow, error: insertError } = await supabase
    .from("archive_notes")
    .insert({
      user_id: user.id,
      item_type: parsedBody.itemType,
      item_index: parsedBody.itemIndex,
      content: parsedBody.content
    })
    .select("id, item_type, item_index, content, created_at, updated_at")
    .single();

  if (insertError !== null || noteRow === null) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not save archive note." },
      { status: 500 }
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

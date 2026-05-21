import {
  archiveItemTypeSchema,
  archiveNoteSchema,
  type ArchiveItemType,
  type ArchiveNote,
  type ParsedResume
} from "@/lib/types";

type ArchiveNoteRow = {
  id: unknown;
  item_type: unknown;
  item_index: unknown;
  content: unknown;
  created_at: unknown;
  updated_at: unknown;
};

export function mapArchiveNoteRow(row: ArchiveNoteRow): ArchiveNote {
  return archiveNoteSchema.parse({
    id: row.id,
    itemType: row.item_type,
    itemIndex: row.item_index,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export function mapArchiveNoteRows(rows: ArchiveNoteRow[]): ArchiveNote[] {
  return rows.map((row) => mapArchiveNoteRow(row));
}

export function getArchiveItemCount(
  parsedResume: ParsedResume,
  itemType: ArchiveItemType
): number {
  return itemType === "experience"
    ? parsedResume.experience.length
    : parsedResume.projects.length;
}

export function assertArchiveItemExists(args: {
  parsedResume: ParsedResume;
  itemType: unknown;
  itemIndex: number;
}): ArchiveItemType {
  const itemType = archiveItemTypeSchema.parse(args.itemType);
  const itemCount = getArchiveItemCount(args.parsedResume, itemType);

  if (args.itemIndex >= itemCount) {
    throw new Error(
      itemType === "experience"
        ? "Experience entry was not found."
        : "Project entry was not found."
    );
  }

  return itemType;
}

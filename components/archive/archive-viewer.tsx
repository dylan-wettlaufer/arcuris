"use client";

import {
  type ArchiveItemType,
  type ArchiveNote,
  type ParsedResume
} from "@/lib/types";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

type ArchiveViewerProps = {
  parsedResume: ParsedResume;
  initialNotes: ArchiveNote[];
};

type SaveResponse = {
  note?: ArchiveNote;
  error?: string;
};

type DeleteResponse = {
  ok?: true;
  error?: string;
};

function itemKey(itemType: ArchiveItemType, itemIndex: number): string {
  return `${itemType}:${itemIndex}`;
}

function compactDateRange(startDate: string | null, endDate: string | null): string | null {
  if (startDate === null && endDate === null) {
    return null;
  }

  return [startDate, endDate].filter(Boolean).join(" - ");
}

function noteDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function FieldList({
  items,
  emptyLabel
}: {
  items: string[];
  emptyLabel: string;
}) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);

  if (cleanItems.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="grid gap-2 text-sm leading-6 text-foreground">
      {cleanItems.map((item, index) => (
        <li className="pl-4 -indent-3" key={`${item}-${index}`}>
          - {item}
        </li>
      ))}
    </ul>
  );
}

function ArchiveItemCard({
  itemType,
  itemIndex,
  title,
  meta,
  bullets,
  notes,
  pendingKey,
  draft,
  editDrafts,
  editingId,
  error,
  onDraftChange,
  onEditDraftChange,
  onCreate,
  onUpdate,
  onDelete,
  onStartEdit,
  onCancelEdit
}: {
  itemType: ArchiveItemType;
  itemIndex: number;
  title: string;
  meta: string | null;
  bullets: string[];
  notes: ArchiveNote[];
  pendingKey: string | null;
  draft: string;
  editDrafts: Record<string, string>;
  editingId: string | null;
  error: string | null;
  onDraftChange: (key: string, value: string) => void;
  onEditDraftChange: (noteId: string, value: string) => void;
  onCreate: (args: {
    itemType: ArchiveItemType;
    itemIndex: number;
    content: string;
  }) => void;
  onUpdate: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
  onStartEdit: (note: ArchiveNote) => void;
  onCancelEdit: () => void;
}) {
  const key = itemKey(itemType, itemIndex);
  const createPending = pendingKey === `create:${key}`;
  const canCreate = draft.trim().length > 0 && !createPending;

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({ itemType, itemIndex, content: draft });
  }

  return (
    <article className="grid gap-5 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">{title}</h3>
          {meta !== null ? (
            <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          ) : null}
        </div>
        <span className="inline-flex w-fit rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium uppercase text-muted-foreground">
          {itemType}
        </span>
      </div>

      <FieldList items={bullets} emptyLabel="No bullets saved for this entry." />

      <div className="grid gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium text-foreground">Added context</h4>
          <span className="text-xs text-muted-foreground">{notes.length} saved</span>
        </div>

        {error !== null ? (
          <div
            className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {notes.length > 0 ? (
          <div className="grid gap-3">
            {notes.map((note) => {
              const updatePending = pendingKey === `update:${note.id}`;
              const deletePending = pendingKey === `delete:${note.id}`;
              const isEditing = editingId === note.id;
              const editDraft = editDrafts[note.id] ?? note.content;

              return (
                <div
                  className="grid gap-3 rounded-lg border border-border bg-secondary p-4"
                  key={note.id}
                >
                  {isEditing ? (
                    <textarea
                      className="min-h-28 w-full rounded-lg border border-input bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={updatePending}
                      onChange={(event) => {
                        onEditDraftChange(note.id, event.target.value);
                      }}
                      value={editDraft}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {note.content}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Updated {noteDate(note.updatedAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updatePending || editDraft.trim().length === 0}
                            onClick={() => {
                              onUpdate(note.id, editDraft);
                            }}
                            type="button"
                          >
                            {updatePending ? (
                              <Loader2
                                className="mr-2 h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            Save
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                            disabled={updatePending}
                            onClick={onCancelEdit}
                            type="button"
                          >
                            <X className="mr-2 h-4 w-4" aria-hidden="true" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                            disabled={deletePending}
                            onClick={() => {
                              onStartEdit(note);
                            }}
                            type="button"
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={deletePending}
                            onClick={() => {
                              onDelete(note.id);
                            }}
                            type="button"
                          >
                            {deletePending ? (
                              <Loader2
                                className="mr-2 h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-secondary p-4">
            <p className="text-sm text-muted-foreground">
              No extra context saved for this entry.
            </p>
          </div>
        )}

        <form className="grid gap-3" onSubmit={handleCreate}>
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createPending}
            onChange={(event) => {
              onDraftChange(key, event.target.value);
            }}
            placeholder="Add metrics, scope, tools, outcomes, constraints, or facts not captured in the resume..."
            value={draft}
          />
          <div className="flex justify-end">
            <button
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canCreate}
              type="submit"
            >
              {createPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Add info
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

export function ArchiveViewer({
  parsedResume,
  initialNotes
}: ArchiveViewerProps) {
  const [notes, setNotes] = useState<ArchiveNote[]>(initialNotes);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const notesByItem = useMemo(() => {
    const grouped = new Map<string, ArchiveNote[]>();
    for (const note of notes) {
      const key = itemKey(note.itemType, note.itemIndex);
      grouped.set(key, [...(grouped.get(key) ?? []), note]);
    }
    return grouped;
  }, [notes]);

  function clearError(key: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function createNote(args: {
    itemType: ArchiveItemType;
    itemIndex: number;
    content: string;
  }) {
    const key = itemKey(args.itemType, args.itemIndex);
    const content = args.content.trim();
    if (content.length === 0) return;

    setPendingKey(`create:${key}`);
    clearError(key);

    try {
      const response = await fetch("/api/archive/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: args.itemType,
          itemIndex: args.itemIndex,
          content
        })
      });
      const body = (await response.json().catch(() => null)) as SaveResponse | null;

      if (!response.ok || body?.note === undefined) {
        throw new Error(body?.error ?? "Could not save archive note.");
      }

      setNotes((current) => [body.note as ArchiveNote, ...current]);
      setDrafts((current) => ({ ...current, [key]: "" }));
    } catch (error: unknown) {
      setErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Could not save archive note."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function updateNote(noteId: string, contentRaw: string) {
    const content = contentRaw.trim();
    if (content.length === 0) return;

    const note = notes.find((candidate) => candidate.id === noteId);
    const key = note === undefined ? noteId : itemKey(note.itemType, note.itemIndex);
    setPendingKey(`update:${noteId}`);
    clearError(key);

    try {
      const response = await fetch(`/api/archive/notes/${encodeURIComponent(noteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const body = (await response.json().catch(() => null)) as SaveResponse | null;

      if (!response.ok || body?.note === undefined) {
        throw new Error(body?.error ?? "Could not update archive note.");
      }

      setNotes((current) =>
        current.map((candidate) =>
          candidate.id === noteId ? (body.note as ArchiveNote) : candidate
        )
      );
      setEditingId(null);
    } catch (error: unknown) {
      setErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Could not update archive note."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function deleteNote(noteId: string) {
    const note = notes.find((candidate) => candidate.id === noteId);
    const key = note === undefined ? noteId : itemKey(note.itemType, note.itemIndex);
    setPendingKey(`delete:${noteId}`);
    clearError(key);

    try {
      const response = await fetch(`/api/archive/notes/${encodeURIComponent(noteId)}`, {
        method: "DELETE"
      });
      const body = (await response.json().catch(() => null)) as DeleteResponse | null;

      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error ?? "Could not delete archive note.");
      }

      setNotes((current) => current.filter((candidate) => candidate.id !== noteId));
      if (editingId === noteId) {
        setEditingId(null);
      }
    } catch (error: unknown) {
      setErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Could not delete archive note."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  const contact = [
    parsedResume.email,
    parsedResume.phone,
    parsedResume.linkedin,
    parsedResume.github
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="grid gap-8">
      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="text-xl font-medium text-foreground">
            {parsedResume.name ?? "Candidate profile"}
          </h2>
          {contact.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{contact}</p>
          ) : null}
        </div>
        {parsedResume.summary !== null && parsedResume.summary.trim().length > 0 ? (
          <p className="text-sm leading-6 text-foreground">{parsedResume.summary}</p>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <section className="grid gap-3">
            <h3 className="text-sm font-medium uppercase text-muted-foreground">
              Education
            </h3>
            <div className="grid gap-3">
              {parsedResume.education.map((education, index) => {
                const title =
                  education.institution ?? education.degree ?? `Education ${index + 1}`;
                const meta = [
                  education.degree,
                  education.fieldOfStudy,
                  compactDateRange(education.startDate, education.endDate)
                ]
                  .filter(Boolean)
                  .join(" | ");

                return (
                  <div className="rounded-lg border border-border bg-secondary p-4" key={index}>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    {meta.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                    ) : null}
                    <div className="mt-3">
                      <FieldList
                        items={education.details}
                        emptyLabel="No education details saved."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium uppercase text-muted-foreground">
              Skills
            </h3>
            <div className="grid gap-3">
              {parsedResume.skillGroups.map((group) => (
                <div className="rounded-lg border border-border bg-secondary p-4" key={group.category}>
                  <p className="text-sm font-medium text-foreground">{group.category}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {group.items.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-medium text-foreground">Experience</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {parsedResume.experience.length} entries
          </p>
        </div>
        <div className="grid gap-4">
          {parsedResume.experience.map((experience, index) => {
            const title = [experience.role, experience.company]
              .filter(Boolean)
              .join(" at ");
            const meta = [
              experience.location,
              compactDateRange(experience.startDate, experience.endDate)
            ]
              .filter(Boolean)
              .join(" | ");
            const key = itemKey("experience", index);

            return (
              <ArchiveItemCard
                draft={drafts[key] ?? ""}
                editDrafts={editDrafts}
                editingId={editingId}
                error={errors[key] ?? null}
                itemIndex={index}
                itemType="experience"
                key={key}
                meta={meta.length > 0 ? meta : null}
                notes={notesByItem.get(key) ?? []}
                pendingKey={pendingKey}
                title={title.length > 0 ? title : `Experience ${index + 1}`}
                bullets={experience.bullets}
                onCancelEdit={() => {
                  setEditingId(null);
                }}
                onCreate={createNote}
                onDelete={deleteNote}
                onDraftChange={(draftKey, value) => {
                  setDrafts((current) => ({ ...current, [draftKey]: value }));
                }}
                onEditDraftChange={(noteId, value) => {
                  setEditDrafts((current) => ({ ...current, [noteId]: value }));
                }}
                onStartEdit={(note) => {
                  setEditingId(note.id);
                  setEditDrafts((current) => ({
                    ...current,
                    [note.id]: note.content
                  }));
                }}
                onUpdate={updateNote}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-medium text-foreground">Projects</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {parsedResume.projects.length} entries
          </p>
        </div>
        <div className="grid gap-4">
          {parsedResume.projects.map((project, index) => {
            const key = itemKey("project", index);
            const metaParts = [
              project.techStack.length > 0 ? project.techStack.join(", ") : null,
              project.description
            ].filter(Boolean);

            return (
              <ArchiveItemCard
                draft={drafts[key] ?? ""}
                editDrafts={editDrafts}
                editingId={editingId}
                error={errors[key] ?? null}
                itemIndex={index}
                itemType="project"
                key={key}
                meta={metaParts.length > 0 ? metaParts.join(" | ") : null}
                notes={notesByItem.get(key) ?? []}
                pendingKey={pendingKey}
                title={project.name ?? `Project ${index + 1}`}
                bullets={project.bullets}
                onCancelEdit={() => {
                  setEditingId(null);
                }}
                onCreate={createNote}
                onDelete={deleteNote}
                onDraftChange={(draftKey, value) => {
                  setDrafts((current) => ({ ...current, [draftKey]: value }));
                }}
                onEditDraftChange={(noteId, value) => {
                  setEditDrafts((current) => ({ ...current, [noteId]: value }));
                }}
                onStartEdit={(note) => {
                  setEditingId(note.id);
                  setEditDrafts((current) => ({
                    ...current,
                    [note.id]: note.content
                  }));
                }}
                onUpdate={updateNote}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

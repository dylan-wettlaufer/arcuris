"use client";

import {
  defaultResumeSectionOrder,
  type GeneratedResumeJson,
  type ResumeSection
} from "@/lib/types";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

type ResumeJsonEditorProps = {
  resume: GeneratedResumeJson;
  onChange: (resume: GeneratedResumeJson) => void;
};

type TextInputProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
};

function cleanNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
}

function TextInput({
  label,
  value,
  onChange,
  required = false
}: TextInputProps) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </span>
      <input
        className="h-10 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => {
          onChange(required ? event.target.value : cleanNullable(event.target.value));
        }}
        value={value ?? ""}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </span>
      <textarea
        className="min-h-24 rounded-lg border border-input bg-secondary px-3 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={value}
      />
    </label>
  );
}

function ArrayEditor({
  label,
  values,
  addLabel,
  minItems = 0,
  onChange
}: {
  label: string;
  values: string[];
  addLabel: string;
  minItems?: number;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </p>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
          onClick={() => {
            onChange([...values, ""]);
          }}
          type="button"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
      <div className="grid gap-2">
        {values.map((value, index) => (
          <div className="flex gap-2" key={index}>
            <textarea
              className="min-h-16 flex-1 rounded-lg border border-input bg-secondary px-3 py-2 text-sm leading-6 text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => {
                onChange(
                  values.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item
                  )
                );
              }}
              value={value}
            />
            <button
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={values.length <= minItems}
              onClick={() => {
                onChange(values.filter((_, itemIndex) => itemIndex !== index));
              }}
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorPanel({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function ResumeJsonEditor({ resume, onChange }: ResumeJsonEditorProps) {
  const sectionOrder = resume.sectionOrder ?? [...defaultResumeSectionOrder];

  function update(next: Partial<GeneratedResumeJson>) {
    onChange({ ...resume, ...next });
  }

  function moveSection(section: ResumeSection, direction: -1 | 1) {
    const fromIndex = sectionOrder.indexOf(section);
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= sectionOrder.length) {
      return;
    }

    const next = [...sectionOrder];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    update({ sectionOrder: next });
  }

  return (
    <div className="grid max-h-[760px] gap-5 overflow-auto pr-1">
      <EditorPanel title="Section order">
        <div className="grid gap-2">
          {sectionOrder.map((section, index) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-2"
              key={section}
            >
              <span className="text-sm font-medium capitalize text-foreground">
                {section}
              </span>
              <div className="flex gap-2">
                <button
                  aria-label={`Move ${section} up`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={index === 0}
                  onClick={() => {
                    moveSection(section, -1);
                  }}
                  type="button"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  aria-label={`Move ${section} down`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={index === sectionOrder.length - 1}
                  onClick={() => {
                    moveSection(section, 1);
                  }}
                  type="button"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </EditorPanel>

      <EditorPanel title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Name"
            required
            value={resume.contact.name}
            onChange={(value) => {
              onChange({
                ...resume,
                contact: { ...resume.contact, name: value ?? "" }
              });
            }}
          />
          <TextInput
            label="Email"
            value={resume.contact.email}
            onChange={(value) => {
              onChange({ ...resume, contact: { ...resume.contact, email: value } });
            }}
          />
          <TextInput
            label="Phone"
            value={resume.contact.phone}
            onChange={(value) => {
              onChange({ ...resume, contact: { ...resume.contact, phone: value } });
            }}
          />
          <TextInput
            label="Location"
            value={resume.contact.location}
            onChange={(value) => {
              onChange({
                ...resume,
                contact: { ...resume.contact, location: value }
              });
            }}
          />
          <TextInput
            label="LinkedIn"
            value={resume.contact.linkedin}
            onChange={(value) => {
              onChange({
                ...resume,
                contact: { ...resume.contact, linkedin: value }
              });
            }}
          />
          <TextInput
            label="GitHub"
            value={resume.contact.github}
            onChange={(value) => {
              onChange({ ...resume, contact: { ...resume.contact, github: value } });
            }}
          />
        </div>
      </EditorPanel>

      <EditorPanel title="Summary">
        <TextArea
          label="Summary"
          value={resume.summary}
          onChange={(summary) => {
            update({ summary });
          }}
        />
      </EditorPanel>

      <EditorPanel title="Education">
        <div className="grid gap-5">
          {resume.education.map((item, index) => (
            <div className="grid gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0" key={index}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Institution"
                  required
                  value={item.institution}
                  onChange={(value) => {
                    update({
                      education: resume.education.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, institution: value ?? "" }
                          : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Degree"
                  value={item.degree}
                  onChange={(value) => {
                    update({
                      education: resume.education.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, degree: value } : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Location"
                  value={item.location}
                  onChange={(value) => {
                    update({
                      education: resume.education.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, location: value } : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Dates"
                  value={item.dates}
                  onChange={(value) => {
                    update({
                      education: resume.education.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, dates: value } : entry
                      )
                    });
                  }}
                />
              </div>
              <ArrayEditor
                addLabel="Add detail"
                label="Details"
                values={item.details}
                onChange={(details) => {
                  update({
                    education: resume.education.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, details } : entry
                    )
                  });
                }}
              />
            </div>
          ))}
        </div>
      </EditorPanel>

      <EditorPanel title="Experience">
        <div className="grid gap-5">
          {resume.experience.map((item, index) => (
            <div className="grid gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0" key={index}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Company"
                  required
                  value={item.company}
                  onChange={(value) => {
                    update({
                      experience: resume.experience.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, company: value ?? "" } : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Role"
                  required
                  value={item.role}
                  onChange={(value) => {
                    update({
                      experience: resume.experience.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, role: value ?? "" } : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Location"
                  value={item.location}
                  onChange={(value) => {
                    update({
                      experience: resume.experience.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, location: value } : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Dates"
                  value={item.dates}
                  onChange={(value) => {
                    update({
                      experience: resume.experience.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, dates: value } : entry
                      )
                    });
                  }}
                />
              </div>
              <ArrayEditor
                addLabel="Add bullet"
                label="Bullets"
                minItems={1}
                values={item.bullets}
                onChange={(bullets) => {
                  update({
                    experience: resume.experience.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, bullets } : entry
                    )
                  });
                }}
              />
            </div>
          ))}
        </div>
      </EditorPanel>

      <EditorPanel title="Projects">
        <div className="grid gap-5">
          {resume.projects.map((item, index) => (
            <div className="grid gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0" key={index}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Name"
                  required
                  value={item.name}
                  onChange={(value) => {
                    update({
                      projects: resume.projects.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, name: value ?? "" } : entry
                      )
                    });
                  }}
                />
                <TextInput
                  label="Dates"
                  value={item.dates}
                  onChange={(value) => {
                    update({
                      projects: resume.projects.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, dates: value } : entry
                      )
                    });
                  }}
                />
              </div>
              <ArrayEditor
                addLabel="Add tech"
                label="Tech stack"
                values={item.techStack}
                onChange={(techStack) => {
                  update({
                    projects: resume.projects.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, techStack } : entry
                    )
                  });
                }}
              />
              <ArrayEditor
                addLabel="Add bullet"
                label="Bullets"
                minItems={1}
                values={item.bullets}
                onChange={(bullets) => {
                  update({
                    projects: resume.projects.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, bullets } : entry
                    )
                  });
                }}
              />
            </div>
          ))}
        </div>
      </EditorPanel>

      <EditorPanel title="Skills">
        <div className="grid gap-5">
          {resume.skills.map((group, index) => (
            <div className="grid gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0" key={index}>
              <TextInput
                label="Category"
                required
                value={group.category}
                onChange={(value) => {
                  update({
                    skills: resume.skills.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, category: value ?? "" }
                        : entry
                    )
                  });
                }}
              />
              <ArrayEditor
                addLabel="Add skill"
                label="Items"
                minItems={1}
                values={group.items}
                onChange={(items) => {
                  update({
                    skills: resume.skills.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, items } : entry
                    )
                  });
                }}
              />
            </div>
          ))}
        </div>
      </EditorPanel>
    </div>
  );
}

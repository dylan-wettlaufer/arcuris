import { resumePreviewFontClass } from "@/components/resume/resume-preview-font";
import { type GeneratedResumeJson } from "@/lib/types";

function joinPresent(
  values: Array<string | null | undefined>,
  separator: string
): string {
  return values.filter((value): value is string => Boolean(value)).join(separator);
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="mt-5 border-b-[0.5px] border-neutral-800 pb-1 text-[11pt] font-medium uppercase leading-none tracking-[0.06em] text-neutral-950 first:mt-0">
      {title}
    </h3>
  );
}

function EntryRows({
  primaryLeft,
  primaryRight,
  secondaryLeft,
  secondaryRight
}: {
  primaryLeft: string;
  primaryRight: string;
  secondaryLeft: string;
  secondaryRight: string;
}) {
  const showSecondary = secondaryLeft.length > 0 || secondaryRight.length > 0;
  return (
    <div className="mt-2 text-[10pt] leading-[1.4] text-neutral-950 first:mt-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <span className="min-w-0 font-medium">{primaryLeft}</span>
        {primaryRight.length > 0 ? (
          <span className="shrink-0 tabular-nums text-neutral-900">
            {primaryRight}
          </span>
        ) : null}
      </div>
      {showSecondary ? (
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[9pt] italic leading-[1.35] text-neutral-800">
          <span className="min-w-0">{secondaryLeft}</span>
          {secondaryRight.length > 0 ? (
            <span className="shrink-0 tabular-nums">{secondaryRight}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-1.5 list-disc space-y-1 pl-[0.22in] text-[10pt] leading-[1.42] text-neutral-950 marker:text-neutral-900">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

type JakeResumeStructuredPreviewProps = {
  resume: GeneratedResumeJson;
};

/**
 * HTML approximation of `buildJakeResumeTex` — same data shape, no LaTeX.
 */
export function JakeResumeStructuredPreview({
  resume
}: JakeResumeStructuredPreviewProps) {
  const contactLine = joinPresent(
    [
      resume.contact.phone,
      resume.contact.email,
      resume.contact.linkedin,
      resume.contact.github,
      resume.contact.location
    ],
    " | "
  );

  return (
    <div
      className={`aspect-[8.5/11] min-h-0 w-full overflow-auto bg-white p-[0.55in] text-neutral-950 shadow-xl ${resumePreviewFontClass}`}
    >
      <div className="text-center">
        <p className="text-[21pt] font-medium leading-[1.15] tracking-tight text-neutral-950">
          {resume.contact.name}
        </p>
        {contactLine.length > 0 ? (
          <p className="mt-1 text-[9.5pt] leading-normal text-neutral-800">
            {contactLine}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-0">
        <section>
          <SectionHeading title="Summary" />
          <p className="mt-2 text-justify text-[10pt] leading-[1.45] text-neutral-950">
            {resume.summary}
          </p>
        </section>

        <section>
          <SectionHeading title="Education" />
          {resume.education.map((item, index) => {
            const degreeLine = joinPresent(
              [item.degree, item.location],
              " | "
            );
            return (
              <div key={`edu-${index}-${item.institution}`}>
                <EntryRows
                  primaryLeft={item.institution}
                  primaryRight={item.dates ?? ""}
                  secondaryLeft={degreeLine}
                  secondaryRight=""
                />
                <BulletList items={item.details} />
              </div>
            );
          })}
        </section>

        <section>
          <SectionHeading title="Experience" />
          {resume.experience.map((item, index) => {
            const subtitle = joinPresent(
              [item.role, item.location],
              " | "
            );
            return (
              <div key={`exp-${index}-${item.company}`}>
                <EntryRows
                  primaryLeft={item.company}
                  primaryRight={item.dates ?? ""}
                  secondaryLeft={subtitle}
                  secondaryRight=""
                />
                <BulletList items={item.bullets} />
              </div>
            );
          })}
        </section>

        {resume.projects.length > 0 ? (
          <section>
            <SectionHeading title="Projects" />
            {resume.projects.map((item, index) => {
              const stack =
                item.techStack.length > 0 ? item.techStack.join(", ") : null;
              const subtitle = joinPresent([stack, item.dates], " | ");
              return (
                <div key={`proj-${index}-${item.name}`}>
                  <EntryRows
                    primaryLeft={item.name}
                    primaryRight=""
                    secondaryLeft={subtitle}
                    secondaryRight=""
                  />
                  <BulletList items={item.bullets} />
                </div>
              );
            })}
          </section>
        ) : null}

        <section>
          <SectionHeading title="Skills" />
          <div className="mt-2 space-y-1.5 text-[10pt] leading-[1.45] text-neutral-950">
            {resume.skills.map((group, index) => (
              <p key={`${index}-${group.category}`}>
                <span className="font-medium">{group.category}</span>
                <span>: </span>
                {group.items.join(", ")}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

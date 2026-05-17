import { normalizeResumeDateRange } from "@/lib/resume-date-range";
import { type GeneratedResumeJson } from "@/lib/types";

function escapeLatex(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("~", "\\textasciitilde{}")
    .replaceAll("^", "\\textasciicircum{}");
}

function text(value: string | null | undefined): string {
  return escapeLatex(value ?? "");
}

/**
 * Plain Unicode en/em dashes sometimes disappear or substitute poorly in the
 * pdflatex/Tectonic pipeline; TeX `--` / `---` ligatures always yield a
 * visible dash in PDF output.
 */
function escapeLatexDateFragment(value: string): string {
  return escapeLatex(
    value.replaceAll("–", "--").replaceAll("—", "---")
  );
}

function datesCell(value: string | null | undefined): string {
  return escapeLatexDateFragment(normalizeResumeDateRange(value));
}

function joinPresent(values: Array<string | null | undefined>, separator: string) {
  return values.filter((value): value is string => Boolean(value)).join(separator);
}

function section(title: string, body: string): string {
  if (body.trim().length === 0) {
    return "";
  }

  return `\\section*{${escapeLatex(title)}}\n${body}\n`;
}

function bullets(items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  return `\\begin{itemize}\n${items
    .map((item) => `  \\item ${escapeLatex(item)}`)
    .join("\n")}\n\\end{itemize}`;
}

function education(resume: GeneratedResumeJson): string {
  return resume.education
    .map((item) => {
      const degreeLine = joinPresent([item.degree, item.location], " | ");
      return `\\entry{${text(item.institution)}}{${datesCell(item.dates)}}{${text(
        degreeLine
      )}}{}\n${bullets(item.details)}`;
    })
    .join("\n");
}

function experience(resume: GeneratedResumeJson): string {
  return resume.experience
    .map((item) => {
      const subtitle = joinPresent([item.role, item.location], " | ");
      return `\\entry{${text(item.company)}}{${datesCell(item.dates)}}{${text(
        subtitle
      )}}{}\n${bullets(item.bullets)}`;
    })
    .join("\n");
}

function projects(resume: GeneratedResumeJson): string {
  return resume.projects
    .map((item) => {
      const stack = item.techStack.length > 0 ? item.techStack.join(", ") : null;
      const subtitle = joinPresent(
        [
          stack !== null ? escapeLatex(stack) : null,
          escapeLatexDateFragment(normalizeResumeDateRange(item.dates)) || null
        ],
        " | "
      );
      return `\\entry{${text(item.name)}}{}{${subtitle}}{}\n${bullets(
        item.bullets
      )}`;
    })
    .join("\n");
}

function skills(resume: GeneratedResumeJson): string {
  return resume.skills
    .map(
      (group) =>
        `\\textbf{${text(group.category)}}: ${group.items
          .map((item) => text(item))
          .join(", ")}\\\\`
    )
    .join("\n");
}

export function buildJakeResumeTex(resume: GeneratedResumeJson): string {
  const contactItems = joinPresent(
    [
      resume.contact.phone,
      resume.contact.email,
      resume.contact.linkedin,
      resume.contact.github,
      resume.contact.location
    ],
    " | "
  );

  return String.raw`\documentclass[letterpaper,10pt]{article}
\usepackage[margin=0.5in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage[hidelinks]{hyperref}
\usepackage[T1]{fontenc}
\usepackage{lmodern}

\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlist[itemize]{leftmargin=0.18in,itemsep=1pt,topsep=2pt,parsep=0pt,partopsep=0pt}
\titleformat{\section}{\large\bfseries\uppercase}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{7pt}{4pt}

\newcommand{\entry}[4]{
  \begin{tabular*}{\textwidth}{l@{\extracolsep{\fill}}r}
    \textbf{#1} & #2 \\
    \textit{\small #3} & \textit{\small #4} \\
  \end{tabular*}
}

\begin{document}

\begin{center}
  {\LARGE \textbf{${text(resume.contact.name)}}}\\
  \vspace{2pt}
  \small ${text(contactItems)}
\end{center}

${section("Education", education(resume))}
${section("Experience", experience(resume))}
${section("Projects", projects(resume))}
${section("Skills", skills(resume))}

\end{document}
`;
}

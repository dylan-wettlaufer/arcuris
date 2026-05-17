import { createGeminiClient, resumeExtractionModel } from "@/lib/gemini";
import {
  interviewQuestionsPerExperience,
  maxInterviewQuestionBlocks,
  parsedResumeSchema,
  type InterviewQuestion,
  type ParsedResume
} from "@/lib/types";

const jsonFencePattern = /^```(?:json)?\s*|\s*```$/g;

function parseJsonFromText(text: string): unknown {
  const trimmedText = text.trim().replace(jsonFencePattern, "");
  return JSON.parse(trimmedText) as unknown;
}

/** Human-readable heading for grouped interview questions */
function formatExperienceLabel(
  experience: ParsedResume["experience"][number] | undefined,
  resumeIndex: number
): string {
  if (experience === undefined) return "Professional experience";

  const role = experience.role?.trim() ?? "";
  const company = experience.company?.trim() ?? "";

  if (role.length > 0 && company.length > 0) {
    return `${role} · ${company}`;
  }

  if (role.length > 0) return role;

  if (company.length > 0) return company;

  return `Experience ${resumeIndex + 1}`;
}

const experienceInterviewTemplates: ReadonlyArray<{
  suffix: string;
  question: string;
  reason: string;
}> = [
  {
    suffix: "impact",
    question: "What was the biggest impact you had in this role?",
    reason: "Helps turn this job into concise, measurable bullets."
  },
  {
    suffix: "day_to_day",
    question: "What were your core day to day responsibilities?",
    reason: "Grounds wording in how you actually spent your time."
  },
  {
    suffix: "technologies",
    question: "What technologies or tools did you use most?",
    reason: "Surfaces truthful stack keywords for tailoring."
  },
  {
    suffix: "beyond_resume",
    question:
      "Is there anything important about this role that isn't on your resume?",
    reason: "Captures wins, scope, or context your resume doesn't spell out."
  }
];

function experienceNeedsInterviewContext(entry: ParsedResume["experience"][number]): boolean {
  return entry.isTechnicalRole !== false;
}

/**
 * Resume lists positions but extractor marked none as technical — still collect one technical story via stable keys (`general_context_*`).
 */
function buildGeneralContextQuestions(): InterviewQuestion[] {
  return experienceInterviewTemplates.map((tpl) => ({
    id: `general_context_${tpl.suffix}`,
    question: `${tpl.question} Point to the job, internship, or project where your technical work matters most.`,
    reason: `No technical roles were flagged (e.g. leadership-only lines); ${tpl.reason.toLowerCase()}`,
    experienceIndex: 0,
    experienceLabel: "Technical experience"
  }));
}

/** Fixed follow-ups for technical roles only (stable `exp_<resumeIndex>_*` keys aligned to parsed `experience`). */
export function buildInterviewQuestions(parsedResume: ParsedResume): InterviewQuestion[] {
  if (experienceInterviewTemplates.length !== interviewQuestionsPerExperience) {
    throw new Error(
      `Interview template length must equal interviewQuestionsPerExperience (${interviewQuestionsPerExperience}).`
    );
  }

  const questions: InterviewQuestion[] = [];

  if (parsedResume.experience.length === 0) {
    for (const tpl of experienceInterviewTemplates) {
      questions.push({
        id: `exp_0_${tpl.suffix}`,
        question: `${tpl.question} (If you have no formal roles yet, answer for internships, freelance, or academics.)`,
        reason: `${tpl.reason} Use your strongest relevant role or project activity.`,
        experienceIndex: 0,
        experienceLabel: "Professional experience"
      });
    }
    return questions;
  }

  const capped = parsedResume.experience.slice(0, maxInterviewQuestionBlocks);

  const technicalRows = capped
    .map((entry, resumeIndex) => ({ entry, resumeIndex }))
    .filter(({ entry }) => experienceNeedsInterviewContext(entry));

  if (technicalRows.length === 0) {
    return buildGeneralContextQuestions();
  }

  for (const { entry, resumeIndex } of technicalRows) {
    const label = formatExperienceLabel(entry, resumeIndex);
    for (const tpl of experienceInterviewTemplates) {
      questions.push({
        id: `exp_${resumeIndex}_${tpl.suffix}`,
        question: tpl.question,
        reason: tpl.reason,
        experienceIndex: resumeIndex,
        experienceLabel: label
      });
    }
  }

  return questions;
}

export async function extractStructuredResume(
  resumeText: string
): Promise<ParsedResume> {
  const gemini = createGeminiClient();

  const response = await gemini.models.generateContent({
    model: resumeExtractionModel,
    contents: `Extract this resume into exactly this JSON shape:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "linkedin": string | null,
  "github": string | null,
  "summary": string | null,
  "education": [{
    "institution": string | null,
    "degree": string | null,
    "fieldOfStudy": string | null,
    "startDate": string | null,
    "endDate": string | null,
    "details": string[]
  }],
  "experience": [{
    "company": string | null,
    "role": string | null,
    "location": string | null,
    "startDate": string | null,
    "endDate": string | null,
    "bullets": string[],
    "isTechnicalRole": boolean
  }],
  "projects": [{
    "name": string | null,
    "description": string | null,
    "techStack": string[],
    "bullets": string[]
  }],
  "skillGroups": [{
    "category": "exact heading from the resume skills section, e.g. Languages",
    "items": ["skill tokens listed under that heading"]
  }]
}

For every experience object, set isTechnicalRole:
- true when the role is primarily hands-on technical work for job search (software engineering, data/ML engineering, devops/SRE, security engineering, QA automation, technical internship with coding or systems work, research engineering, etc.).
- false when the role is primarily non-technical for tailoring purposes (student club or org leadership with no engineering scope, volunteer coordination, retail/hospitality, purely administrative work, competitive debate or finance club without a technical deliverable, etc.).
- When unsure, prefer true if the bullets mention building, shipping, debugging, stack, dashboards, labs, deployments, datasets, circuits, CAD for hardware, etc.

Skills extraction rules:
- Mirror how the resume groups skills: one skillGroups object per visible subsection or column heading (preserve category wording).
- If the resume lists skills as one flat block with no headings, return a single skillGroups row with category "Skills".
- Keep category strings concise (resume-like labels); dedupe items per category.

Resume:
${resumeText}`,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      systemInstruction:
        "You extract structured resume data. Return only valid JSON with no markdown, commentary, or extra keys. Use null for unknown scalar values and [] for empty lists."
    }
  });

  const responseText = response.text?.trim() ?? "";

  if (responseText.length === 0) {
    throw new Error("AI did not return resume JSON.");
  }

  return parsedResumeSchema.parse(parseJsonFromText(responseText));
}

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
  experience: ParsedResume["experience"][0] | undefined,
  index: number
): string {
  if (experience === undefined) return "Professional experience";

  const role = experience.role?.trim() ?? "";
  const company = experience.company?.trim() ?? "";

  if (role.length > 0 && company.length > 0) {
    return `${role} · ${company}`;
  }

  if (role.length > 0) return role;

  if (company.length > 0) return company;

  return `Experience ${index + 1}`;
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

/** Fixed follow-ups per parsed role for richer generate-phase context */
export function buildInterviewQuestions(parsedResume: ParsedResume): InterviewQuestion[] {
  if (experienceInterviewTemplates.length !== interviewQuestionsPerExperience) {
    throw new Error(
      `Interview template length must equal interviewQuestionsPerExperience (${interviewQuestionsPerExperience}).`
    );
  }

  const capped =
    parsedResume.experience.length > 0
      ? parsedResume.experience.slice(0, maxInterviewQuestionBlocks)
      : [];

  const blockCount =
    capped.length > 0 ? capped.length : 1;

  const questions: InterviewQuestion[] = [];

  for (let block = 0; block < blockCount; block++) {
    const experience = capped[block];
    const label = formatExperienceLabel(experience, block);

    for (const tpl of experienceInterviewTemplates) {
      questions.push({
        id: `exp_${block}_${tpl.suffix}`,
        question:
          capped.length === 0
            ? `${tpl.question} (If you have no formal roles yet, answer for internships, freelance, or academics.)`
            : tpl.question,
        reason:
          capped.length === 0
            ? `${tpl.reason} Use your strongest relevant role or project activity.`
            : tpl.reason,
        experienceIndex: block,
        experienceLabel: capped.length === 0 ? "Professional experience" : label
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
    "bullets": string[]
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

import { createGeminiClient, resumeExtractionModel } from "@/lib/gemini";
import {
  interviewQuestionsSchema,
  parsedResumeSchema,
  type InterviewQuestion,
  type ParsedResume
} from "@/lib/types";

const jsonFencePattern = /^```(?:json)?\s*|\s*```$/g;

function parseJsonFromText(text: string): unknown {
  const trimmedText = text.trim().replace(jsonFencePattern, "");
  return JSON.parse(trimmedText) as unknown;
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
  "skills": string[]
}

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

export async function generateInterviewQuestions(
  parsedResume: ParsedResume
): Promise<InterviewQuestion[]> {
  const gemini = createGeminiClient();

  const response = await gemini.models.generateContent({
    model: resumeExtractionModel,
    contents: `Create exactly six follow-up questions for this parsed resume.

Return a JSON array only. Each item must match:
{
  "id": "snake_case_unique_id",
  "question": "direct question for the user",
  "reason": "short explanation of the resume gap this question addresses"
}

Focus on missing metrics, unclear scope, vague technologies, project impact, leadership, and job-search context. Do not ask for information already clear in the resume.

Parsed resume:
${JSON.stringify(parsedResume)}`,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      systemInstruction:
        "You generate concise resume follow-up questions for a tech job seeker. Return only valid JSON with no markdown, commentary, or extra keys."
    }
  });

  const responseText = response.text?.trim() ?? "";

  if (responseText.length === 0) {
    throw new Error("AI did not return interview questions.");
  }

  return interviewQuestionsSchema.parse(parseJsonFromText(responseText));
}

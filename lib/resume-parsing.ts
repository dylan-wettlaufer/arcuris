import { createGeminiClient, resumeExtractionModel } from "@/lib/gemini";
import { parsedResumeSchema, type ParsedResume } from "@/lib/types";

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

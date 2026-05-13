import { createGeminiClient, resumeExtractionModel } from "@/lib/gemini";
import {
  buildDraftResumePrompt,
  buildEvaluateResumePrompt,
  buildRefineResumePrompt
} from "@/lib/prompts/resume-generation";
import {
  generatedDraftSchema,
  generatedResumeSchema,
  refinedResumeSchema,
  resumeEvaluationSchema,
  type GeneratedResume,
  type InterviewAnswersRecord,
  type ParsedResume
} from "@/lib/types";

const jsonFencePattern = /^```(?:json)?\s*|\s*```$/g;

function parseJsonFromText(text: string): unknown {
  const trimmedText = text.trim().replace(jsonFencePattern, "");
  return JSON.parse(trimmedText) as unknown;
}

function formatOriginalBullets(parsedResume: ParsedResume): string {
  const experienceBullets = parsedResume.experience.flatMap((experience) =>
    experience.bullets.map(
      (bullet) =>
        `Experience - ${experience.role ?? "Role"} at ${
          experience.company ?? "Company"
        }: ${bullet}`
    )
  );
  const projectBullets = parsedResume.projects.flatMap((project) =>
    project.bullets.map(
      (bullet) => `Project - ${project.name ?? "Project"}: ${bullet}`
    )
  );
  const bullets = [...experienceBullets, ...projectBullets];

  if (bullets.length === 0) {
    return "No original experience or project bullets were parsed.";
  }

  return bullets.map((bullet) => `- ${bullet}`).join("\n");
}

async function generateJsonContent({
  contents,
  systemInstruction
}: {
  contents: string;
  systemInstruction: string;
}): Promise<unknown> {
  const gemini = createGeminiClient();

  const response = await gemini.models.generateContent({
    model: resumeExtractionModel,
    contents,
    config: {
      temperature: 0.25,
      responseMimeType: "application/json",
      systemInstruction
    }
  });

  const responseText = response.text?.trim() ?? "";

  if (responseText.length === 0) {
    throw new Error("AI did not return generation JSON.");
  }

  return parseJsonFromText(responseText);
}

export async function generateTailoredResume({
  parsedResume,
  interviewAnswers,
  jobDescription
}: {
  parsedResume: ParsedResume;
  interviewAnswers: InterviewAnswersRecord;
  jobDescription: string;
}): Promise<GeneratedResume> {
  const originalBullets = formatOriginalBullets(parsedResume);

  const draft = generatedDraftSchema.parse(
    await generateJsonContent({
      contents: buildDraftResumePrompt({
        parsedResume,
        interviewAnswers,
        jobDescription
      }),
      systemInstruction:
        "You generate truthful, ATS-safe tailored resumes for new grad software engineering roles. Return only valid JSON."
    })
  );

  const evaluation = resumeEvaluationSchema.parse(
    await generateJsonContent({
      contents: buildEvaluateResumePrompt({
        draftResumeMarkdown: draft.resumeMarkdown,
        originalBullets,
        jobDescription
      }),
      systemInstruction:
        "You evaluate only rewritten resume bullets against original source bullets and job descriptions with strict integer scoring. Return only valid JSON."
    })
  );

  const refined = refinedResumeSchema.parse(
    await generateJsonContent({
      contents: buildRefineResumePrompt({
        draftResumeMarkdown: draft.resumeMarkdown,
        evaluation,
        originalBullets,
        jobDescription
      }),
      systemInstruction:
        "You refine tailored resumes by applying every requested improvement. Return only valid JSON."
    })
  );

  return generatedResumeSchema.parse({
    companyName: draft.companyName,
    roleTitle: draft.roleTitle,
    draftResumeMarkdown: draft.resumeMarkdown,
    refinedResumeMarkdown: refined.resumeMarkdown,
    draftScore: evaluation.draftScore,
    refinedScore: refined.refinedScore,
    keywordAlignment: evaluation.keywordAlignment,
    impactClarity: evaluation.impactClarity,
    atsFriendliness: evaluation.atsFriendliness,
    narrativeFit: evaluation.narrativeFit,
    improvements: evaluation.improvements
  });
}

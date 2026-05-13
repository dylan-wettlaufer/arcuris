import {
  type InterviewAnswersRecord,
  type ParsedResume,
  type ResumeEvaluation
} from "@/lib/types";

type ResumeGenerationPromptInput = {
  parsedResume: ParsedResume;
  interviewAnswers: InterviewAnswersRecord;
  jobDescription: string;
};

export function buildDraftResumePrompt({
  parsedResume,
  interviewAnswers,
  jobDescription
}: ResumeGenerationPromptInput): string {
  return `Generate a tailored resume for this new grad software engineering job application.

Return only JSON with this exact shape:
{
  "companyName": "company extracted from the job description, or Unknown Company",
  "roleTitle": "role title extracted from the job description, or Software Engineer",
  "resumeMarkdown": "ATS-safe one-page resume in markdown"
}

Resume requirements:
- Use only facts supported by the parsed resume and interview answers.
- Emphasize the experiences, projects, skills, and impact most relevant to the job description.
- Rewrite bullets to be specific, metric-aware, and action-oriented.
- Keep the resume concise enough for one page.
- Use simple markdown headings and bullets. Do not include commentary outside JSON.

Parsed resume:
${JSON.stringify(parsedResume)}

Interview answers:
${JSON.stringify(interviewAnswers)}

Job description:
${jobDescription}`;
}

export function buildEvaluateResumePrompt({
  draftResumeMarkdown,
  originalBullets,
  jobDescription
}: {
  draftResumeMarkdown: string;
  originalBullets: string;
  jobDescription: string;
}): string {
  return `Evaluate only the rewritten resume bullets against the original source bullets and the job description.

Return only JSON with this exact shape:
{
  "draftScore": 1,
  "keywordAlignment": 1,
  "impactClarity": 1,
  "atsFriendliness": 1,
  "narrativeFit": 1,
  "improvements": [
    "specific improvement 1",
    "specific improvement 2",
    "specific improvement 3",
    "specific improvement 4",
    "specific improvement 5"
  ]
}

Scoring rules:
- Every score must be an integer from 1 to 10.
- draftScore is the overall quality of the rewritten bullets, not the whole resume.
- Evaluate how well the rewritten bullets preserve the original facts while using language that matches the job description.
- Reward ATS-aligned phrasing when it truthfully maps to the original bullets.
- Do not penalize the resume for missing technologies, tools, credentials, or experiences that are absent from the original bullets.
- Penalize invented claims, inflated scope, vague rewrites, weak action verbs, missing metrics that were present in the originals, and missed opportunities to mirror JD language.
- Improvements must be concrete bullet-level edits that can be applied in the next pass.

Original source bullets:
${originalBullets}

AI-rewritten draft resume:
${draftResumeMarkdown}

Job description:
${jobDescription}`;
}

export function buildRefineResumePrompt({
  draftResumeMarkdown,
  evaluation,
  originalBullets,
  jobDescription
}: {
  draftResumeMarkdown: string;
  evaluation: ResumeEvaluation;
  originalBullets: string;
  jobDescription: string;
}): string {
  return `Apply every bullet-level improvement to produce the final tailored resume.

Return only JSON with this exact shape:
{
  "refinedScore": 1,
  "resumeMarkdown": "final ATS-safe one-page resume in markdown"
}

Rules:
- refinedScore must be an integer from 1 to 10 after improvements are applied.
- Keep every rewritten bullet truthful to the original source bullets and interview context.
- Improve ATS alignment by matching the job description's language where the source bullets support it.
- Do not add technologies, tools, metrics, credentials, or responsibilities that are not supported by the source material.
- Preserve an ATS-safe structure: contact, summary, education, experience, projects, skills.
- Prefer strong relevant bullets over keyword stuffing.
- Do not include commentary outside JSON.

Original source bullets:
${originalBullets}

Draft resume:
${draftResumeMarkdown}

Evaluation and required improvements:
${JSON.stringify(evaluation)}

Job description:
${jobDescription}`;
}

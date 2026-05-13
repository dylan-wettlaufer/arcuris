import { z } from "zod";

const nullableTextSchema = z.string().nullable();

export const resumeEducationSchema = z.object({
  institution: nullableTextSchema,
  degree: nullableTextSchema,
  fieldOfStudy: nullableTextSchema,
  startDate: nullableTextSchema,
  endDate: nullableTextSchema,
  details: z.array(z.string())
});

export const resumeExperienceSchema = z.object({
  company: nullableTextSchema,
  role: nullableTextSchema,
  location: nullableTextSchema,
  startDate: nullableTextSchema,
  endDate: nullableTextSchema,
  bullets: z.array(z.string())
});

export const resumeProjectSchema = z.object({
  name: nullableTextSchema,
  description: nullableTextSchema,
  techStack: z.array(z.string()),
  bullets: z.array(z.string())
});

export const parsedResumeSchema = z
  .object({
    name: nullableTextSchema,
    email: nullableTextSchema,
    phone: nullableTextSchema,
    linkedin: nullableTextSchema,
    github: nullableTextSchema,
    summary: nullableTextSchema,
    education: z.array(resumeEducationSchema),
    experience: z.array(resumeExperienceSchema),
    projects: z.array(resumeProjectSchema),
    skills: z.array(z.string())
  })
  .strict();

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

const questionIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9_]+$/);

export const interviewQuestionSchema = z
  .object({
    id: questionIdSchema,
    question: z.string().min(1).max(500),
    reason: z.string().min(1).max(500)
  })
  .strict();

export const interviewQuestionsSchema = z
  .array(interviewQuestionSchema)
  .length(6)
  .refine(
    (questions) => new Set(questions.map((question) => question.id)).size === 6,
    "Interview question IDs must be unique."
  );

export const interviewAnswerSchema = z
  .object({
    questionId: questionIdSchema,
    answer: z.string().trim().min(1).max(4000)
  })
  .strict();

export const interviewAnswersSchema = z
  .array(interviewAnswerSchema)
  .min(1)
  .max(6)
  .refine(
    (answers) => new Set(answers.map((answer) => answer.questionId)).size === answers.length,
    "Interview answers must use unique question IDs."
  );

export const interviewAnswersRequestSchema = z
  .object({
    answers: interviewAnswersSchema
  })
  .strict();

export const interviewAnswersRecordSchema = z.record(questionIdSchema, z.string().trim());

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type InterviewAnswer = z.infer<typeof interviewAnswerSchema>;
export type InterviewAnswersRequest = z.infer<typeof interviewAnswersRequestSchema>;
export type InterviewAnswersRecord = z.infer<typeof interviewAnswersRecordSchema>;

export const jobDescriptionRequestSchema = z
  .object({
    jobDescription: z
      .string()
      .trim()
      .min(200, "Paste the full job description before generating.")
      .max(60_000, "Job description is too long.")
  })
  .strict();

export const resumeScoreSchema = z
  .number()
  .int()
  .min(1)
  .max(10);

export const generatedDraftSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120),
    roleTitle: z.string().trim().min(1).max(160),
    resumeMarkdown: z.string().trim().min(1)
  })
  .strict();

export const resumeEvaluationSchema = z
  .object({
    draftScore: resumeScoreSchema,
    keywordAlignment: resumeScoreSchema,
    impactClarity: resumeScoreSchema,
    atsFriendliness: resumeScoreSchema,
    narrativeFit: resumeScoreSchema,
    improvements: z.array(z.string().trim().min(1).max(500)).length(5)
  })
  .strict();

export const refinedResumeSchema = z
  .object({
    refinedScore: resumeScoreSchema,
    resumeMarkdown: z.string().trim().min(1)
  })
  .strict();

export const generatedResumeSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120),
    roleTitle: z.string().trim().min(1).max(160),
    draftResumeMarkdown: z.string().trim().min(1),
    refinedResumeMarkdown: z.string().trim().min(1),
    draftScore: resumeScoreSchema,
    refinedScore: resumeScoreSchema,
    keywordAlignment: resumeScoreSchema,
    impactClarity: resumeScoreSchema,
    atsFriendliness: resumeScoreSchema,
    narrativeFit: resumeScoreSchema,
    improvements: z.array(z.string().trim().min(1).max(500)).length(5)
  })
  .strict();

export type JobDescriptionRequest = z.infer<typeof jobDescriptionRequestSchema>;
export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;
export type ResumeEvaluation = z.infer<typeof resumeEvaluationSchema>;
export type RefinedResume = z.infer<typeof refinedResumeSchema>;
export type GeneratedResume = z.infer<typeof generatedResumeSchema>;

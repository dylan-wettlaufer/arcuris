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

export const bulletRewriteSchema = z
  .object({
    source: z.string().trim().min(1).max(160),
    originalBullet: z.string().trim().min(1).max(1000),
    rewrittenBullet: z.string().trim().min(1).max(1000)
  })
  .strict();

const generatedResumeContactSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: nullableTextSchema,
    phone: nullableTextSchema,
    linkedin: nullableTextSchema,
    github: nullableTextSchema,
    location: nullableTextSchema
  })
  .strict();

const generatedResumeEducationSchema = z
  .object({
    institution: z.string().trim().min(1).max(160),
    degree: nullableTextSchema,
    location: nullableTextSchema,
    dates: nullableTextSchema,
    details: z.array(z.string().trim().min(1).max(240)).max(4)
  })
  .strict();

const generatedResumeExperienceSchema = z
  .object({
    company: z.string().trim().min(1).max(160),
    role: z.string().trim().min(1).max(160),
    location: nullableTextSchema,
    dates: nullableTextSchema,
    bullets: z.array(z.string().trim().min(1).max(500)).min(1).max(5)
  })
  .strict();

const generatedResumeProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    techStack: z.array(z.string().trim().min(1).max(80)).max(12),
    dates: nullableTextSchema,
    bullets: z.array(z.string().trim().min(1).max(500)).min(1).max(5)
  })
  .strict();

const generatedResumeSkillGroupSchema = z
  .object({
    category: z.string().trim().min(1).max(80),
    items: z.array(z.string().trim().min(1).max(80)).min(1).max(24)
  })
  .strict();

export const generatedResumeJsonSchema = z
  .object({
    contact: generatedResumeContactSchema,
    summary: z.string().trim().min(1).max(800),
    education: z.array(generatedResumeEducationSchema).min(1).max(4),
    experience: z.array(generatedResumeExperienceSchema).min(1).max(5),
    projects: z.array(generatedResumeProjectSchema).max(5),
    skills: z.array(generatedResumeSkillGroupSchema).min(1).max(8)
  })
  .strict();

export const generatedDraftSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120),
    roleTitle: z.string().trim().min(1).max(160),
    resumeMarkdown: z.string().trim().min(1),
    resumeJson: generatedResumeJsonSchema,
    bulletRewrites: z.array(bulletRewriteSchema).min(1).max(12)
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

export const bulletFeedbackSchema = z
  .object({
    source: z.string().trim().min(1).max(160),
    originalBullet: z.string().trim().min(1).max(1000),
    draftBullet: z.string().trim().min(1).max(1000),
    rewrittenBullet: z.string().trim().min(1).max(1000),
    feedback: z.string().trim().min(1).max(600)
  })
  .strict();

export const refinedResumeSchema = z
  .object({
    refinedScore: resumeScoreSchema,
    resumeMarkdown: z.string().trim().min(1),
    resumeJson: generatedResumeJsonSchema,
    bulletFeedback: z.array(bulletFeedbackSchema).min(1).max(12)
  })
  .strict();

export const generatedResumeSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120),
    roleTitle: z.string().trim().min(1).max(160),
    draftResumeMarkdown: z.string().trim().min(1),
    refinedResumeMarkdown: z.string().trim().min(1),
    resumeJson: generatedResumeJsonSchema,
    draftScore: resumeScoreSchema,
    refinedScore: resumeScoreSchema,
    keywordAlignment: resumeScoreSchema,
    impactClarity: resumeScoreSchema,
    atsFriendliness: resumeScoreSchema,
    narrativeFit: resumeScoreSchema,
    improvements: z.array(z.string().trim().min(1).max(500)).length(5),
    bulletFeedback: z.array(bulletFeedbackSchema).min(1).max(12)
  })
  .strict();

export type JobDescriptionRequest = z.infer<typeof jobDescriptionRequestSchema>;
export type BulletRewrite = z.infer<typeof bulletRewriteSchema>;
export type GeneratedResumeJson = z.infer<typeof generatedResumeJsonSchema>;
export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;
export type ResumeEvaluation = z.infer<typeof resumeEvaluationSchema>;
export type BulletFeedback = z.infer<typeof bulletFeedbackSchema>;
export type RefinedResume = z.infer<typeof refinedResumeSchema>;
export type GeneratedResume = z.infer<typeof generatedResumeSchema>;

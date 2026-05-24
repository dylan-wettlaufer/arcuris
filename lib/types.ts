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
  bullets: z.array(z.string()),
  /** When false, onboarding skips per-role prompts (e.g. club leadership). Default true for legacy rows. */
  isTechnicalRole: z.boolean().default(true)
});

export const resumeProjectSchema = z.object({
  name: nullableTextSchema,
  description: nullableTextSchema,
  techStack: z.array(z.string()),
  bullets: z.array(z.string())
});

export const parsedResumeSkillGroupSchema = z
  .object({
    category: z.string().trim().min(1).max(80),
    items: z.array(z.string()).max(48)
  })
  .strict();

export type ParsedResumeSkillGroup = z.infer<typeof parsedResumeSkillGroupSchema>;

/** Migrate legacy flat `skills: string[]` inventory rows to `skillGroups`. */
function migrateParsedResumeJson(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return raw;
  }

  const original = raw as Record<string, unknown>;
  const out = { ...original };
  const legacySkills = original.skills;
  const sg = original.skillGroups;

  const skillGroupsLookValid =
    Array.isArray(sg) &&
    sg.length > 0 &&
    sg.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).category === "string" &&
        String((entry as Record<string, unknown>).category).trim().length > 0
    );

  if (!skillGroupsLookValid) {
    if (Array.isArray(legacySkills)) {
      const flat = legacySkills.filter((item): item is string => typeof item === "string");
      out.skillGroups =
        flat.length > 0 ? [{ category: "Skills", items: flat }] : [];
    } else {
      out.skillGroups = [];
    }
  }

  delete out.skills;
  return out;
}

const parsedResumeCoreSchema = z
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
    skillGroups: z.array(parsedResumeSkillGroupSchema).max(8)
  })
  .strict();

export const parsedResumeSchema = z.preprocess(
  migrateParsedResumeJson,
  parsedResumeCoreSchema
);

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
    reason: z.string().min(1).max(500),
    experienceIndex: z.number().int().min(0),
    experienceLabel: z.string().trim().min(1).max(240)
  })
  .strict();

export const maxInterviewQuestionBlocks = 12;
export const interviewQuestionsPerExperience = 4;
const maxInterviewQuestions =
  maxInterviewQuestionBlocks * interviewQuestionsPerExperience;

export const interviewQuestionsSchema = z
  .array(interviewQuestionSchema)
  .min(interviewQuestionsPerExperience)
  .max(maxInterviewQuestions)
  .refine(
    (questions) =>
      questions.length % interviewQuestionsPerExperience === 0,
    `Interview questions must come in blocks of ${interviewQuestionsPerExperience} (one block per role).`
  )
  .refine(
    (questions) =>
      new Set(questions.map((question) => question.id)).size === questions.length,
    "Interview question IDs must be unique."
  )
  .refine((questions) => {
    const blockCount = questions.length / interviewQuestionsPerExperience;
    for (let block = 0; block < blockCount; block++) {
      const slice = questions.slice(
        block * interviewQuestionsPerExperience,
        (block + 1) * interviewQuestionsPerExperience
      );
      const label = slice[0]?.experienceLabel;
      const index = slice[0]?.experienceIndex;
      if (label === undefined || index === undefined) {
        return false;
      }
      if (!slice.every((q) => q.experienceLabel === label && q.experienceIndex === index)) {
        return false;
      }
    }
    return true;
  }, "Each role block must share one resume row index and label.");

export const interviewAnswerSchema = z
  .object({
    questionId: questionIdSchema,
    answer: z.string().trim().min(1).max(4000)
  })
  .strict();

export const interviewAnswersSchema = z
  .array(interviewAnswerSchema)
  .min(interviewQuestionsPerExperience)
  .max(maxInterviewQuestions)
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

export const archiveItemTypeSchema = z.enum(["experience", "project"]);

export const archiveNoteRequestSchema = z
  .object({
    itemType: archiveItemTypeSchema,
    itemIndex: z.number().int().min(0),
    content: z.string().trim().min(1).max(4000)
  })
  .strict();

export const archiveNoteUpdateSchema = z
  .object({
    content: z.string().trim().min(1).max(4000)
  })
  .strict();

export const archiveNoteSchema = z
  .object({
    id: z.string().uuid(),
    itemType: archiveItemTypeSchema,
    itemIndex: z.number().int().min(0),
    content: z.string().trim().min(1).max(4000),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
  .strict();

export const archiveNotesSchema = z.array(archiveNoteSchema);

export type ArchiveItemType = z.infer<typeof archiveItemTypeSchema>;
export type ArchiveNoteRequest = z.infer<typeof archiveNoteRequestSchema>;
export type ArchiveNoteUpdate = z.infer<typeof archiveNoteUpdateSchema>;
export type ArchiveNote = z.infer<typeof archiveNoteSchema>;

export const applicationStatuses = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected"
] as const;

export const applicationStatusSchema = z.enum(applicationStatuses);

export const applicationStatusUpdateSchema = z
  .object({
    status: applicationStatusSchema
  })
  .strict();

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

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

export const resumeSectionSchema = z.enum([
  "education",
  "experience",
  "projects",
  "skills"
]);

export const defaultResumeSectionOrder = [
  "education",
  "experience",
  "projects",
  "skills"
] as const;

const resumeSectionOrderSchema = z
  .array(resumeSectionSchema)
  .default([...defaultResumeSectionOrder])
  .transform((sections) => {
    const present = new Set(sections);
    return [
      ...sections.filter(
        (section, index) => sections.indexOf(section) === index
      ),
      ...defaultResumeSectionOrder.filter((section) => !present.has(section))
    ];
  });

export const generatedResumeJsonSchema = z
  .object({
    contact: generatedResumeContactSchema,
    summary: z.string().trim().min(1).max(800),
    education: z.array(generatedResumeEducationSchema).min(1).max(4),
    experience: z.array(generatedResumeExperienceSchema).min(1).max(5),
    projects: z.array(generatedResumeProjectSchema).max(5),
    skills: z.array(generatedResumeSkillGroupSchema).min(1).max(8),
    sectionOrder: resumeSectionOrderSchema
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
export type ResumeSection = z.infer<typeof resumeSectionSchema>;
export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;
export type ResumeEvaluation = z.infer<typeof resumeEvaluationSchema>;
export type BulletFeedback = z.infer<typeof bulletFeedbackSchema>;
export type RefinedResume = z.infer<typeof refinedResumeSchema>;
export type GeneratedResume = z.infer<typeof generatedResumeSchema>;

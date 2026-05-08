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

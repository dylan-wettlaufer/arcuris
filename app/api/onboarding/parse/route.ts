import { extractStructuredResume } from "@/lib/resume-parsing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type ParsedResume } from "@/lib/types";
import { NextResponse } from "next/server";
import type { Output } from "pdf2json";
import { z } from "zod";

export const runtime = "nodejs";

const maxResumeTextLength = 120_000;
const maxFileSize = 8 * 1024 * 1024;
const parseSuccessRedirect = "/onboarding/interview";

const textFieldSchema = z
  .string()
  .trim()
  .max(maxResumeTextLength, "Resume text is too long.")
  .optional();

const jsonRequestSchema = z
  .object({
    resumeText: textFieldSchema
  })
  .refine((value) => value.resumeText !== undefined && value.resumeText !== "", {
    message: "Provide resumeText or upload a resume file."
  });

const formFieldsSchema = z.object({
  resumeText: textFieldSchema,
  resume_text: textFieldSchema
});

const resumeFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Uploaded file is empty.")
  .refine((file) => file.size <= maxFileSize, "Uploaded file is too large.")
  .refine(
    (file) => isPdfFile(file) || isTextFile(file),
    "Upload a pdf file or plain text file."
  );

type ParseResponse =
  | {
      redirectTo: string;
      parsedJson: ParsedResume;
    }
  | {
      error: string;
    };

function getTextField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function getResumeFile(formData: FormData): File | null {
  const value =
    formData.get("resumeFile") ??
    formData.get("resume_file") ??
    formData.get("file");

  return value instanceof File && value.size > 0 ? value : null;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isTextFile(file: File): boolean {
  return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid resume input.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Resume parsing failed.";
}

async function extractTextFromPdf(file: File): Promise<string> {
  const { default: PDFParser } = await import("pdf2json");
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParser(null, true);

  return new Promise((resolve, reject) => {
    parser.on("pdfParser_dataError", (errorData) => {
      parser.destroy();
      reject(errorData instanceof Error ? errorData : errorData.parserError);
    });

    parser.on("pdfParser_dataReady", (_pdfData: Output) => {
      const parsedText = parser.getRawTextContent().trim();
      parser.destroy();
      resolve(parsedText);
    });

    try {
      parser.parseBuffer(fileBuffer);
    } catch (error: unknown) {
      parser.destroy();
      reject(error);
    }
  });
}

async function extractTextFromFile(file: File): Promise<string> {
  const parsedFile = resumeFileSchema.parse(file);

  if (isTextFile(parsedFile)) {
    return (await parsedFile.text()).trim();
  }

  return extractTextFromPdf(parsedFile);
}

async function getResumeTextFromRequest(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const parsedFields = formFieldsSchema.parse({
      resumeText: getTextField(formData, "resumeText"),
      resume_text: getTextField(formData, "resume_text")
    });
    const textResume = parsedFields.resumeText ?? parsedFields.resume_text ?? "";
    const fileResume = await maybeExtractFileText(getResumeFile(formData));
    const combinedResumeText = [textResume, fileResume]
      .filter((part) => part.trim().length > 0)
      .join("\n\n")
      .trim();

    if (combinedResumeText.length === 0) {
      throw new Error("Provide resume text or upload a resume file.");
    }

    if (combinedResumeText.length > maxResumeTextLength) {
      throw new Error("Resume text is too long.");
    }

    return combinedResumeText;
  }

  const body = (await request.json()) as unknown;
  const parsedBody = jsonRequestSchema.parse(body);
  return parsedBody.resumeText ?? "";
}

async function maybeExtractFileText(file: File | null): Promise<string> {
  if (file === null) {
    return "";
  }

  return extractTextFromFile(file);
}

export async function POST(request: Request): Promise<NextResponse<ParseResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let resumeText: string;

  try {
    resumeText = await getResumeTextFromRequest(request);
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  try {
    const parsedJson = await extractStructuredResume(resumeText);
    const adminSupabase = createAdminClient();
    const { error: upsertError } = await adminSupabase.from("inventory").upsert(
      {
        user_id: user.id,
        resume_text: resumeText,
        parsed_json: parsedJson,
        interview_answers: {}
      },
      { onConflict: "user_id" }
    );

    if (upsertError !== null) {
      throw upsertError;
    }

    return NextResponse.json({
      redirectTo: parseSuccessRedirect,
      parsedJson
    });
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 500 }
    );
  }
}

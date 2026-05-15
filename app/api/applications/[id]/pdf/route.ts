import { buildJakeResumeTex } from "@/lib/latex/resume-template";
import { compileLatexToPdf } from "@/lib/latex/service";
import { createClient } from "@/lib/supabase/server";
import { generatedResumeJsonSchema } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

type PdfRouteContext = {
  params: {
    id: string;
  };
};

function filenameFor(companyName: string, roleTitle: string): string {
  const safeName = `${companyName}-${roleTitle}-resume`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeName || "resume"}.pdf`;
}

function parseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "This application does not have a structured resume for PDF export.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "PDF generation failed.";
}

export async function GET(
  _request: Request,
  { params }: PdfRouteContext
): Promise<NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: application, error } = await supabase
    .from("applications")
    .select("company_name, role_title, resume_json")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error !== null) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (application === null) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  try {
    const resumeJson = generatedResumeJsonSchema.parse(application.resume_json);
    const tex = buildJakeResumeTex(resumeJson);
    const pdf = await compileLatexToPdf(tex);
    const filename = filenameFor(
      application.company_name as string,
      application.role_title as string
    );

    return new NextResponse(pdf, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (pdfError: unknown) {
    return NextResponse.json({ error: parseError(pdfError) }, { status: 500 });
  }
}

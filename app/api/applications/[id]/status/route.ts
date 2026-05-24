import { createClient } from "@/lib/supabase/server";
import {
  applicationStatusSchema,
  applicationStatusUpdateSchema,
  type ApplicationStatus
} from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

type StatusRouteProps = {
  params: {
    id: string;
  };
};

type UpdateStatusResponse =
  | {
      status: ApplicationStatus;
    }
  | {
      error: string;
    };

const applicationIdSchema = z.string().uuid();

function parseUnknownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid application status.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update application status.";
}

export async function PATCH(
  request: Request,
  { params }: StatusRouteProps
): Promise<NextResponse<UpdateStatusResponse>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let applicationId: string;
  let nextStatus: ApplicationStatus;

  try {
    applicationId = applicationIdSchema.parse(params.id);
    nextStatus = applicationStatusUpdateSchema.parse(
      await request.json()
    ).status;
  } catch (requestError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(requestError) },
      { status: 400 }
    );
  }

  const { data: application, error: updateError } = await supabase
    .from("applications")
    .update({ status: nextStatus })
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .select("status")
    .maybeSingle();

  if (updateError !== null) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (application === null) {
    return NextResponse.json(
      { error: "Application was not found." },
      { status: 404 }
    );
  }

  try {
    return NextResponse.json({
      status: applicationStatusSchema.parse(application.status)
    });
  } catch (parseError: unknown) {
    return NextResponse.json(
      { error: parseUnknownError(parseError) },
      { status: 500 }
    );
  }
}

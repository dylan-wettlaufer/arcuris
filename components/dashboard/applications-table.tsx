"use client";

import {
  applicationStatuses,
  type ApplicationStatus
} from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type DashboardApplication = {
  id: string;
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  createdAt: string;
  refinedScore: number;
};

type ApplicationsTableProps = {
  applications: DashboardApplication[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return applicationStatuses.some((status) => status === value);
}

export function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>(
    () =>
      Object.fromEntries(
        applications.map((application) => [
          application.id,
          application.status
        ])
      )
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(
    applicationId: string,
    nextStatus: ApplicationStatus
  ): Promise<void> {
    const previousStatus = statuses[applicationId];
    setStatuses((current) => ({ ...current, [applicationId]: nextStatus }));
    setSavingId(applicationId);

    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus })
        }
      );
      const body = (await response.json().catch(() => null)) as
        | { status?: ApplicationStatus; error?: string }
        | null;

      if (!response.ok || body?.status === undefined) {
        throw new Error(body?.error ?? "Could not update status.");
      }

      setStatuses((current) => ({ ...current, [applicationId]: body.status! }));
      toast.success("Status updated");
      router.refresh();
    } catch (error: unknown) {
      setStatuses((current) => ({
        ...current,
        [applicationId]: previousStatus ?? "Applied"
      }));
      toast.error(
        error instanceof Error ? error.message : "Could not update status."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="hidden grid-cols-[1.3fr_1fr_150px_100px] gap-4 border-b border-border bg-secondary px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
        <span>Role</span>
        <span>Company</span>
        <span>Status</span>
        <span>Score</span>
      </div>
      <div className="divide-y divide-border">
        {applications.map((application) => {
          const currentStatus = statuses[application.id] ?? application.status;
          const resumeHref = `/resume/${application.id}`;
          const isSaving = savingId === application.id;

          return (
            <div
              className="grid gap-3 px-4 py-4 transition hover:bg-secondary md:grid-cols-[1.3fr_1fr_150px_100px] md:items-center md:gap-4"
              key={application.id}
            >
              <Link className="group" href={resumeHref}>
                <p className="font-medium text-foreground group-hover:underline">
                  {application.roleTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(application.createdAt)}
                </p>
              </Link>
              <Link
                className="text-sm text-foreground hover:underline"
                href={resumeHref}
              >
                {application.companyName}
              </Link>
              <label className="grid gap-1">
                <span className="sr-only">
                  Update status for {application.roleTitle} at{" "}
                  {application.companyName}
                </span>
                <select
                  className="h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    if (isApplicationStatus(nextStatus)) {
                      void updateStatus(application.id, nextStatus);
                    }
                  }}
                  value={currentStatus}
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                className="text-sm text-muted-foreground hover:text-foreground"
                href={resumeHref}
              >
                {application.refinedScore}/10
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

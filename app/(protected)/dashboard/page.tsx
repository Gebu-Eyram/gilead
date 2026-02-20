"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationForApplicant } from "@/utils/types";

function DefaultDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
      </div>
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
    </div>
  );
}

function ApplicantDashboard() {
  const { data: currentUser } = useCurrentUser();
  const { data: applications = [], isLoading } = useQuery<
    ApplicationForApplicant[]
  >({
    queryKey: ["applicant-applications", currentUser?.user?.id],
    queryFn: () => fetch("/api/applications").then((r) => r.json()),
    staleTime: 1000 * 60 * 2,
    enabled: !!currentUser?.user?.id,
  });

  // Filter to only show applications made by the current user
  const userApplications = applications.filter(
    (app) => app.user_id === currentUser?.user?.id,
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          My Applications
        </h2>
        {userApplications.length === 0 ? (
          <div className="bg-muted/50 rounded-xl p-8 text-center text-muted-foreground">
            <p>No applications yet. Start exploring jobs!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userApplications.map((app) => (
              <Link key={app.id} href={`/jobs/${app.job_id}`} className="block">
                <div className="bg-card border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        {app.job?.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {app.job?.company?.name}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      <span
                        className={`px-2 py-1 rounded-full ${
                          app.status === "rejected"
                            ? "bg-red-100 text-red-900"
                            : app.status === "selected"
                              ? "bg-green-100 text-green-900"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const { data: currentUser } = useCurrentUser();

  return currentUser?.role === "applicant" ? (
    <ApplicantDashboard />
  ) : (
    <DefaultDashboard />
  );
}

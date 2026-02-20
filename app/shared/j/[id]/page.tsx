"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  MapPin,
  DollarSign,
  User,
  Calendar,
  Globe,
  Zap,
  Heart,
} from "lucide-react";
import type { JobFull } from "@/utils/types";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "default",
  draft: "secondary",
  paused: "outline",
  closed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  draft: "Draft",
  paused: "Paused",
  closed: "Closed",
};

function capitalize(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SharedJobPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const {
    data: job,
    isLoading,
    error,
  } = useQuery<JobFull>({
    queryKey: ["shared-job", jobId],
    queryFn: () =>
      fetch(`/api/jobs/${jobId}`).then((r) => {
        if (!r.ok) throw new Error("Job not found");
        return r.json();
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-32 mb-8" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="size-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error
              ? (error as Error).message
              : "The job you're looking for doesn't exist."}
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const salaryStr =
    job.salary_min || job.salary_max
      ? `${job.salary_min ?? "?"}-${job.salary_max ?? "?"} ${job.salary_currency}`
      : null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>

          {/* Status badge */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                {job.title}
              </h1>
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <Building2 className="size-5" />
                {job.company?.name}
              </div>
            </div>
            <Badge
              variant={STATUS_VARIANT[job.status]}
              className="text-base px-4 py-2 capitalize shrink-0"
            >
              {STATUS_LABEL[job.status]}
            </Badge>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          {/* Quick info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Job Type */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="size-4" />
                Job Type
              </div>
              <p className="font-semibold capitalize">{capitalize(job.type)}</p>
            </div>

            {/* Experience Level */}
            {job.experience_level && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="size-4" />
                  Experience
                </div>
                <p className="font-semibold capitalize">
                  {capitalize(job.experience_level)}
                </p>
              </div>
            )}

            {/* Salary */}
            {salaryStr && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="size-4" />
                  Salary
                </div>
                <p className="font-semibold">{salaryStr}</p>
              </div>
            )}

            {/* Posted Date */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="size-4" />
                Posted
              </div>
              <p className="font-semibold text-sm">
                {formatDate(job.date_posted)}
              </p>
            </div>
          </div>

          {/* Location & Remote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {job.location && (
              <div>
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <MapPin className="size-4 text-primary" />
                  Location
                </div>
                <p className="text-muted-foreground">{job.location}</p>
              </div>
            )}
            {job.remote_status && (
              <div>
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <Globe className="size-4 text-primary" />
                  Remote Status
                </div>
                <p className="text-muted-foreground capitalize">
                  {capitalize(job.remote_status)}
                </p>
              </div>
            )}
          </div>

          {/* Metadata row */}
          {(job.department || job.openings) && (
            <div className="flex flex-wrap gap-6 py-4">
              {job.department && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                    Department
                  </p>
                  <p>{job.department}</p>
                </div>
              )}
              {job.openings && job.openings > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                    Openings
                  </p>
                  <p>{job.openings}</p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {job.description && (
            <section>
              <h2 className="text-2xl font-bold mb-4">About the Role</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </div>
            </section>
          )}

          {/* Requirements */}
          {job.requirements && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Requirements</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {job.requirements}
              </div>
            </section>
          )}

          {/* Benefits */}
          {job.benefits && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="size-6 text-primary" />
                <h2 className="text-2xl font-bold">Benefits</h2>
              </div>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {job.benefits}
              </div>
            </section>
          )}

          {/* Company Info */}
          {job.company && (
            <section className="bg-muted/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="size-6" />
                About {job.company.name}
              </h2>
              <div className="space-y-3 text-muted-foreground">
                {job.company.location && (
                  <p>
                    <span className="font-semibold text-foreground">
                      Location:
                    </span>{" "}
                    {job.company.location}
                  </p>
                )}
                {job.company.type && (
                  <p>
                    <span className="font-semibold text-foreground">Type:</span>{" "}
                    {job.company.type}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* CTA */}
          <div className="pt-6">
            <Button size="lg" className="w-full sm:w-auto">
              Apply Now
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Posted on {formatDate(job.date_posted)} • {job.company?.name}
          </p>
        </div>
      </div>
    </div>
  );
}

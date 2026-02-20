"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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
  LockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showApplySheet, setShowApplySheet] = useState(false);

  const { data: currentUser } = useCurrentUser();

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

  const { mutate: submitApplication, isPending: isApplying } = useMutation({
    mutationFn: async () => {
      if (!jobId || !currentUser?.user?.id) {
        throw new Error("Missing job ID or user ID");
      }
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          user_id: currentUser.user.id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit application");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      setShowApplySheet(false);
    },
    onError: (err) => {
      toast.error("Couldn't apply right now. Please try again.");
    },
  });

  const handleApplyClick = () => {
    if (!currentUser?.user) {
      setShowApplyDialog(true);
    } else {
      setShowApplySheet(true);
    }
  };

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
              <h1 className="text-4xl font-medium tracking-tight mb-2">
                {job.title}
              </h1>
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <Building2 className="size-5" />
                {job.company?.name}
              </div>
            </div>
            {/* Status badge and Apply button */}
            {job.status === "open" ? (
              <Button
                size="lg"
                onClick={handleApplyClick}
                disabled={isApplying}
                className="shrink-0"
              >
                {isApplying ? "Applying..." : "Apply Now"}
              </Button>
            ) : (
              <Badge
                variant={STATUS_VARIANT[job.status]}
                className="text-base px-4 py-2 capitalize shrink-0"
              >
                {STATUS_LABEL[job.status]}
              </Badge>
            )}
          </div>
        </div>

        {/* Main content - only show if job is open */}
        {job.status === "open" ? (
          <div className="space-y-8">
            {/* Quick info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Job Type */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Zap className="size-4" />
                  Job Type
                </div>
                <p className="font-semibold capitalize">
                  {capitalize(job.type)}
                </p>
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

            {/* Description */}
            {job.description && (
              <section>
                <h2 className="text-2xl font-medium mb-4">About the Role</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {job.description}
                </div>
              </section>
            )}

            {/* Requirements */}
            {job.requirements && (
              <section>
                <h2 className="text-2xl font-medium mb-4">Requirements</h2>
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
                  <h2 className="text-2xl font-medium">Benefits</h2>
                </div>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {job.benefits}
                </div>
              </section>
            )}

            {/* Company Info */}
            {job.company && (
              <section className="bg-muted/30 rounded-lg p-6">
                <h2 className="text-2xl font-medium mb-4 flex items-center gap-2">
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
                      <span className="font-semibold text-foreground">
                        Type:
                      </span>{" "}
                      {job.company.type}
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          <Empty className="rounded-lg border border-dashed bg-muted/30 py-12 mt-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LockIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>Position Not Available</EmptyTitle>
              <EmptyDescription>
                This job position is currently closed and not accepting
                applications. Please check back later.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Posted on {formatDate(job.date_posted)} • {job.company?.name}
          </p>
        </div>
      </div>

      {/* Sign In Alert Dialog */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign in to apply</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be signed in to submit an application. Create an
              account or sign in to get started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel onClick={() => setShowApplyDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Dialog */}
      <Dialog open={showApplySheet} onOpenChange={setShowApplySheet}>
        <DialogContent className="px-0">
          <DialogHeader className="border-b px-4 pb-2">
            <DialogTitle>Apply Now</DialogTitle>
            <DialogDescription>
              Submit your application for {job?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Job Title</p>
              <p className="text-sm text-muted-foreground">{job?.title}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Company</p>
              <p className="text-sm text-muted-foreground">
                {job?.company?.name}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                By clicking apply, you'll be submitted as a candidate for this
                position. You can track your application progress in your
                dashboard.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end px-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApplySheet(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => submitApplication()} disabled={isApplying}>
              {isApplying ? "Applying..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

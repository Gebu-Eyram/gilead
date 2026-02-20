"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Building2,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Briefcase,
  CalendarDays,
  Upload,
  FileText,
  Loader2,
  Video,
  ArrowRight,
  BrainCircuit,
  FileCheck,
} from "lucide-react";
import type {
  JobFull,
  ApplicationForApplicant,
  RecruitmentStep,
} from "@/utils/types";

function capitalize(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getProgressIcon(status: string) {
  switch (status) {
    case "accepted":
      return <CheckCircle2 className="size-5 text-green-600" />;
    case "rejected":
      return <AlertCircle className="size-5 text-red-600" />;
    case "pending":
      return <Clock className="size-5 text-amber-600" />;
    default:
      return <Clock className="size-5 text-muted-foreground" />;
  }
}

function getProgressColor(status: string) {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-900";
    case "rejected":
      return "bg-red-100 text-red-900";
    case "pending":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ApplicantJobPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<"extract" | "analyze">(
    "extract",
  );
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedStep, setSelectedStep] = useState<RecruitmentStep | null>(
    null,
  );
  const [stepSheetOpen, setStepSheetOpen] = useState(false);

  const { data: job, isLoading: jobLoading } = useQuery<JobFull>({
    queryKey: ["job-applicant", jobId],
    queryFn: () =>
      fetch(`/api/jobs/${jobId}`).then((r) => {
        if (!r.ok) throw new Error("Job not found");
        return r.json();
      }),
    enabled: !!jobId,
  });

  const { data: application, isLoading: appLoading } =
    useQuery<ApplicationForApplicant | null>({
      queryKey: ["application", jobId, currentUser?.user?.id],
      queryFn: async () => {
        const res = await fetch("/api/applications");
        if (!res.ok) return null;
        const apps = (await res.json()) as ApplicationForApplicant[];
        // Find the application for this specific job
        return apps.find((app) => app.job_id === jobId) || null;
      },
      enabled: !!jobId && !!currentUser?.user?.id,
    });

  // Auto-trigger analysis when extraction completes
  React.useEffect(() => {
    if (
      extractedContent &&
      application &&
      !analysisResult &&
      !analyzeCvMutation.isPending &&
      analysisStep === "analyze"
    ) {
      const cvReviewStep = job?.recruitment_steps?.find(
        (s) => s.step_type === "CV review",
      );
      if (cvReviewStep) {
        analyzeCvMutation.mutate({
          pdfContent: extractedContent,
          stepId: cvReviewStep.id,
          applicationId: application.id,
        });
      }
    }
  }, [extractedContent, analysisStep]);

  // Extract PDF content mutation
  const extractPdfMutation = useMutation({
    mutationFn: async ({ file, stepId }: { file: File; stepId: string }) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/applications/extract-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract PDF");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Store the extracted content
      setExtractedContent(data.content);
      setUploadingStepId(null);
      // Move to step 2 after successful extraction
      setAnalysisStep("analyze");
      toast.success("PDF extracted successfully");
    },
    onError: (error) => {
      setUploadingStepId(null);
      toast.error(error.message || "Failed to extract PDF");
    },
  });

  // Analyze CV mutation
  const analyzeCvMutation = useMutation({
    mutationFn: async ({
      pdfContent,
      stepId,
      applicationId,
    }: {
      pdfContent: string;
      stepId: string;
      applicationId: string;
    }) => {
      const res = await fetch(`/api/applications/${applicationId}/analyze-cv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfContent,
          stepId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to analyze CV");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Store the analysis result
      setAnalysisResult(data.analysis);
      // Refetch application data to show updated progress
      queryClient.invalidateQueries({ queryKey: ["application", jobId] });
      toast.success("CV analyzed successfully!");
    },
    onError: (error) => {
      // Keep the extracted content even if analysis fails
      toast.error(error.message || "Failed to analyze CV");
    },
  });

  const handleCvUpload = (stepId: string) => {
    setUploadingStepId(stepId);
    fileInputRef.current?.click();
  };

  const handleAnalyzeCv = (stepId: string) => {
    if (!extractedContent || !application) return;

    analyzeCvMutation.mutate({
      pdfContent: extractedContent,
      stepId,
      applicationId: application.id,
    });
  };

  const handleResetAnalysis = () => {
    setAnalysisStep("extract");
    setExtractedContent(null);
    setAnalysisResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingStepId) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      setUploadingStepId(null);
      return;
    }

    extractPdfMutation.mutate({
      file,
      stepId: uploadingStepId,
    });

    // Reset the input so the same file can be re-uploaded
    e.target.value = "";
  };

  const isLoading = jobLoading || appLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl w-full mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Job not found</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back</Link>
        </Button>
      </div>
    );
  }

  const hasSteps = job.recruitment_steps && job.recruitment_steps.length > 0;
  const isExtracting = extractPdfMutation.isPending;
  const isAnalyzing = analyzeCvMutation.isPending;

  return (
    <div className="space-y-8 max-w-5xl w-full mx-auto">
      {/* Hidden file input for CV uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ChevronLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Building2 className="size-4" />
                {job.company?.name}
              </div>
            </div>
            {application && (
              <Badge
                variant={
                  application.status === "rejected"
                    ? "destructive"
                    : application.status === "selected"
                      ? "default"
                      : "secondary"
                }
                className="capitalize"
              >
                {application.status}
              </Badge>
            )}
          </div>

          {/* Job Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {job.location && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="size-4" />
                  Location
                </div>
                <p className="font-medium text-sm">{job.location}</p>
              </div>
            )}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Briefcase className="size-4" />
                Type
              </div>
              <p className="font-medium text-sm">{capitalize(job.type)}</p>
            </div>
            {job.remote_status && (
              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm text-muted-foreground mb-1">Remote</div>
                <p className="font-medium text-sm">
                  {capitalize(job.remote_status)}
                </p>
              </div>
            )}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CalendarDays className="size-4" />
                Posted
              </div>
              <p className="font-medium text-sm">
                {formatDate(job.date_posted)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recruitment Steps */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Recruitment Steps</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasSteps
              ? `${job.recruitment_steps?.length} step${job.recruitment_steps?.length === 1 ? "" : "s"} to complete`
              : "No steps for this position"}
          </p>
        </div>

        {hasSteps ? (
          <div className="divide-y rounded-lg border">
            {job.recruitment_steps
              ?.sort((a, b) => a.step_order - b.step_order)
              .map((step) => {
                const stepProgress = application?.progress?.find(
                  (p) => p.step_id === step.id,
                );
                const stepLabel =
                  step.step_type === "Aptitude"
                    ? "Aptitude Test"
                    : step.step_type === "CV review"
                      ? "CV Review"
                      : "Virtual Interview";
                const StepIcon =
                  step.step_type === "CV review"
                    ? FileCheck
                    : step.step_type === "Aptitude"
                      ? BrainCircuit
                      : Video;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setSelectedStep(step);
                      setStepSheetOpen(true);
                    }}
                    className="flex items-center gap-4 w-full px-5 py-4 text-left hover:bg-muted/50 transition-colors group"
                  >
                    {/* Step number */}
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">
                      {step.step_order}
                    </div>

                    {/* Title & description */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{stepLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {step.starts && step.ends
                          ? `${formatDate(step.starts)} — ${formatDate(step.ends)}`
                          : step.starts
                            ? `Starts ${formatDate(step.starts)}`
                            : step.ends
                              ? `Ends ${formatDate(step.ends)}`
                              : "No dates set"}
                      </p>
                    </div>

                    {/* Status badge */}
                    {stepProgress ? (
                      <Badge
                        variant="outline"
                        className={`capitalize shrink-0 ${
                          stepProgress.status === "accepted"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20"
                            : stepProgress.status === "rejected"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {stepProgress.status === "pending"
                          ? "Submitted"
                          : stepProgress.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Not started
                      </span>
                    )}

                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No recruitment steps have been set up for this position yet.
            </p>
          </div>
        )}
      </div>

      {/* Step Detail Sheet */}
      <Sheet open={stepSheetOpen} onOpenChange={setStepSheetOpen}>
        <SheetContent className="flex flex-col sm:max-w-lg!">
          <SheetHeader className="border-b pb-4">
            <SheetTitle>
              {selectedStep?.step_type === "Aptitude"
                ? "Aptitude Test"
                : selectedStep?.step_type === "CV review"
                  ? "CV Review"
                  : "Virtual Interview"}
            </SheetTitle>
            <SheetDescription>
              Step {selectedStep?.step_order} of{" "}
              {job?.recruitment_steps?.length ?? 0}
            </SheetDescription>
          </SheetHeader>

          {selectedStep && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                {selectedStep.starts && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Start Date
                    </p>
                    <p className="text-sm font-medium">
                      {formatDate(selectedStep.starts)}
                    </p>
                  </div>
                )}
                {selectedStep.ends && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      End Date
                    </p>
                    <p className="text-sm font-medium">
                      {formatDate(selectedStep.ends)}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress status */}
              {(() => {
                const stepProgress = application?.progress?.find(
                  (p) => p.step_id === selectedStep.id,
                );

                if (stepProgress) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-lg border p-4 bg-muted/30">
                        {stepProgress.status === "accepted" ? (
                          <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                        ) : stepProgress.status === "rejected" ? (
                          <AlertCircle className="size-5 text-red-600 shrink-0" />
                        ) : (
                          <Clock className="size-5 text-amber-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {stepProgress.status === "pending"
                              ? "Submitted — Awaiting Review"
                              : stepProgress.status}
                          </p>
                          {stepProgress.score !== null &&
                            stepProgress.score !== undefined && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Score: {stepProgress.score}%
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Score bar */}
                      {stepProgress.score !== null &&
                        stepProgress.score !== undefined && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Score</span>
                              <span>{stepProgress.score}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  stepProgress.score >= 70
                                    ? "bg-green-500"
                                    : stepProgress.score >= 40
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${stepProgress.score}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                      {/* Review text */}
                      {stepProgress.review && (
                        <div className="rounded-lg border p-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Feedback
                          </p>
                          <p className="text-sm whitespace-pre-wrap">
                            {stepProgress.review}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // Not submitted yet — show actions
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
                      <Clock className="size-5 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        You haven&apos;t completed this step yet.
                      </p>
                    </div>

                    {/* CV Upload */}
                    {selectedStep.step_type === "CV review" && application ? (
                      <div className="space-y-4">
                        {!analysisResult ? (
                          <Button
                            className="w-full"
                            disabled={isExtracting || isAnalyzing}
                            onClick={() => handleCvUpload(selectedStep.id)}
                          >
                            {isExtracting || isAnalyzing ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload className="size-4" />
                                Submit Your CV
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="space-y-4">
                            {/* Analysis Results */}
                            <div className="space-y-3 rounded-lg border bg-blue-500/5 p-4">
                              <h4 className="font-semibold text-sm">
                                Analysis Results
                              </h4>

                              <div className="flex items-center gap-3">
                                <div className="text-3xl font-bold text-blue-600">
                                  {analysisResult.score}%
                                </div>
                                <div>
                                  <p className="text-sm font-medium capitalize">
                                    {analysisResult.status}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {analysisResult.review}
                                  </p>
                                </div>
                              </div>

                              {analysisResult.strengths &&
                                analysisResult.strengths.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">
                                      Strengths
                                    </p>
                                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                                      {analysisResult.strengths.map(
                                        (s: string, i: number) => (
                                          <li key={i}>{s}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {analysisResult.weaknesses &&
                                analysisResult.weaknesses.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">
                                      Areas for Improvement
                                    </p>
                                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                                      {analysisResult.weaknesses.map(
                                        (w: string, i: number) => (
                                          <li key={i}>{w}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {analysisResult.recommendation && (
                                <div>
                                  <p className="text-xs font-medium mb-1">
                                    Recommendation
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {analysisResult.recommendation}
                                  </p>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetAnalysis()}
                            >
                              Submit Again
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : selectedStep.step_type === "Interview" &&
                      application ? (
                      <Button asChild className="w-full">
                        <Link
                          href={`/jobs/${jobId}/interview?stepId=${selectedStep.id}`}
                        >
                          <Video className="size-4" />
                          Start Virtual Interview
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Waiting to start this step...
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Job context in sheet */}
              {job?.description && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    About the Role
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                    {job.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

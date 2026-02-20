"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import type { JobFull, ApplicationForApplicant } from "@/utils/types";

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
      <div className="space-y-6 max-w-4xl mx-auto">
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
          <Link href="/explore">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  const hasSteps = job.recruitment_steps && job.recruitment_steps.length > 0;
  const isExtracting = extractPdfMutation.isPending;
  const isAnalyzing = analyzeCvMutation.isPending;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
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
          <Link href="/explore" className="flex items-center gap-2">
            <ChevronLeft className="size-4" />
            Back to Jobs
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

      {/* Application Status */}
      {application && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Application Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Application Status
              </span>
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
            </div>
            {application.general_review && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-1">Review</p>
                <p className="text-sm text-muted-foreground">
                  {application.general_review}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="space-y-3">
            {job.recruitment_steps
              ?.sort((a, b) => a.step_order - b.step_order)
              .map((step, index) => {
                const stepProgress = application?.progress?.find(
                  (p) => p.step_id === step.id,
                );

                return (
                  <div
                    key={step.id}
                    className="rounded-lg border bg-card p-6 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number and Icon */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">
                          {step.step_order}
                        </div>
                      </div>

                      {/* Step Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">
                          {step.step_type === "Aptitude"
                            ? "Aptitude Test"
                            : step.step_type === "CV review"
                              ? "CV Review"
                              : "Virtual Interview"}
                        </h3>

                        {/* Dates */}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          {step.starts && (
                            <div>
                              <span className="font-medium">Starts:</span>{" "}
                              {formatDate(step.starts)}
                            </div>
                          )}
                          {step.ends && (
                            <div>
                              <span className="font-medium">Ends:</span>{" "}
                              {formatDate(step.ends)}
                            </div>
                          )}
                        </div>

                        {/* Progress Info */}
                        {stepProgress ? (
                          <div className="mt-4 space-y-3 pt-4 border-t">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="size-5 text-green-600" />
                              <span className="text-sm font-medium">
                                Submitted
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t">
                            {/* CV Upload for CV review steps */}
                            {step.step_type === "CV review" && application ? (
                              <div className="space-y-4">
                                {!analysisResult ? (
                                  <Button
                                    disabled={isExtracting || isAnalyzing}
                                    onClick={() => handleCvUpload(step.id)}
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
                                    <div className="space-y-3 bg-blue-50 p-4 rounded-lg border">
                                      <h4 className="font-semibold text-sm">
                                        Analysis Results
                                      </h4>

                                      <div className="flex items-center gap-3">
                                        <div className="text-3xl font-bold text-blue-600">
                                          {analysisResult.score}%
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium capitalize">
                                            Status: {analysisResult.status}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {analysisResult.review}
                                          </p>
                                        </div>
                                      </div>

                                      {analysisResult.strengths &&
                                        analysisResult.strengths.length >
                                          0 && (
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
                                        analysisResult.weaknesses.length >
                                          0 && (
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
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Waiting to start this step...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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

      {/* Job Description */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">About the Role</h2>
        <div className="rounded-lg border bg-card p-6">
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {job.description}
          </div>
        </div>
      </div>

      {/* Requirements */}
      {job.requirements && (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Requirements</h2>
          <div className="rounded-lg border bg-card p-6">
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {job.requirements}
            </div>
          </div>
        </div>
      )}

      {/* Benefits */}
      {job.benefits && (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Benefits</h2>
          <div className="rounded-lg border bg-card p-6">
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {job.benefits}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plus,
  Trash2,
  Edit,
  Copy,
  Share2,
} from "lucide-react";
import type {
  JobWithApplications,
  CreateRecruitmentStepInput,
} from "@/utils/types";

interface JobPageProps {
  params: Promise<{ id: string }>;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminJobPage({ params }: JobPageProps) {
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<"open" | "closed" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStepType, setSelectedStepType] = useState<
    "Aptitude" | "CV review" | "Interview"
  >("CV review");
  const [stepOrder, setStepOrder] = useState<number>(1);
  const [stepStartsDate, setStepStartsDate] = useState<string>("");
  const [stepEndsDate, setStepEndsDate] = useState<string>("");
  const [releaseResults, setReleaseResults] = useState<boolean>(false);
  const [editStepId, setEditStepId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "reject" | null
  >(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [interviewReviewSheetOpen, setInterviewReviewSheetOpen] =
    useState(false);
  const [interviewType, setInterviewType] = useState<
    "technical" | "behavioral" | "case-study"
  >("technical");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const [aptitudeType, setAptitudeType] = useState<
    "multiple-choice" | "coding" | "logical-reasoning"
  >("multiple-choice");
  const [generatedAptitudeContent, setGeneratedAptitudeContent] =
    useState<string>("");
  const [isGeneratingAptitude, setIsGeneratingAptitude] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    params.then((p) => setJobId(p.id));
  }, [params]);

  // Fetch job details with applications and steps
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      return (await res.json()) as JobWithApplications;
    },
    enabled: !!jobId,
  });

  const { mutate: addStep, isPending: stepAdding } = useMutation({
    mutationFn: async (
      stepData: Omit<CreateRecruitmentStepInput, "job_id">,
    ) => {
      if (!jobId) throw new Error("Job ID not found");
      const res = await fetch(`/api/jobs/${jobId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData),
      });
      if (!res.ok) throw new Error("Failed to add step");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Step added successfully");
      setSelectedStepType("CV review");
      setStepOrder((job?.recruitment_steps?.length ?? 0) + 1);
      setStepStartsDate("");
      setStepEndsDate("");
      setReleaseResults(false);
      setGeneratedContent("");
      setInterviewType("technical");
      setGeneratedAptitudeContent("");
      setAptitudeType("multiple-choice");
      setSheetOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Update job status
  const { mutate: updateStatus, isPending: statusUpdating } = useMutation({
    mutationFn: async (status: "open" | "closed") => {
      if (!jobId) throw new Error("Job ID not found");
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update job status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Job status updated successfully");
      setShowStatusDialog(false);
      setNewStatus(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Delete recruitment step
  const { mutate: deleteStep, isPending: stepDeleting } = useMutation({
    mutationFn: async (stepId: string) => {
      if (!jobId) throw new Error("Job ID not found");
      const res = await fetch(`/api/jobs/${jobId}/steps/${stepId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete step");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Step deleted successfully");
      setShowDeleteDialog(false);
      setDeleteStepId(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Update recruitment step
  const { mutate: updateStep, isPending: stepUpdating } = useMutation({
    mutationFn: async (stepData: {
      stepId: string;
      data: CreateRecruitmentStepInput;
    }) => {
      if (!jobId) throw new Error("Job ID not found");
      const res = await fetch(`/api/jobs/${jobId}/steps/${stepData.stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData.data),
      });
      if (!res.ok) throw new Error("Failed to update step");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Step updated successfully");
      setEditStepId(null);
      setEditSheetOpen(false);
      setSelectedStepType("CV review");
      setStepOrder(1);
      setStepStartsDate("");
      setStepEndsDate("");
      setReleaseResults(false);
      setGeneratedContent("");
      setInterviewType("technical");
      setGeneratedAptitudeContent("");
      setAptitudeType("multiple-choice");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Generate interview questions
  const { mutate: generateInterview } = useMutation({
    mutationFn: async () => {
      if (!job?.company?.name || !job?.title) {
        throw new Error("Missing required information");
      }
      setIsGeneratingInterview(true);

      // Build role details from job data
      const roleDetails = [
        job.title,
        job.description,
        job.requirements,
        job.experience_level && `Experience Level: ${job.experience_level}`,
        job.department && `Department: ${job.department}`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch(
        `/api/jobs/${jobId}/steps/${editStepId || "new"}/generate-interview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewType,
            companyName: job.company.name,
            role: job.title,
            roleDetails,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to generate interview questions");
      const data = await res.json();
      return data.content;
    },
    onSuccess: (content) => {
      setGeneratedContent(content);
      setIsGeneratingInterview(false);
      toast.success("Interview questions generated successfully!");
    },
    onError: (err) => {
      setIsGeneratingInterview(false);
      toast.error(err.message || "Failed to generate questions");
    },
  });

  // Generate aptitude questions
  const { mutate: generateAptitude } = useMutation({
    mutationFn: async () => {
      if (!job?.company?.name || !job?.title) {
        throw new Error("Missing required information");
      }
      setIsGeneratingAptitude(true);

      // Build role details from job data
      const roleDetails = [
        job.title,
        job.description,
        job.requirements,
        job.experience_level && `Experience Level: ${job.experience_level}`,
        job.department && `Department: ${job.department}`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch(
        `/api/jobs/${jobId}/steps/${editStepId || "new"}/generate-aptitude`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aptitudeType,
            companyName: job.company.name,
            role: job.title,
            roleDetails,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to generate aptitude questions");
      const data = await res.json();
      return data.content;
    },
    onSuccess: (content) => {
      setGeneratedAptitudeContent(content);
      setIsGeneratingAptitude(false);
      toast.success("Aptitude questions generated successfully!");
    },
    onError: (err) => {
      setIsGeneratingAptitude(false);
      toast.error(err.message || "Failed to generate questions");
    },
  });

  const { mutate: updateApplicationStatus, isPending: statusUpdatingApp } =
    useMutation({
      mutationFn: async (data: { status: "accepted" | "rejected" }) => {
        if (!selectedAppId || !selectedReview?.id)
          throw new Error("Missing required data");
        const res = await fetch(
          `/api/applications/${selectedAppId}/progress/${selectedReview.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: data.status }),
          },
        );
        if (!res.ok) throw new Error("Failed to update application status");
        return res.json();
      },
      onMutate: (variables) => {
        setPendingAction(variables.status === "accepted" ? "accept" : "reject");
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        toast.success(
          variables.status === "accepted"
            ? "Application accepted successfully"
            : "Application rejected successfully",
        );
        setReviewDialogOpen(false);
        setInterviewReviewSheetOpen(false);
        setSelectedReview(null);
        setSelectedAppId(null);
        setPendingAction(null);
      },
      onError: (err) => {
        toast.error(err.message);
        setPendingAction(null);
      },
    });

  if (jobLoading || !job) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/(protected)/companies"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Companies
        </Link>
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  const hasSteps = job.recruitment_steps && job.recruitment_steps.length > 0;
  const canOpen = hasSteps && job.status === "closed";
  const canClose = job.status === "open";

  const getStepTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Aptitude: "Aptitude Test",
      "CV review": "CV Review",
      Interview: "Virtual Interview",
    };
    return labels[type] || type;
  };

  const statusVariant = job.status === "open" ? "default" : "secondary";
  const appCount = job.applications?.length || 0;

  return (
    <div className="space-y-8 max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {job.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {job.company?.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={statusVariant}
            className="capitalize text-base px-3 py-1"
          >
            {capitalize(job.status)}
          </Badge>
        </div>
      </div>

      {/* Job Meta Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 px-6 rounded-lg border bg-muted/30">
        {job.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            <span>{job.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="size-4 text-muted-foreground" />
          <span>{capitalize(job.type)}</span>
        </div>
        {job.remote_status && (
          <div className="text-sm">{capitalize(job.remote_status)}</div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span>{formatDate(job.date_posted)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {canOpen && (
          <Button
            onClick={() => {
              setNewStatus("open");
              setShowStatusDialog(true);
            }}
          >
            Open Job for Applications
          </Button>
        )}
        {canClose && (
          <Button
            onClick={() => {
              setNewStatus("closed");
              setShowStatusDialog(true);
            }}
            variant="destructive"
          >
            Close Job
          </Button>
        )}
        {!canOpen && !canClose && (
          <p className="text-sm text-muted-foreground py-2">
            {job.status === "open"
              ? "✓ Job is open for applications"
              : "⚠ Add a step to open this job"}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => setShareOpen(true)}
          className="ml-auto md:ml-0"
        >
          <Share2 className="size-4 mr-2" />
          Share Job
        </Button>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          {job.recruitment_steps
            ?.sort((a, b) => a.step_order - b.step_order)
            .map((step) => (
              <TabsTrigger key={step.id} value={step.id}>
                {getStepTypeLabel(step.step_type)} (
                {job.applications?.filter((app) =>
                  app.progress?.some((p) => p.step_id === step.id),
                ).length || 0}
                )
              </TabsTrigger>
            ))}
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          {/* Current Steps */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Current Steps</h2>
              <p className="text-sm text-muted-foreground">
                {hasSteps
                  ? "Steps candidates will go through"
                  : "No steps added yet"}
              </p>
            </div>

            {hasSteps ? (
              <div className="space-y-3">
                {job.recruitment_steps
                  .sort((a, b) => a.step_order - b.step_order)
                  .map((step) => {
                    // Check if this step has any application progress
                    const hasApplicationProgress = job.applications?.some(
                      (app) => app.progress?.some((p) => p.step_id === step.id),
                    );

                    return (
                      <div
                        key={step.id}
                        className="flex items-start justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow"
                      >
                        <div className="space-y-2 flex-1">
                          <p className="font-semibold">
                            {step.step_order}.{" "}
                            {getStepTypeLabel(step.step_type)}
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Type: {step.step_type}</p>
                            {step.starts && (
                              <p>
                                Starts:{" "}
                                {new Date(step.starts).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            )}
                            {step.ends && (
                              <p>
                                Ends:{" "}
                                {new Date(step.ends).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline">
                            {step.release_results
                              ? "Results Released"
                              : "Results Hidden"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditStepId(step.id);
                              setSelectedStepType(
                                step.step_type as
                                  | "Aptitude"
                                  | "CV review"
                                  | "Interview",
                              );
                              setStepOrder(step.step_order);
                              setStepStartsDate(
                                step.starts
                                  ? new Date(step.starts)
                                      .toISOString()
                                      .slice(0, 16)
                                  : "",
                              );
                              setStepEndsDate(
                                step.ends
                                  ? new Date(step.ends)
                                      .toISOString()
                                      .slice(0, 16)
                                  : "",
                              );
                              setReleaseResults(step.release_results ?? false);
                              // Load existing content if it's an Interview step
                              if (step.step_type === "Interview") {
                                setGeneratedContent(step.content || "");
                                setInterviewType("technical");
                              } else if (step.step_type === "Aptitude") {
                                setGeneratedAptitudeContent(step.content || "");
                                setAptitudeType("multiple-choice");
                              }
                              setEditSheetOpen(true);
                            }}
                            disabled={false}
                            title="Edit this step"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteStepId(step.id);
                              setShowDeleteDialog(true);
                            }}
                            disabled={hasApplicationProgress || stepDeleting}
                            title={
                              hasApplicationProgress
                                ? "Cannot delete: applicants are using this step"
                                : "Delete this step"
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No recruitment steps added yet. Add your first step below.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add at least one step to open this job for applications.
                </p>
              </div>
            )}
          </div>

          {/* Add Step Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Add Recruitment Step</h2>
                <p className="text-sm text-muted-foreground">
                  Create new evaluation steps for candidates
                </p>
              </div>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button>
                    <Plus className="size-4 mr-2" />
                    Add Step
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col sm:max-w-lg!">
                  <SheetHeader className="border-b">
                    <SheetTitle>Add Recruitment Step</SheetTitle>
                    <SheetDescription>
                      Configure a new step in the recruitment process
                    </SheetDescription>
                  </SheetHeader>

                  <form
                    id="add-step-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addStep({
                        step_type: selectedStepType,
                        step_order: stepOrder,
                        starts: stepStartsDate || undefined,
                        ends: stepEndsDate || undefined,
                        release_results: releaseResults,
                        content:
                          selectedStepType === "Interview"
                            ? generatedContent || null
                            : selectedStepType === "Aptitude"
                              ? generatedAptitudeContent || null
                              : null,
                      } as Omit<CreateRecruitmentStepInput, "job_id">);
                    }}
                    className="flex-1 overflow-y-auto space-y-6 py-4 px-4 pr-1"
                  >
                    <div className="space-y-3">
                      <Label
                        htmlFor="step-type"
                        className="text-base font-semibold"
                      >
                        Step Type
                      </Label>
                      <Select
                        value={selectedStepType}
                        onValueChange={(value) =>
                          setSelectedStepType(
                            value as "Aptitude" | "CV review" | "Interview",
                          )
                        }
                      >
                        <SelectTrigger id="step-type">
                          <SelectValue placeholder="Select step type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CV review">CV Review</SelectItem>
                          <SelectItem value="Aptitude">
                            Aptitude Test
                          </SelectItem>
                          <SelectItem value="Interview">
                            Virtual Interview
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="step-order"
                        className="text-base font-semibold"
                      >
                        Step Order
                      </Label>
                      <Input
                        id="step-order"
                        type="number"
                        min="1"
                        value={stepOrder}
                        onChange={(e) =>
                          setStepOrder(parseInt(e.target.value) || 1)
                        }
                        className="text-sm"
                        placeholder="e.g., 1, 2, 3"
                      />
                      <p className="text-xs text-muted-foreground">
                        The position of this step in the recruitment process
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="step-starts"
                        className="text-base font-semibold"
                      >
                        Start Date
                      </Label>
                      <Input
                        id="step-starts"
                        type="datetime-local"
                        value={stepStartsDate}
                        onChange={(e) => setStepStartsDate(e.target.value)}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Optional</p>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="step-ends"
                        className="text-base font-semibold"
                      >
                        End Date
                      </Label>
                      <Input
                        id="step-ends"
                        type="datetime-local"
                        value={stepEndsDate}
                        onChange={(e) => setStepEndsDate(e.target.value)}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Optional</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                        <input
                          id="release-results"
                          type="checkbox"
                          checked={releaseResults}
                          onChange={(e) => setReleaseResults(e.target.checked)}
                          className="h-4 w-4 rounded border-input bg-background"
                        />
                        <label
                          htmlFor="release-results"
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          Release Results to Applicants
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        If enabled, candidates will see their results for this
                        step
                      </p>
                    </div>

                    {/* Interview Generation Section */}
                    {selectedStepType === "Interview" && (
                      <div className="space-y-4 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Generate Interview Questions
                        </p>

                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="interview-type" className="text-sm">
                              Interview Type
                            </Label>
                            <Select
                              value={interviewType}
                              onValueChange={(value) =>
                                setInterviewType(
                                  value as
                                    | "technical"
                                    | "behavioral"
                                    | "case-study",
                                )
                              }
                            >
                              <SelectTrigger
                                id="interview-type"
                                className="mt-2"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">
                                  Technical Interview
                                </SelectItem>
                                <SelectItem value="behavioral">
                                  Behavioral Interview
                                </SelectItem>
                                <SelectItem value="case-study">
                                  Case Study Interview
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={isGeneratingInterview}
                            onClick={() => generateInterview()}
                          >
                            {isGeneratingInterview
                              ? "Generating Questions..."
                              : "Generate Questions"}
                          </Button>

                          {generatedContent && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Generated Questions Preview:
                              </p>
                              <div className="p-3 rounded-md bg-background border text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">
                                {generatedContent}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Aptitude Generation Section */}
                    {selectedStepType === "Aptitude" && (
                      <div className="space-y-4 p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                          Generate Aptitude Questions
                        </p>

                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="aptitude-type" className="text-sm">
                              Aptitude Type
                            </Label>
                            <Select
                              value={aptitudeType}
                              onValueChange={(value) =>
                                setAptitudeType(
                                  value as
                                    | "multiple-choice"
                                    | "coding"
                                    | "logical-reasoning",
                                )
                              }
                            >
                              <SelectTrigger
                                id="aptitude-type"
                                className="mt-2"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple-choice">
                                  Multiple Choice
                                </SelectItem>
                                <SelectItem value="coding">
                                  Coding Problems
                                </SelectItem>
                                <SelectItem value="logical-reasoning">
                                  Logical Reasoning
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={isGeneratingAptitude}
                            onClick={() => generateAptitude()}
                          >
                            {isGeneratingAptitude
                              ? "Generating Questions..."
                              : "Generate Questions"}
                          </Button>

                          {generatedAptitudeContent && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Generated Questions Preview:
                              </p>
                              <div className="p-3 rounded-md bg-background border text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">
                                {generatedAptitudeContent}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </form>

                  <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSheetOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      form="add-step-form"
                      disabled={stepAdding}
                    >
                      {stepAdding ? "Adding..." : "Add Step"}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Edit Step Sheet */}
          <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
            <SheetContent className="flex flex-col sm:max-w-lg!">
              <SheetHeader className="border-b">
                <SheetTitle>Edit Recruitment Step</SheetTitle>
                <SheetDescription>
                  Update the step configuration
                </SheetDescription>
              </SheetHeader>

              <form
                id="edit-step-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editStepId || !jobId) return;
                  updateStep({
                    stepId: editStepId,
                    data: {
                      job_id: jobId,
                      step_type: selectedStepType,
                      step_order: stepOrder,
                      starts: stepStartsDate || undefined,
                      ends: stepEndsDate || undefined,
                      release_results: releaseResults,
                      content:
                        selectedStepType === "Interview"
                          ? generatedContent || null
                          : selectedStepType === "Aptitude"
                            ? generatedAptitudeContent || null
                            : null,
                    },
                  });
                }}
                className="flex-1 overflow-y-auto space-y-6 py-4 px-4 pr-1"
              >
                <div className="space-y-3">
                  <Label
                    htmlFor="edit-step-type"
                    className="text-base font-semibold"
                  >
                    Step Type
                  </Label>
                  <Select
                    value={selectedStepType}
                    onValueChange={(value) =>
                      setSelectedStepType(
                        value as "Aptitude" | "CV review" | "Interview",
                      )
                    }
                  >
                    <SelectTrigger id="edit-step-type">
                      <SelectValue placeholder="Select step type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CV review">CV Review</SelectItem>
                      <SelectItem value="Aptitude">Aptitude Test</SelectItem>
                      <SelectItem value="Interview">
                        Virtual Interview
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="edit-step-order"
                    className="text-base font-semibold"
                  >
                    Step Order
                  </Label>
                  <Input
                    id="edit-step-order"
                    type="number"
                    min="1"
                    value={stepOrder}
                    onChange={(e) =>
                      setStepOrder(parseInt(e.target.value) || 1)
                    }
                    className="text-sm"
                    placeholder="e.g., 1, 2, 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    The position of this step in the recruitment process
                  </p>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="edit-step-starts"
                    className="text-base font-semibold"
                  >
                    Start Date
                  </Label>
                  <Input
                    id="edit-step-starts"
                    type="datetime-local"
                    value={stepStartsDate}
                    onChange={(e) => setStepStartsDate(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Optional</p>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="edit-step-ends"
                    className="text-base font-semibold"
                  >
                    End Date
                  </Label>
                  <Input
                    id="edit-step-ends"
                    type="datetime-local"
                    value={stepEndsDate}
                    onChange={(e) => setStepEndsDate(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Optional</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                    <input
                      id="edit-release-results"
                      type="checkbox"
                      checked={releaseResults}
                      onChange={(e) => setReleaseResults(e.target.checked)}
                      className="h-4 w-4 rounded border-input bg-background"
                    />
                    <label
                      htmlFor="edit-release-results"
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      Release Results to Applicants
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If enabled, candidates will see their results for this step
                  </p>
                </div>

                {/* Interview Generation Section for Edit */}
                {selectedStepType === "Interview" && (
                  <div className="space-y-4 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Generate Interview Questions
                    </p>

                    <div className="space-y-3">
                      <div>
                        <Label
                          htmlFor="edit-interview-type"
                          className="text-sm"
                        >
                          Interview Type
                        </Label>
                        <Select
                          value={interviewType}
                          onValueChange={(value) =>
                            setInterviewType(
                              value as
                                | "technical"
                                | "behavioral"
                                | "case-study",
                            )
                          }
                        >
                          <SelectTrigger
                            id="edit-interview-type"
                            className="mt-2"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">
                              Technical Interview
                            </SelectItem>
                            <SelectItem value="behavioral">
                              Behavioral Interview
                            </SelectItem>
                            <SelectItem value="case-study">
                              Case Study Interview
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isGeneratingInterview}
                        onClick={() => generateInterview()}
                      >
                        {isGeneratingInterview
                          ? "Generating Questions..."
                          : "Generate Questions"}
                      </Button>

                      {generatedContent && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Generated Questions Preview:
                          </p>
                          <div className="p-3 rounded-md bg-background border text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">
                            {generatedContent}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Aptitude Generation Section for Edit */}
                {selectedStepType === "Aptitude" && (
                  <div className="space-y-4 p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      Generate Aptitude Questions
                    </p>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit-aptitude-type" className="text-sm">
                          Aptitude Type
                        </Label>
                        <Select
                          value={aptitudeType}
                          onValueChange={(value) =>
                            setAptitudeType(
                              value as
                                | "multiple-choice"
                                | "coding"
                                | "logical-reasoning",
                            )
                          }
                        >
                          <SelectTrigger
                            id="edit-aptitude-type"
                            className="mt-2"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple-choice">
                              Multiple Choice
                            </SelectItem>
                            <SelectItem value="coding">
                              Coding Problems
                            </SelectItem>
                            <SelectItem value="logical-reasoning">
                              Logical Reasoning
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isGeneratingAptitude}
                        onClick={() => generateAptitude()}
                      >
                        {isGeneratingAptitude
                          ? "Generating Questions..."
                          : "Generate Questions"}
                      </Button>

                      {generatedAptitudeContent && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Generated Questions Preview:
                          </p>
                          <div className="p-3 rounded-md bg-background border text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">
                            {generatedAptitudeContent}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>

              <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditSheetOpen(false);
                    setEditStepId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-step-form"
                  disabled={stepUpdating}
                >
                  {stepUpdating ? "Updating..." : "Update Step"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* Applicants Tab */}
        {job.recruitment_steps
          ?.sort((a, b) => a.step_order - b.step_order)
          .map((step) => {
            const applicantsForStep =
              job.applications?.filter((app) =>
                app.progress?.some((p) => p.step_id === step.id),
              ) || [];

            return (
              <TabsContent key={step.id} value={step.id} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {getStepTypeLabel(step.step_type)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {applicantsForStep.length}{" "}
                    {applicantsForStep.length === 1
                      ? "applicant"
                      : "applicants"}
                  </p>
                </div>

                {applicantsForStep.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No applicants in this step yet
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Email</TableHead>
                          <TableHead className="font-semibold">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold">Score</TableHead>
                          <TableHead className="font-semibold">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applicantsForStep.map((app) => {
                          const stepProgress = app.progress?.find(
                            (p) => p.step_id === step.id,
                          );

                          return (
                            <TableRow
                              key={app.id}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs font-medium">
                                      {getInitials(app.applicant?.name || "?")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {app.applicant?.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {app.applicant?.email}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    stepProgress?.status === "accepted"
                                      ? "default"
                                      : stepProgress?.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="capitalize"
                                >
                                  {stepProgress?.status || "pending"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {stepProgress?.score !== null &&
                                stepProgress?.score !== undefined ? (
                                  <span className="font-medium">
                                    {stepProgress.score}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReview(stepProgress);
                                    setSelectedAppId(app.id);
                                    if (step.step_type === "Interview") {
                                      setInterviewReviewSheetOpen(true);
                                    } else {
                                      setReviewDialogOpen(true);
                                    }
                                  }}
                                  disabled={!stepProgress}
                                >
                                  Review
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            );
          })}
      </Tabs>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "open"
                ? "Open Job for Applications?"
                : "Close Job?"}
            </DialogTitle>
            <DialogDescription>
              {newStatus === "open"
                ? "This job will be visible to applicants and they can submit applications."
                : "This job will no longer accept new applications."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setNewStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newStatus) updateStatus(newStatus);
              }}
              disabled={statusUpdating}
              variant={newStatus === "closed" ? "destructive" : "default"}
            >
              {statusUpdating ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recruitment Step?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The step will be permanently removed
              from the recruitment process.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteStepId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteStepId) deleteStep(deleteStepId);
              }}
              disabled={stepDeleting}
              variant="destructive"
            >
              {stepDeleting ? "Deleting..." : "Delete Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Job Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Job</DialogTitle>
            <DialogDescription>
              Copy the link below to share this job posting with candidates
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/j/${job.id}`}
              readOnly
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${typeof window !== "undefined" ? window.location.origin : ""}/shared/j/${job.id}`,
                );
                toast.success("Share link copied!");
                setShareOpen(false);
              }}
              className="shrink-0"
            >
              <Copy className="size-4 mr-1" />
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interview Review Sheet */}
      <Sheet
        open={interviewReviewSheetOpen}
        onOpenChange={setInterviewReviewSheetOpen}
      >
        <SheetContent className="flex flex-col sm:max-w-2xl!">
          <SheetHeader className="border-b">
            <SheetTitle>Interview Review</SheetTitle>
            <SheetDescription>
              AI analysis of the virtual interview
            </SheetDescription>
          </SheetHeader>

          {selectedReview && (
            <div className="flex-1 overflow-y-auto space-y-6 p-4">
              {/* Score */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className="text-4xl font-bold mt-1">
                    {selectedReview.score ?? "—"}%
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      selectedReview.status === "accepted"
                        ? "default"
                        : selectedReview.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize text-sm px-3 py-1"
                  >
                    {selectedReview.status || "pending"}
                  </Badge>
                </div>
              </div>

              {/* Score bar */}
              {selectedReview.score !== null &&
                selectedReview.score !== undefined && (
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-pink-500 via-orange-500 to-yellow-500 transition-all duration-700"
                      style={{ width: `${selectedReview.score}%` }}
                    />
                  </div>
                )}

              {/* Full AI review */}
              {selectedReview.review ? (
                <div className="rounded-lg border bg-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                    Detailed Analysis
                  </p>
                  <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:pb-1 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_li]:ml-2 [&_strong]:font-semibold [&_em]:italic">
                    <ReactMarkdown>{selectedReview.review}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No analysis available yet.
                </p>
              )}
            </div>
          )}

          <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => updateApplicationStatus({ status: "rejected" })}
              disabled={pendingAction !== null}
            >
              {pendingAction === "reject" ? "Rejecting..." : "Reject"}
            </Button>
            <Button
              onClick={() => updateApplicationStatus({ status: "accepted" })}
              disabled={pendingAction !== null}
            >
              {pendingAction === "accept" ? "Accepting..." : "Accept"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Review Details Sheet */}
      <Sheet open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <SheetContent className="flex flex-col sm:max-w-lg!">
          <SheetHeader className="border-b">
            <SheetTitle>Review Details</SheetTitle>
            <SheetDescription>
              Complete analysis and feedback for the candidate
            </SheetDescription>
          </SheetHeader>

          {selectedReview && (
            <div className="flex-1 overflow-y-auto space-y-6 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{selectedReview.score}%</p>
                </div>
                <div className="w-full h-5 rounded-sm bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-linear-to-r from-pink-500 via-orange-500 to-yellow-500"
                    style={{
                      width: `${selectedReview.score}%`,
                    }}
                  />
                </div>
              </div>

              {/* <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Badge
                    variant={
                      selectedReview.status === "passed"
                        ? "default"
                        : selectedReview.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {selectedReview.status}
                  </Badge>
                </div>
              </div> */}

              {selectedReview.review && (
                <div>
                  <div className="text-gray-950 dark:text-gray-300 text-sm  [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_li]:ml-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic">
                    <ReactMarkdown>{selectedReview.review}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                updateApplicationStatus({ status: "rejected" });
              }}
              disabled={pendingAction !== null}
            >
              {pendingAction === "reject" ? "Rejecting..." : "Reject"}
            </Button>
            <Button
              onClick={() => {
                updateApplicationStatus({ status: "accepted" });
              }}
              disabled={pendingAction !== null}
            >
              {pendingAction === "accept" ? "Accepting..." : "Accept"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

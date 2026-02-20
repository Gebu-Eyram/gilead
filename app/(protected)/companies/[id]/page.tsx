"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import type {
  CompanyWithMembers,
  CreateJobInput,
  ExperienceLevel,
  JobFull,
  JobStatus,
  JobType,
  RemoteStatus,
} from "@/utils/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const JOB_TYPES: JobType[] = [
  "full-time",
  "part-time",
  "internship",
  "contract",
];

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "entry",
  "mid",
  "senior",
  "lead",
  "executive",
];

const REMOTE_STATUSES: RemoteStatus[] = ["onsite", "remote", "hybrid"];

const STATUS_VARIANT: Record<
  JobStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "default",
  draft: "secondary",
  paused: "outline",
  closed: "destructive",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  open: "Open",
  draft: "Draft",
  paused: "Paused",
  closed: "Closed",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Create Job Sheet ────────────────────────────────────────────────────────

function CreateJobSheet({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateJobInput, "company_id">>({
    title: "",
    description: "",
    type: "full-time",
    remote_status: "onsite",
    salary_currency: "USD",
    openings: 1,
    requirements: undefined,
    benefits: undefined,
    department: undefined,
    location: undefined,
    salary_min: undefined,
    salary_max: undefined,
    experience_level: undefined,
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (data: CreateJobInput) => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", companyId] });
      toast.success("Job created successfully");
      setFormData({ title: "", description: "", type: "full-time" });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Job
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Create Job</SheetTitle>
          <SheetDescription>Add a new job posting to this company</SheetDescription>
        </SheetHeader>

        <form
          id="create-job-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutate({ ...formData, company_id: companyId });
          }}
          className="flex-1 overflow-y-auto space-y-8 py-4 px-4 pr-1"
        >
          <div className="space-y-3">
            <Label htmlFor="job-title" className="text-base font-semibold">
              Title
            </Label>
            <Input
              id="job-title"
              placeholder="e.g., Software Engineer"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="job-type" className="text-base font-semibold">
                Job Type
              </Label>
            </div>
            <Select
              value={formData.type}
              onValueChange={(v) =>
                setFormData({ ...formData, type: v as JobType })
              }
            >
              <SelectTrigger id="job-type" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="job-location" className="text-base font-semibold">
                Location
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="job-location"
              placeholder="e.g., San Francisco, CA"
              value={formData.location ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="job-remote" className="text-base font-semibold">
                Remote Status
              </Label>
            </div>
            <Select
              value={formData.remote_status ?? "onsite"}
              onValueChange={(v) =>
                setFormData({ ...formData, remote_status: v as RemoteStatus })
              }
            >
              <SelectTrigger id="job-remote" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMOTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="job-openings"
                className="text-base font-semibold"
              >
                Number of Openings
              </Label>
            </div>
            <Input
              id="job-openings"
              type="number"
              min={1}
              value={formData.openings ?? 1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  openings: parseInt(e.target.value, 10) || 1,
                })
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="job-experience"
                className="text-base font-semibold"
              >
                Experience Level
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Select
              value={formData.experience_level ?? ""}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  experience_level: (v || undefined) as ExperienceLevel | undefined,
                })
              }
            >
              <SelectTrigger id="job-experience" className="text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((e) => (
                  <SelectItem key={e} value={e} className="capitalize">
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="job-department" className="text-base font-semibold">
                Department
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="job-department"
              placeholder="e.g., Engineering"
              value={formData.department ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Salary Range</Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min salary"
                value={formData.salary_min ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_min: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Max salary"
                value={formData.salary_max ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_max: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="text-sm"
              />
            </div>
            <Select
              value={formData.salary_currency ?? "USD"}
              onValueChange={(v) =>
                setFormData({ ...formData, salary_currency: v })
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="job-description"
                className="text-base font-semibold"
              >
                Description
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <textarea
              id="job-description"
              placeholder="Describe the role & responsibilities…"
              value={formData.description ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="job-requirements"
                className="text-base font-semibold"
              >
                Requirements
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <textarea
              id="job-requirements"
              placeholder="Required skills, qualifications, experience…"
              value={formData.requirements ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="job-benefits"
                className="text-base font-semibold"
              >
                Benefits
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <textarea
              id="job-benefits"
              placeholder="Health insurance, 401k, remote work, flexible hours…"
              value={formData.benefits ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, benefits: e.target.value })
              }
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
        </form>

        <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-job-form"
            disabled={isPending}
          >
            {isPending ? "Creating..." : "Save Job"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobFull & { applications?: unknown[] } }) {
  const appCount = Array.isArray(job.applications)
    ? job.applications.length
    : null;

  const salaryStr =
    job.salary_min || job.salary_max
      ? `${job.salary_min ?? "?"}-${job.salary_max ?? "?"} ${job.salary_currency}`
      : null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group rounded-lg border bg-card p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
    >
      {/* Header: Title, Type, Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
            {job.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{job.type.replace("-", " ")}</span>
            {job.department && (
              <>
                <span>•</span>
                <span>{job.department}</span>
              </>
            )}
          </div>
        </div>
        <Badge
          variant={STATUS_VARIANT[job.status]}
          className="shrink-0 capitalize"
        >
          {STATUS_LABEL[job.status]}
        </Badge>
      </div>

      {/* Description preview */}
      {job.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </p>
      )}

      {/* Meta info: Location, Remote, Experience, Salary, Openings */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground py-2">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            {job.location}
          </span>
        )}
        {job.remote_status && (
          <span className="capitalize">{job.remote_status}</span>
        )}
        {job.experience_level && (
          <span className="capitalize">
            {job.experience_level.replace("_", " ")}
          </span>
        )}
        {salaryStr && <span>{salaryStr}</span>}
        {job.openings && job.openings > 0 && (
          <span>
            {job.openings} {job.openings === 1 ? "opening" : "openings"}
          </span>
        )}
      </div>

      {/* Footer: Posted date, Steps, Applicants, Navigation arrow */}
      <div className="flex items-center gap-3 mt-auto pt-2 border-t text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3.5" />
          {formatDate(job.date_posted)}
        </span>
        {job.recruitment_steps.length > 0 && (
          <span className="flex items-center gap-1">
            <Briefcase className="size-3.5" />
            {job.recruitment_steps.length}{" "}
            {job.recruitment_steps.length === 1 ? "step" : "steps"}
          </span>
        )}
        {appCount !== null && (
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {appCount}{" "}
            {appCount === 1 ? "applicant" : "applicants"}
          </span>
        )}
        <ChevronRight className="size-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const {
    data: company,
    isLoading: companyLoading,
    error: companyError,
  } = useQuery<CompanyWithMembers>({
    queryKey: ["company", companyId],
    queryFn: () =>
      fetch(`/api/companies/${companyId}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
    enabled: !!companyId,
  });

  const {
    data: jobs = [],
    isLoading: jobsLoading,
  } = useQuery<(JobFull & { applications?: unknown[] })[]>({
    queryKey: ["jobs", companyId],
    queryFn: () =>
      fetch(`/api/jobs?company_id=${companyId}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 2,
    enabled: !!companyId,
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (companyLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (companyError || !company) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          {companyError
            ? (companyError as Error).message
            : "Company not found."}
        </p>
      </div>
    );
  }

  const openJobs = jobs.filter((j) => j.status === "open").length;

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/companies" className="hover:text-foreground transition-colors">
            Companies
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{company.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
                <Building2 className="size-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {company.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  {company.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {company.location}
                    </span>
                  )}
                  {company.type && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3.5" />
                      {company.type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <CreateJobSheet companyId={companyId} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Total Jobs</p>
            <p className="text-2xl font-bold">{jobs.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Open Positions</p>
            <p className="text-2xl font-bold">{openJobs}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Team Members</p>
            <p className="text-2xl font-bold">
              {company.company_members?.length ?? 0}
            </p>
          </div>
        </div>

        {/* Jobs Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Jobs</h2>
            <span className="text-sm text-muted-foreground">
              {jobs.length} total
            </span>
          </div>

          {jobsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Briefcase className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-sm">No jobs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add the first job posting for this company.
              </p>
              <div className="mt-4">
                <CreateJobSheet companyId={companyId} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

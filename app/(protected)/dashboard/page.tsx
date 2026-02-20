"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CircleDot,
  FileCheck,
  BrainCircuit,
  Video,
} from "lucide-react";
import type {
  ApplicationForApplicant,
  UserProfile,
  JobFull,
} from "@/utils/types";

// ---------- helpers ----------

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getFirstName(name: string | undefined | null) {
  if (!name) return "there";
  return name.split(" ")[0];
}

function getInitials(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

function isLastMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return (
    d.getMonth() === lastMonth.getMonth() &&
    d.getFullYear() === lastMonth.getFullYear()
  );
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const statusColor: Record<string, string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  selected:
    "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  withdrawn:
    "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

const jobTypeLabel: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  internship: "Internship",
  contract: "Contract",
};

const stepTypeIcon: Record<string, React.ElementType> = {
  "CV review": FileCheck,
  Aptitude: BrainCircuit,
  Interview: Video,
};

const progressStatusStyle: Record<string, string> = {
  pending:
    "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  accepted:
    "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
};

// ---------- stat card ----------

function StatCard({
  label,
  value,
  icon: Icon,
  change,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  change: number;
  accent: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className={`rounded-lg p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        <div
          className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${
            isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {isPositive ? "Up" : "Down"} from last month
      </p>
    </div>
  );
}

// ---------- default dashboard ----------

function DefaultDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
      </div>
      <div className="bg-muted/50 min-h-screen flex-1 rounded-xl md:min-h-min" />
    </div>
  );
}

// ---------- applicant dashboard ----------

function ApplicantDashboard() {
  const { data: currentUser } = useCurrentUser();

  // Fetch user profile
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["user-profile", currentUser?.user?.id],
    queryFn: () =>
      fetch(`/api/users/${currentUser?.user?.id}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUser?.user?.id,
  });

  // Fetch applications
  const { data: applications = [], isLoading: appsLoading } = useQuery<
    ApplicationForApplicant[]
  >({
    queryKey: ["applicant-applications", currentUser?.user?.id],
    queryFn: () => fetch("/api/applications").then((r) => r.json()),
    staleTime: 1000 * 60 * 2,
    enabled: !!currentUser?.user?.id,
  });

  // Fetch open jobs count
  const { data: openJobs = [] } = useQuery<JobFull[]>({
    queryKey: ["open-jobs"],
    queryFn: () => fetch("/api/jobs?status=open").then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
  });

  // Only current user's applications
  const userApplications = useMemo(
    () => applications.filter((app) => app.user_id === currentUser?.user?.id),
    [applications, currentUser?.user?.id],
  );

  // Stats
  const stats = useMemo(() => {
    const thisMonthApps = userApplications.filter((a) =>
      isThisMonth(a.created_at),
    );
    const lastMonthApps = userApplications.filter((a) =>
      isLastMonth(a.created_at),
    );

    const pending = userApplications.filter(
      (a) => a.status === "pending",
    ).length;
    const selected = userApplications.filter(
      (a) => a.status === "selected",
    ).length;
    const rejected = userApplications.filter(
      (a) => a.status === "rejected",
    ).length;

    const pendingThisMonth = thisMonthApps.filter(
      (a) => a.status === "pending",
    ).length;
    const pendingLastMonth = lastMonthApps.filter(
      (a) => a.status === "pending",
    ).length;

    const selectedThisMonth = thisMonthApps.filter(
      (a) => a.status === "selected",
    ).length;
    const selectedLastMonth = lastMonthApps.filter(
      (a) => a.status === "selected",
    ).length;

    return {
      totalApps: userApplications.length,
      appChange: pctChange(thisMonthApps.length, lastMonthApps.length),
      pending,
      pendingChange: pctChange(pendingThisMonth, pendingLastMonth),
      selected,
      selectedChange: pctChange(selectedThisMonth, selectedLastMonth),
      rejected,
      openJobs: openJobs.length,
    };
  }, [userApplications, openJobs]);

  const displayName =
    userProfile?.name ??
    currentUser?.user?.user_metadata?.full_name ??
    currentUser?.user?.email;

  if (appsLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="space-y-1">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col  max-w-6xl w-full mx-auto gap-6 p-4 pt-0">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hello, {getFirstName(displayName)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(new Date())}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={stats.totalApps}
          icon={FileText}
          change={stats.appChange}
          accent="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          change={stats.pendingChange}
          accent="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Selected"
          value={stats.selected}
          icon={CheckCircle2}
          change={stats.selectedChange}
          accent="bg-green-500/15 text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Open Jobs"
          value={stats.openJobs}
          icon={Briefcase}
          change={0}
          accent="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Applications Table */}
      <div className="bg-card border rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">My Applications</h2>
          <span className="text-xs text-muted-foreground">
            {userApplications.length} total
          </span>
        </div>

        {userApplications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Briefcase className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No applications yet</p>
            <p className="text-sm mt-1">Start exploring open positions!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="pr-5 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {userApplications.map((app) => {
                return (
                  <TableRow key={app.id} className="group">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {getInitials(app.job?.company?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-55">
                            {app.job?.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-55">
                            {app.job?.company?.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusColor[app.status] ?? ""}`}
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {jobTypeLabel[app.job?.type] ?? app.job?.type ?? "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {app.progress && app.progress.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {app.progress
                            .sort(
                              (a, b) =>
                                (a.recruitment_step?.step_order ?? 0) -
                                (b.recruitment_step?.step_order ?? 0),
                            )
                            .map((p) => {
                              const StepIcon =
                                stepTypeIcon[p.recruitment_step?.step_type] ??
                                CircleDot;
                              return (
                                <div
                                  key={p.id}
                                  title={`${p.recruitment_step?.step_type ?? "Step"} — ${p.status}`}
                                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${progressStatusStyle[p.status] ?? progressStatusStyle.pending}`}
                                >
                                  <StepIcon className="h-3 w-3" />
                                  <span className="hidden sm:inline">
                                    {p.recruitment_step?.step_type ?? "Step"}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No steps yet
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Link
                        href={`/jobs/${app.job_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ---------- page ----------

export default function Page() {
  const { data: currentUser } = useCurrentUser();

  return currentUser?.role === "applicant" ? (
    <ApplicantDashboard />
  ) : (
    <DefaultDashboard />
  );
}

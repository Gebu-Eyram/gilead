

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  location: string | null;
  type: string | null;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  type: JobType;
  status: JobStatus;
  company_id: string;
  date_posted: string;
  date_closed: string | null;
}

export interface RecruitmentStep {
  id: string;
  job_id: string;
  step_type: StepType;
  step_order: number;
  starts: string | null;
  ends: string | null;
  release_results: boolean;
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  status: ApplicationStatus;
  general_review: string | null;
  created_at: string;
}

export interface ApplicationProgress {
  id: string;
  application_id: string;
  user_id: string;
  step_id: string;
  status: ProgressStatus;
  score: number | null;
  review: string | null;
  created_at: string;
}

// ============================================
// JOINED / EXPANDED TYPES
// (what you actually get back from queries)
// ============================================

// Full user profile
export interface UserProfile extends User {
  company_memberships?: CompanyMemberWithCompany[];
}

// Company with its members
export interface CompanyWithMembers extends Company {
  company_members: CompanyMemberWithUser[];
}

export interface CompanyMemberWithUser extends CompanyMember {
  user: User;
}

export interface CompanyMemberWithCompany extends CompanyMember {
  company: Company;
}

// Job with its company and steps
export interface JobWithCompany extends Job {
  company: Company;
}

export interface JobWithSteps extends Job {
  recruitment_steps: RecruitmentStep[];
}

export interface JobFull extends Job {
  company: Company;
  recruitment_steps: RecruitmentStep[];
}

// Application as seen by the applicant
// includes the job, and their progress through each step
export interface ApplicationForApplicant extends Application {
  job: JobWithCompany;
  progress: ApplicationProgressWithStep[];
}

// Application as seen by the recruiter
// includes the applicant's profile and their progress
export interface ApplicationForRecruiter extends Application {
  applicant: User;
  progress: ApplicationProgressWithStep[];
}

// Application progress with the step details attached
export interface ApplicationProgressWithStep extends ApplicationProgress {
  recruitment_step: RecruitmentStep;
}

// Full job view for recruiter:
// job info + all applications + each applicant's progress
export interface JobWithApplications extends JobFull {
  applications: ApplicationForRecruiter[];
}

// ============================================
// FORM / INPUT TYPES
// (used when creating or updating records)
// ============================================

export interface SignUpInput {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  linkedin_url?: string;
}

export interface UpdateUserInput {
  name?: string;
  avatar_url?: string;
  linkedin_url?: string;
}

export interface CreateCompanyInput {
  name: string;
  location?: string;
  type?: string;
}

export interface CreateJobInput {
  title: string;
  description?: string;
  type: JobType;
  company_id: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  type?: JobType;
  status?: JobStatus;
  date_closed?: string;
}

export interface CreateRecruitmentStepInput {
  job_id: string;
  step_type: StepType;
  step_order: number;
  starts?: string;
  ends?: string;
  release_results?: boolean;
}

export interface CreateApplicationInput {
  job_id: string;
  user_id: string;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  general_review?: string;
}

export interface UpdateApplicationProgressInput {
  status?: ProgressStatus;
  score?: number;
  review?: string;
}

// ============================================
// NEW / UPDATED BASE TYPES
// ============================================

export type UserRole = "applicant" | "admin" | "superadmin";

export type JobStatus = "open" | "closed" | "draft" | "paused";

export type JobType = "full-time" | "part-time" | "internship" | "contract";

export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";

export type RemoteStatus = "onsite" | "remote" | "hybrid";

export type ApplicationStatus =
  | "pending"
  | "selected"
  | "rejected"
  | "withdrawn";

export type ProgressStatus = "pending" | "passed" | "failed" | "withdrawn";

export type StepType = "CV review" | "Aptitude" | "Interview";

// ============================================
// UPDATED JOB TABLE TYPE
// ============================================

export interface Job {
  id: string;
  title: string;
  description: string | null;
  type: JobType;
  status: JobStatus;
  company_id: string;
  date_posted: string;
  date_closed: string | null;

  // new fields
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  experience_level: ExperienceLevel | null;
  openings: number;
  location: string | null;
  benefits: string | null;
  remote_status: RemoteStatus;
  department: string | null;
}

// Salary as a clean nested object for UI use
export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
}

// ============================================
// UPDATED JOINED TYPES
// ============================================

export interface JobWithCompany extends Job {
  company: Company;
}

export interface JobWithSteps extends Job {
  recruitment_steps: RecruitmentStep[];
}

export interface JobFull extends Job {
  company: Company;
  recruitment_steps: RecruitmentStep[];
}

export interface JobWithApplications extends JobFull {
  applications: ApplicationForRecruiter[];
}

// ============================================
// UPDATED FORM / INPUT TYPES
// ============================================

export interface CreateJobInput {
  title: string;
  description?: string;
  type: JobType;
  company_id: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  experience_level?: ExperienceLevel;
  openings?: number;
  location?: string;
  benefits?: string;
  remote_status?: RemoteStatus;
  department?: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  type?: JobType;
  status?: JobStatus;
  date_closed?: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  experience_level?: ExperienceLevel;
  openings?: number;
  location?: string;
  benefits?: string;
  remote_status?: RemoteStatus;
  department?: string;
}

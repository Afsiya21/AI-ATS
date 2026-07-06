import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { api, type AuthUser } from "@/lib/api";
import { RequireAuth } from "@/lib/require-auth";
import emptyStateImage from "@/assets/empty_state_recruiter.png";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI-ATS" },
      { name: "description", content: "Your recruitment or job application overview." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return <RequireAuth>{(user) => <DashboardInner user={user} />}</RequireAuth>;
}

function DashboardInner({ user }: { user: AuthUser }) {
  const isRecruiter = user.role === "recruiter";
  const navigate = useNavigate();

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, <span className="text-gradient-primary">{user.name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your {isRecruiter ? "recruitment" : "job application"} overview
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/jobs" })}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 md:self-auto"
        >
          {isRecruiter ? <><Plus size={16} /> Post New Job</> : <><Search size={16} /> Explore Jobs</>}
        </button>
      </header>

      {isRecruiter ? <RecruiterStats /> : <CandidateStats user={user} />}

      <div className={cn("grid gap-6", isRecruiter ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
        <section className="surface-card p-5">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {isRecruiter ? "Recent Applicants" : "Recent Opportunities"}
            </h2>
            <button
              onClick={() => navigate({ to: isRecruiter ? "/applications" : "/jobs" })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all <ChevronRight size={14} />
            </button>
          </header>
          {isRecruiter ? <RecruiterApplicationsList /> : <DashboardJobsList />}
        </section>

        {isRecruiter && (
          <section className="surface-card p-5">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">My Recent Job Postings</h2>
              <button
                onClick={() => navigate({ to: "/jobs" })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View jobs <ChevronRight size={14} />
              </button>
            </header>
            <RecruiterJobsList />
          </section>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

interface RecruiterStatsState {
  jobs: number;
  applicants: number;
  hired: number;
}

function RecruiterStats() {
  const [stats, setStats] = useState<RecruiterStatsState>({ jobs: 0, applicants: 0, hired: 0 });

  useEffect(() => {
    const run = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          api.get("/jobs/my"),
          api.get("/applications"),
        ]);
        const jobs = jobsRes.data.data ?? [];
        const apps = appsRes.data.data ?? [];
        setStats({
          jobs: jobs.length,
          applicants: apps.length,
          hired: apps.filter((a: { status: string }) => a.status === "Selected" || a.status === "Offer").length,
        });
      } catch {
        // backend offline — keep zeros
      }
    };
    run();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard tone="primary" icon={<Briefcase size={18} />} value={stats.jobs} label="Active Jobs" />
      <StatCard tone="info" icon={<Users size={18} />} value={stats.applicants} label="Total Applicants" />
      <StatCard tone="success" icon={<CheckCircle size={18} />} value={stats.hired} label="Hired" />
    </div>
  );
}

function StatCard({
  tone,
  icon,
  value,
  label,
}: {
  tone: "primary" | "info" | "success";
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  const tones = {
    primary: "bg-primary/15 text-primary",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
  } as const;

  return (
    <div className="surface-card flex items-center gap-4 p-5">
      <div className={cn("grid h-12 w-12 place-items-center rounded-xl", tones[tone])}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

interface ApplicationLite {
  _id: string;
  status: string;
  matchScore?: number;
  matchBreakdown?: { skillMetrics?: { matched?: string[]; missing?: string[] } };
  missingSkills?: string[];
  job?: { _id?: string; title?: string; company?: string; skillsRequired?: string[]; skills?: string[] };
}

function CandidateStats({ user }: { user: AuthUser }) {
  const [applications, setApplications] = useState<ApplicationLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/applications");
        setApplications(res.data.data ?? []);
      } catch {
        // backend offline
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return <div className="surface-card h-48 animate-pulse" />;
  }

  if (applications.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-2 p-12 text-center">
        <Clock className="text-muted-foreground" size={36} />
        <p className="text-sm text-muted-foreground">
          No active applications found yet — start by exploring jobs.
        </p>
      </div>
    );
  }

  const total = applications.length;
  const stats = {
    Applied: applications.filter((a) => a.status === "Applied").length,
    Interview: applications.filter((a) => a.status === "Interview").length,
    Selected: applications.filter((a) => a.status === "Selected").length,
    Rejected: applications.filter((a) => a.status === "Rejected").length,
  };

  const avgScore = Math.round(
    applications.reduce((acc, app) => acc + (app.matchScore ?? 0), 0) / total
  );

  const allMatches: string[] = [];
  const allMissing: string[] = [];
  applications.forEach((app) => {
    if (app.matchBreakdown?.skillMetrics) {
      allMatches.push(...(app.matchBreakdown.skillMetrics.matched ?? []));
      allMissing.push(...(app.matchBreakdown.skillMetrics.missing ?? []));
    } else {
      const jobSkills = app.job?.skillsRequired ?? app.job?.skills ?? [];
      const missing = app.missingSkills ?? [];
      allMatches.push(...jobSkills.filter((s: string) => !missing.includes(s)));
      allMissing.push(...missing);
    }
  });

  if (allMatches.length === 0) {
    allMatches.push(...(user.skills ?? []), "Communication", "Problem Solving");
  }
  if (allMissing.length === 0) {
    allMissing.push("System Design", "Cloud Deployment", "Leadership");
  }

  const counts = (arr: string[]) =>
    arr.reduce<Record<string, number>>((acc, s) => {
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});

  const topMatches = Object.entries(counts(allMatches))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topMissing = Object.entries(counts(allMissing))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="primary" icon={<Activity size={18} />} value={`${avgScore}%`} label="Avg. match score" />
        <StatCard tone="info" icon={<FileText size={18} />} value={total} label="Total applications" />
        <StatCard tone="success" icon={<Award size={18} />} value={topMatches.length} label="Strong skills" />
      </div>

      <section className="surface-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity size={14} className="text-primary" /> Pipeline distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(stats).map(([status, count]) => {
            const pct = total ? Math.round((count / total) * 100) : 0;
            const colors: Record<string, string> = {
              Applied: "bg-info",
              Interview: "bg-warning",
              Selected: "bg-success",
              Rejected: "bg-destructive",
            };
            return (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{status}</span>
                  <span className="font-semibold">{count} • {pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full transition-all", colors[status])} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <SkillCard title="Proficiency strongholds" icon={<ThumbsUp size={14} className="text-success" />} entries={topMatches} positive />
        <SkillCard title="Recurring gaps" icon={<ThumbsDown size={14} className="text-destructive" />} entries={topMissing} positive={false} />
      </div>
    </div>
  );
}

function SkillCard({
  title,
  icon,
  entries,
  positive,
}: {
  title: string;
  icon: React.ReactNode;
  entries: [string, number][];
  positive: boolean;
}) {
  const max = Math.max(1, ...entries.map(([, c]) => c));
  return (
    <section className="surface-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h3>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          entries.map(([skill, count]) => {
            const pct = (count / max) * 100;
            return (
              <div key={skill}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{skill}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn("h-full rounded-full", positive ? "bg-primary" : "bg-destructive/80")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

interface JobLite {
  _id: string;
  title: string;
  company: string;
  createdAt?: string;
}

function DashboardJobsList() {
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/jobs")
      .then((res) => setJobs((res.data.data ?? []).slice(0, 5)))
      .catch(() => undefined);
  }, []);

  if (jobs.length === 0)
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">No jobs found yet.</p>;

  return (
    <ul className="divide-y divide-border">
      {jobs.map((job) => (
        <li key={job._id}>
          <button
            onClick={() => navigate({ to: "/jobs" })}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-surface-2/60"
          >
            <div>
              <p className="text-sm font-semibold">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.company}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

interface ApplicationListItem {
  _id: string;
  status: string;
  matchScore?: number;
  candidate?: { name?: string };
  job?: { title?: string };
}

function RecruiterApplicationsList() {
  const [apps, setApps] = useState<ApplicationListItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/applications")
      .then((res) => setApps((res.data.data ?? []).slice(0, 5)))
      .catch(() => undefined);
  }, []);

  if (apps.length === 0)
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No new applications yet. Post a job to attract talent.
      </p>
    );

  return (
    <ul className="divide-y divide-border">
      {apps.map((app) => (
        <li key={app._id}>
          <button
            onClick={() => navigate({ to: "/applications" })}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-surface-2/60"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{app.candidate?.name ?? "Anonymous"}</p>
                <StatusPill status={app.status} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {app.job?.title ?? "Job"} • AI Match: {app.matchScore ?? 0}%
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function RecruiterJobsList() {
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/jobs/my")
      .then((res) => setJobs((res.data.data ?? []).slice(0, 5)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-32 animate-pulse rounded-lg bg-surface-2/60" />;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
        <img src={emptyStateImage} alt="" className="h-32 w-auto opacity-90" />
        <h3 className="text-base font-semibold">No jobs posted yet</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Start by creating your first job posting to attract the best talent.
        </p>
        <button
          onClick={() => navigate({ to: "/jobs" })}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          <Plus size={14} /> Post your first job
        </button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {jobs.map((job) => (
        <li key={job._id}>
          <button
            onClick={() => navigate({ to: "/jobs" })}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-surface-2/60"
          >
            <div>
              <p className="text-sm font-semibold">{job.title}</p>
              <p className="text-xs text-muted-foreground">
                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Applied: "bg-info/15 text-info",
    Shortlisted: "bg-chart-5/15 text-chart-5",
    Interview: "bg-warning/15 text-warning",
    Selected: "bg-success/15 text-success",
    Rejected: "bg-destructive/15 text-destructive",
  };
  const cls = map[status] ?? "bg-surface-3 text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", cls)}>
      {status}
    </span>
  );
}

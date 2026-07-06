import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Briefcase,
  CheckCircle,
  DollarSign,
  Mail,
  MapPin,
  Plus,
  Search,
  UploadCloud,
  User as UserIcon,
  X,
} from "lucide-react";
import { api, type AuthUser } from "@/lib/api";
import { RequireAuth } from "@/lib/require-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — AI-ATS" },
      { name: "description", content: "Browse and apply to jobs, or manage your postings." },
    ],
  }),
  component: JobsRoute,
});

function JobsRoute() {
  return <RequireAuth>{(user) => <JobsPage user={user} />}</RequireAuth>;
}

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  skills?: string[];
  salary?: string;
  type?: string;
  deadline?: string;
}

function JobsPage({ user }: { user: AuthUser }) {
  const isRecruiter = user.role === "recruiter";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeApplyJob, setActiveApplyJob] = useState<Job | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const url = isRecruiter ? "/jobs/my" : "/jobs";
      const res = await api.get(url);
      setJobs(res.data.data ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplied = async () => {
    if (isRecruiter) return;
    try {
      const res = await api.get("/applications");
      const ids: string[] = (res.data.data ?? [])
        .filter((a: { job?: { _id?: string } | string }) => a.job)
        .map((a: { job: { _id?: string } | string }) =>
          typeof a.job === "string" ? a.job : a.job._id ?? ""
        )
        .filter(Boolean);
      setAppliedJobs(new Set(ids));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchApplied();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.title, j.company, ...(j.skills ?? [])]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [jobs, search]);

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRecruiter ? "My Job Postings" : "Open Roles"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRecruiter
              ? "Manage your active openings and review incoming candidates."
              : "Find your next career move powered by AI matching."}
          </p>
        </div>
        {isRecruiter && (
          <button
            onClick={() => setShowPostModal(true)}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Plus size={16} /> Post a Job
          </button>
        )}
      </header>

      <div className="surface-card flex items-center gap-3 px-4 py-2.5">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, company, or skill..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
          <Briefcase size={32} />
          <p className="text-sm">No jobs match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              user={user}
              isApplied={appliedJobs.has(job._id)}
              onApply={() => setActiveApplyJob(job)}
            />
          ))}
        </div>
      )}

      {showPostModal && (
        <PostJobModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            setShowPostModal(false);
            setSuccessMsg("Job posted successfully.");
            fetchJobs();
          }}
        />
      )}

      {activeApplyJob && (
        <ApplyModal
          job={activeApplyJob}
          user={user}
          isApplied={appliedJobs.has(activeApplyJob._id)}
          onClose={() => setActiveApplyJob(null)}
          onSuccess={() => {
            setActiveApplyJob(null);
            setSuccessMsg(`Application submitted to ${activeApplyJob.company}.`);
            fetchApplied();
          }}
        />
      )}

      {successMsg && (
        <SuccessDialog message={successMsg} onClose={() => setSuccessMsg(null)} />
      )}
    </div>
  );
}

/* ─────────────── Job Card ─────────────── */

function JobCard({
  job,
  user,
  isApplied,
  onApply,
}: {
  job: Job;
  user: AuthUser;
  isApplied: boolean;
  onApply: () => void;
}) {
  const navigate = useNavigate();
  return (
    <article className="surface-card flex flex-col p-5 transition hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-elevated">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-tight">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
        </div>
        {isApplied ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
            <CheckCircle size={10} /> Applied
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {job.type ?? "Full-time"}
          </span>
        )}
      </header>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
        <span className="inline-flex items-center gap-1"><DollarSign size={12} /> {job.salary || "Competitive"}</span>
      </div>

      {job.skills && job.skills.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((s) => (
            <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {s}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              +{job.skills.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-2">
        {user.role === "candidate" ? (
          <button
            onClick={() => !isApplied && onApply()}
            disabled={isApplied}
            className={cn(
              "inline-flex w-full items-center justify-center rounded-lg py-2 text-sm font-semibold transition",
              isApplied
                ? "bg-surface-3 text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:brightness-110"
            )}
          >
            {isApplied ? "Already Applied" : "Apply Now"}
          </button>
        ) : (
          <button
            onClick={() => navigate({ to: "/applications", search: { jobId: job._id } })}
            className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface-2/60 py-2 text-sm font-semibold transition hover:bg-surface-2"
          >
            View Applicants
          </button>
        )}
      </div>
    </article>
  );
}

/* ─────────────── Apply Modal ─────────────── */

function ApplyModal({
  job,
  user,
  isApplied,
  onClose,
  onSuccess,
}: {
  job: Job;
  user: AuthUser;
  isApplied: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("resume", file);
    setUploading(true);
    setError("");
    try {
      await api.post(`/ai/apply/${job._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Error applying. Please check your connection.");
      setUploading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Apply for {job.title}</h2>
          <p className="text-sm text-muted-foreground">
            {job.company} • {job.location}
          </p>
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-2"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {isApplied && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle size={14} /> You have already applied for this position.
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface-2/40 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirm your details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <UserIcon size={14} className="text-muted-foreground" /> {user.name}
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" /> {user.email}
            </div>
          </div>
        </div>

        {uploading ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <h3 className="text-sm font-semibold">AI is analyzing your resume…</h3>
            <p className="text-xs text-muted-foreground">Matching your skills with the job requirements.</p>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/40 p-8 text-center transition hover:border-primary/50 hover:bg-primary/5">
            <UploadCloud size={28} className="text-primary" />
            <h3 className="text-sm font-semibold">Upload your resume</h3>
            <p className="text-xs text-muted-foreground">PDF only • Max 5MB</p>
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          </label>
        )}

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          disabled={uploading}
          className="rounded-lg border border-border bg-surface-2/60 px-4 py-2 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ─────────────── Post Job Modal ─────────────── */

function PostJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    salary: "",
    deadline: "",
    description: "",
    skills: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const skills = form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post("/jobs", { ...form, skills });
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Validation failed. Check all required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose} wide>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Post a New Job</h2>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-2"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Job title" value={form.title} onChange={(v) => update("title", v)} required />
          <Input label="Company" value={form.company} onChange={(v) => update("company", v)} required />
          <Input label="Location" value={form.location} onChange={(v) => update("location", v)} required />
          <Input label="Salary range" value={form.salary} onChange={(v) => update("salary", v)} />
          <Input label="Application deadline" type="date" value={form.deadline} onChange={(v) => update("deadline", v)} required />
          <Input label="Required skills (comma-separated)" value={form.skills} onChange={(v) => update("skills", v)} />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Job description
          </span>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={5}
            required
            className="w-full rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:bg-surface-2/70"
            placeholder="Responsibilities, requirements, perks…"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface-2/60 px-4 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Posting..." : "Post Job"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ─────────────── Helpers ─────────────── */

function ModalOverlay({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <button
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        className={cn(
          "surface-card relative z-10 w-full max-h-[90vh] overflow-y-auto p-6 slide-up",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:bg-surface-2/70"
      />
    </label>
  );
}

function SuccessDialog({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-xl font-bold">All set!</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <button
          onClick={onClose}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Continue
        </button>
      </div>
    </ModalOverlay>
  );
}

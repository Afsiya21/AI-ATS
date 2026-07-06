import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { api, API_BASE_URL, type AuthUser } from "@/lib/api";
import { RequireAuth } from "@/lib/require-auth";
import { cn } from "@/lib/utils";
import { StatusPill } from "./dashboard";

export const Route = createFileRoute("/applications")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Applications — AI-ATS" },
      { name: "description", content: "Recruiter applicant tracking dashboard with AI scoring and resume analysis." },
    ],
  }),
  component: ApplicationsRoute,
});

function ApplicationsRoute() {
  return <RequireAuth>{(user) => <ApplicationsPage user={user} />}</RequireAuth>;
}

/* ──────────────────────────────────────────────────────────────────── */

const STATUSES = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"] as const;
type StatusName = (typeof STATUSES)[number];

interface Application {
  _id: string;
  status: StatusName | string;
  matchScore?: number;
  isScanned?: boolean;
  resume?: string;
  recruiterNotes?: string;
  createdAt: string;
  candidate?: {
    _id?: string;
    name?: string;
    email?: string;
    skills?: string[];
  };
  candidateProfile?: {
    phone?: string;
    location?: string;
    skills?: string[];
    education?: { degree: string; institution: string }[];
    experience?: { role: string; company: string; duration: string }[];
  };
  job?: { _id?: string; title?: string; company?: string; skillsRequired?: string[]; skills?: string[] };
  matchBreakdown?: {
    skills?: number;
    structure?: number;
    content?: number;
    skillMetrics?: { matched?: string[]; missing?: string[] };
  };
  missingSkills?: string[];
  interview?: unknown;
  interviewDetails?: unknown;
}

function ApplicationsPage({ user }: { user: AuthUser }) {
  const isRecruiter = user.role === "recruiter";
  const navigate = useNavigate();
  const search = useSearch({ from: Route.id });
  const jobIdFilter = search.jobId;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusName | "All">("All");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [query, setQuery] = useState("");

  const fetchApps = async () => {
    setLoading(true);
    try {
      const url = jobIdFilter ? `/applications?jobId=${jobIdFilter}` : "/applications";
      const res = await api.get(url);
      const list: Application[] = res.data.data ?? [];
      setApplications(list);
      setSelectedId((id) => (id && list.some((a) => a._id === id) ? id : list[0]?._id ?? null));
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [jobIdFilter]);

  const updateApplication = async (appId: string, updates: Partial<Application>) => {
    try {
      const res = await api.put(`/applications/${appId}/status`, updates);
      const updated: Application = res.data.data;
      setApplications((apps) => apps.map((a) => (a._id === appId ? { ...a, ...updated } : a)));
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      alert("Update failed: " + (e.response?.data?.error ?? "Connection error"));
    }
  };

  const handleATSCheck = async (appId: string) => {
    try {
      const res = await api.post(`/ai/scan-single/${appId}`, {});
      const updated: Application = res.data.data;
      setApplications((apps) => apps.map((a) => (a._id === appId ? updated : a)));
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      alert("Scan failed: " + (e.response?.data?.error ?? "Server error"));
    }
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: applications.length };
    STATUSES.forEach((s) => (map[s] = 0));
    applications.forEach((a) => {
      map[a.status] = (map[a.status] ?? 0) + 1;
    });
    return map;
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter !== "All") list = list.filter((a) => a.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) =>
        [a.candidate?.name, a.candidate?.email, a.job?.title]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "score") return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [applications, statusFilter, sortBy, query]);

  const selected = applications.find((a) => a._id === selectedId) ?? null;

  /* ───────── candidate-side view ───────── */
  if (!isRecruiter) {
    return (
      <CandidateApplications
        applications={applications}
        loading={loading}
      />
    );
  }

  /* ───────── recruiter ATS dashboard ───────── */
  return (
    <div className="space-y-5 fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Applicant Tracking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobIdFilter ? "Filtered to a single job posting." : "All applicants across your jobs, ranked by AI match."}
            {jobIdFilter && (
              <button
                onClick={() => navigate({ to: "/applications" })}
                className="ml-2 text-primary hover:underline"
              >
                Clear filter
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PipelineSummary counts={counts} active={statusFilter} onPick={setStatusFilter} />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* LEFT: list */}
        <aside className="space-y-3">
          <div className="surface-card p-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-3 py-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search candidate, email, job..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Filter size={12} />
                <span>{filtered.length} candidates</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2/40 p-0.5 text-[11px]">
                {(["score", "date"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={cn(
                      "rounded px-2 py-1 font-medium capitalize transition",
                      sortBy === s ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s === "score" ? "AI Score" : "Newest"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
              <Users size={28} />
              <p className="text-sm">No candidates match.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((app) => (
                <li key={app._id}>
                  <CandidateListItem
                    app={app}
                    selected={app._id === selectedId}
                    onSelect={() => setSelectedId(app._id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* RIGHT: dossier */}
        <section className="min-h-[60vh]">
          {selected ? (
            <CandidateDossier
              key={selected._id}
              app={selected}
              onUpdate={updateApplication}
              onATSCheck={handleATSCheck}
            />
          ) : (
            <div className="surface-card flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-12 text-center text-muted-foreground">
              <Sparkles size={32} className="text-primary" />
              <p className="text-sm">Select a candidate to review their dossier.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ───────── Pipeline summary (status filter chips) ───────── */

function PipelineSummary({
  counts,
  active,
  onPick,
}: {
  counts: Record<string, number>;
  active: StatusName | "All";
  onPick: (s: StatusName | "All") => void;
}) {
  const items: { key: StatusName | "All"; label: string; tone: string }[] = [
    { key: "All", label: "All", tone: "text-foreground" },
    { key: "Applied", label: "Applied", tone: "text-info" },
    { key: "Shortlisted", label: "Shortlisted", tone: "text-chart-5" },
    { key: "Interview", label: "Interview", tone: "text-warning" },
    { key: "Selected", label: "Selected", tone: "text-success" },
    { key: "Rejected", label: "Rejected", tone: "text-destructive" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-2/40 p-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onPick(it.key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
            active === it.key
              ? "bg-surface-3 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current", it.tone)} />
          {it.label}
          <span className="ml-0.5 rounded-md bg-surface-3/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {counts[it.key] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────── List item ───────── */

function initials(name?: string) {
  if (!name) return "AC";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function scoreTone(score?: number) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function CandidateListItem({
  app,
  selected,
  onSelect,
}: {
  app: Application;
  selected: boolean;
  onSelect: () => void;
}) {
  const score = app.matchScore;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group block w-full rounded-xl border p-3 text-left transition",
        selected
          ? "border-primary/60 bg-primary/5 shadow-glow"
          : "border-border bg-card hover:border-primary/30 hover:bg-surface-2/60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-foreground">
          {initials(app.candidate?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{app.candidate?.name ?? "Anonymous"}</p>
            <StatusPill status={app.status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{app.job?.title ?? "—"}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className={cn("inline-flex items-center gap-1 font-semibold", scoreTone(score))}>
              <Activity size={12} />
              {app.isScanned ? `${score ?? 0}%` : "Pending"}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock size={11} /> {new Date(app.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ───────── Candidate dossier ───────── */

type DossierTab = "overview" | "resume" | "ats" | "notes";

function CandidateDossier({
  app,
  onUpdate,
  onATSCheck,
}: {
  app: Application;
  onUpdate: (id: string, updates: Partial<Application>) => void | Promise<void>;
  onATSCheck: (id: string) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<DossierTab>("overview");
  const [notes, setNotes] = useState(app.recruiterNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    setNotes(app.recruiterNotes ?? "");
    setShowRejectConfirm(false);
  }, [app._id, app.recruiterNotes]);

  const status = (app.status ?? "Applied") as StatusName;
  const canShortlist = status === "Applied";
  const canMoveToInterview = ["Applied", "Shortlisted"].includes(status);
  const canSelect = status === "Interview";
  const isTerminal = ["Selected", "Rejected"].includes(status);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onUpdate(app._id, { recruiterNotes: notes });
    setSavingNotes(false);
  };

  return (
    <div className="surface-card overflow-hidden">
      {/* Header bar */}
      <div className="border-b border-border p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-base font-bold text-primary-foreground">
              {initials(app.candidate?.name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold leading-tight">
                {app.candidate?.name ?? "Anonymous candidate"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Applied for <span className="text-foreground">{app.job?.title ?? "—"}</span>
                {app.job?.company ? <> · {app.job.company}</> : null}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {app.candidate?.email && (
                  <span className="inline-flex items-center gap-1"><Mail size={11} /> {app.candidate.email}</span>
                )}
                {app.candidateProfile?.location && (
                  <span className="inline-flex items-center gap-1"><MapPin size={11} /> {app.candidateProfile.location}</span>
                )}
                <span className="inline-flex items-center gap-1"><Clock size={11} /> Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                <span className="inline-flex items-center gap-1 font-mono"><FileText size={11} /> APP-{app._id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 sm:items-end">
            <StatusPill status={status} />
            <ScoreRing score={app.isScanned ? app.matchScore ?? 0 : null} compact />
          </div>
        </div>

        <Pipeline status={status} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
        {([
          { k: "overview", label: "Overview", icon: Briefcase },
          { k: "resume", label: "Resume", icon: FileText },
          { k: "ats", label: "ATS Analysis", icon: Activity },
          { k: "notes", label: "Notes", icon: MessageSquare },
        ] as { k: DossierTab; label: string; icon: typeof Briefcase }[]).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              tab === t.k
                ? "bg-surface-3 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
            )}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {tab === "overview" && <OverviewTab app={app} />}
          {tab === "resume" && <ResumeTab app={app} />}
          {tab === "ats" && <ATSTab app={app} onATSCheck={onATSCheck} />}
          {tab === "notes" && (
            <NotesTab
              notes={notes}
              setNotes={setNotes}
              saving={savingNotes}
              onSave={handleSaveNotes}
            />
          )}
        </div>

        {/* Action rail */}
        <aside className="space-y-3">
          <div className="surface-card border-primary/30 bg-primary/5 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Move forward
            </h4>
            <div className="space-y-2">
              <ActionButton
                disabled={!canShortlist || isTerminal}
                onClick={() => onUpdate(app._id, { status: "Shortlisted" })}
                icon={<ThumbsUp size={14} />}
                label="Shortlist"
                tone="info"
              />
              <ActionButton
                disabled={!canMoveToInterview || isTerminal}
                onClick={() => onUpdate(app._id, { status: "Interview" })}
                icon={<Calendar size={14} />}
                label="Move to Interview"
                tone="warning"
              />
              <ActionButton
                disabled={!canSelect || isTerminal}
                onClick={() => onUpdate(app._id, { status: "Selected" })}
                icon={<CheckCircle size={14} />}
                label="Select Candidate"
                tone="success"
                title={!canSelect ? "Move to interview first" : undefined}
              />
              <ActionButton
                disabled={isTerminal}
                onClick={() => setShowRejectConfirm(true)}
                icon={<ThumbsDown size={14} />}
                label="Reject"
                tone="destructive"
              />
            </div>

            {showRejectConfirm && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 text-destructive" />
                  <p>Reject this candidate? They'll be notified by email.</p>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="rounded-md bg-surface-3 px-2 py-1 text-[11px] font-medium hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onUpdate(app._id, { status: "Rejected" });
                      setShowRejectConfirm(false);
                    }}
                    className="rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground hover:brightness-110"
                  >
                    Yes, reject
                  </button>
                </div>
              </div>
            )}

            {isTerminal && (
              <div className={cn(
                "mt-3 rounded-lg border px-3 py-2 text-xs",
                status === "Selected"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              )}>
                {status === "Selected" ? "✓ Candidate has been selected." : "✗ Candidate has been rejected."}
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-2/60 p-2 text-[11px] text-muted-foreground">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>Status updates are saved instantly and the candidate is notified.</span>
            </div>
          </div>

          <div className="surface-card p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick scan
            </h4>
            <button
              onClick={() => onATSCheck(app._id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
            >
              <Zap size={12} /> {app.isScanned ? "Re-run ATS scan" : "Run ATS scan"}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Scores skills, structure and content against the job requirements.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ───────── Pipeline visual ───────── */

function Pipeline({ status }: { status: StatusName }) {
  const order: StatusName[] = ["Applied", "Shortlisted", "Interview", "Selected"];
  const isRejected = status === "Rejected";
  const idx = order.indexOf(status);

  return (
    <div className="mt-5">
      <div className="flex items-center gap-1.5">
        {order.map((s, i) => {
          const reached = !isRejected && i <= idx;
          const current = !isRejected && i === idx;
          return (
            <div key={s} className="flex flex-1 items-center gap-1.5">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold transition",
                  reached
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-surface-3 text-muted-foreground"
                )}
              >
                {reached && !current ? <CheckCircle size={12} /> : i + 1}
              </div>
              <div className="flex-1">
                <div
                  className={cn(
                    "h-1 rounded-full transition",
                    reached && i < order.length - 1 ? "bg-primary/60" : "bg-surface-3"
                  )}
                />
              </div>
            </div>
          );
        })}
        <div
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold transition",
            isRejected ? "bg-destructive text-destructive-foreground" : "bg-surface-3 text-muted-foreground/60"
          )}
          title="Rejected"
        >
          {isRejected ? <XCircle size={12} /> : <XCircle size={12} className="opacity-30" />}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        {[...order, "Reject"].map((s) => (
          <span
            key={s}
            className={cn(
              "flex-1 text-center",
              !isRejected && s === status && "text-primary font-semibold",
              isRejected && s === "Reject" && "text-destructive font-semibold"
            )}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Tab contents ───────── */

function OverviewTab({ app }: { app: Application }) {
  const profile = app.candidateProfile ?? {};
  const skills = app.candidate?.skills ?? profile.skills ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={<Briefcase size={14} />} label="Applied role" value={app.job?.title ?? "—"} />
        <InfoTile icon={<Mail size={14} />} label="Email" value={app.candidate?.email ?? "—"} />
        <InfoTile icon={<MapPin size={14} />} label="Location" value={profile.location ?? "—"} />
        <InfoTile icon={<Activity size={14} />} label="Phone" value={profile.phone ?? "—"} />
      </div>

      <Block title="Education" icon={<Award size={14} />}>
        {profile.education && profile.education.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {profile.education.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.degree}</span>
                <span className="text-muted-foreground"> · {e.institution}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not provided.</p>
        )}
      </Block>

      <Block title="Experience" icon={<Briefcase size={14} />}>
        {profile.experience && profile.experience.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {profile.experience.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.role}</span>
                <span className="text-muted-foreground"> at {e.company} · {e.duration}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not provided.</p>
        )}
      </Block>

      <Block title="Skills" icon={<Sparkles size={14} />}>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No skills on profile.</p>
        )}
      </Block>
    </div>
  );
}

function ResumeTab({ app }: { app: Application }) {
  const resumeUrl = app.resume ? `${API_BASE_URL}/${app.resume.replace(/\\/g, "/")}` : null;
  if (!resumeUrl) {
    return (
      <div className="surface-card flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
        <FileText size={28} />
        <p className="text-sm">This candidate hasn't uploaded a resume.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2/40">
      <div className="flex items-center justify-between border-b border-border bg-surface-3/60 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <FileText size={14} className="text-destructive" />
          {app.candidate?.name ?? "Candidate"}_Resume.pdf
        </div>
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2/60 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open in new tab <ExternalLink size={11} />
        </a>
      </div>
      <iframe
        src={`${resumeUrl}#view=FitH&toolbar=0`}
        title="Resume"
        className="h-[600px] w-full bg-white"
      />
    </div>
  );
}

function ATSTab({
  app,
  onATSCheck,
}: {
  app: Application;
  onATSCheck: (id: string) => void | Promise<void>;
}) {
  const score = app.matchScore ?? 0;
  const recommendation =
    !app.isScanned ? null : score >= 70 ? "Select" : score >= 40 ? "Interview" : "Reject";
  const recTone = !recommendation
    ? "text-muted-foreground"
    : recommendation === "Select"
    ? "text-success"
    : recommendation === "Interview"
    ? "text-warning"
    : "text-destructive";

  const matched = app.matchBreakdown?.skillMetrics?.matched ?? [];
  const missing = app.matchBreakdown?.skillMetrics?.missing ?? app.missingSkills ?? [];

  return (
    <div className="space-y-5">
      <div className="surface-card grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <ScoreRing score={app.isScanned ? score : null} />
        <div>
          <h3 className="text-base font-semibold">
            {app.isScanned ? (
              <>
                System recommendation: <span className={cn("font-bold", recTone)}>{recommendation}</span>
              </>
            ) : (
              "Resume not scanned yet"
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {app.isScanned
              ? score >= 70
                ? "Strong match. The candidate hits most of the role's key requirements."
                : score >= 40
                ? "Moderate match. A short interview will help validate fit."
                : "Low match. Skills likely don't align with this role."
              : "Run an ATS scan to compute the match score and breakdown."}
          </p>
          <button
            onClick={() => onATSCheck(app._id)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Zap size={12} /> {app.isScanned ? "Re-scan" : "Run ATS scan"}
          </button>
        </div>
      </div>

      {app.isScanned && app.matchBreakdown && (
        <div className="surface-card p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Score breakdown
          </h4>
          <div className="space-y-3">
            <Bar label="Skill match" value={app.matchBreakdown.skills ?? 0} max={70} tone="bg-info" />
            <Bar label="Structure" value={app.matchBreakdown.structure ?? 0} max={15} tone="bg-success" />
            <Bar label="Content" value={app.matchBreakdown.content ?? 0} max={15} tone="bg-warning" />
          </div>
        </div>
      )}

      {(matched.length > 0 || missing.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <SkillList title="Matched skills" tone="success" items={matched} icon={<ThumbsUp size={12} />} />
          <SkillList title="Missing skills" tone="destructive" items={missing} icon={<ThumbsDown size={12} />} />
        </div>
      )}
    </div>
  );
}

function NotesTab({
  notes,
  setNotes,
  saving,
  onSave,
}: {
  notes: string;
  setNotes: (s: string) => void;
  saving: boolean;
  onSave: () => void | Promise<void>;
}) {
  return (
    <div className="surface-card p-4">
      <textarea
        rows={12}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={onSave}
        placeholder="Add your private notes about this candidate. Auto-saves on blur."
        className="w-full resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:bg-surface-2/70"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{saving ? "Saving..." : "Notes save automatically when you leave the field."}</span>
        <button
          onClick={onSave}
          className="rounded-md bg-surface-3 px-2 py-1 font-semibold text-foreground hover:bg-surface-2"
        >
          Save now
        </button>
      </div>
    </div>
  );
}

/* ───────── Small primitives ───────── */

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-card flex items-start gap-3 p-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-3 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Block({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-4">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function ScoreRing({ score, compact }: { score: number | null; compact?: boolean }) {
  const size = compact ? 80 : 130;
  const stroke = compact ? 8 : 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const dashoffset = circumference - (value / 100) * circumference;

  const tone = score == null ? "text-muted-foreground" : value >= 70 ? "text-success" : value >= 40 ? "text-warning" : "text-destructive";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-surface-3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score == null ? circumference : dashoffset}
          className={cn("transition-all duration-700", tone)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={cn("font-bold leading-none", compact ? "text-lg" : "text-2xl", tone)}>
            {score == null ? "—" : `${value}%`}
          </div>
          <div className={cn("uppercase tracking-wide text-muted-foreground", compact ? "text-[9px] mt-0.5" : "text-[10px] mt-1")}>
            ATS score
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}/{max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SkillList({
  title,
  tone,
  items,
  icon,
}: {
  title: string;
  tone: "success" | "destructive";
  items: string[];
  icon: React.ReactNode;
}) {
  const cls = tone === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive";
  return (
    <div className="surface-card p-4">
      <h4 className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 24).map((s) => (
            <span key={s} className={cn("rounded-md px-2 py-0.5 text-xs font-medium", cls)}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  disabled,
  onClick,
  icon,
  label,
  tone,
  title,
}: {
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "info" | "warning" | "success" | "destructive";
  title?: string;
}) {
  const tones = {
    info: "bg-info/10 text-info hover:bg-info/20",
    warning: "bg-warning/10 text-warning hover:bg-warning/20",
    success: "bg-success/10 text-success hover:bg-success/20",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  } as const;
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
        disabled ? "bg-surface-3 text-muted-foreground/60 cursor-not-allowed" : tones[tone]
      )}
    >
      {icon} {label}
    </button>
  );
}

/* ───────── Candidate-side simple list ───────── */

function CandidateApplications({
  applications,
  loading,
}: {
  applications: Application[];
  loading: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-2/60" />
        ))}
      </div>
    );
  }
  if (applications.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
        <Clock size={32} />
        <p className="text-sm">You haven't applied to any jobs yet.</p>
      </div>
    );
  }
  const open = openId ? applications.find((a) => a._id === openId) : null;

  return (
    <div className="space-y-5 fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every job you've applied to and see your AI match.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {applications.map((app) => (
          <button
            key={app._id}
            onClick={() => setOpenId(app._id)}
            className="surface-card flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
          >
            <header className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold leading-tight">{app.job?.title ?? "—"}</h3>
                <p className="text-sm text-muted-foreground">{app.job?.company ?? ""}</p>
              </div>
              <StatusPill status={app.status} />
            </header>
            <div className="mt-auto flex items-center justify-between pt-3">
              <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", scoreTone(app.matchScore))}>
                <Activity size={12} /> {app.isScanned ? `${app.matchScore}% match` : "Pending scan"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock size={11} /> {new Date(app.createdAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <button aria-label="Close" className="absolute inset-0" onClick={() => setOpenId(null)} />
          <div className="surface-card relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 slide-up">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{open.job?.title}</h2>
                <p className="text-sm text-muted-foreground">{open.job?.company}</p>
              </div>
              <button
                onClick={() => setOpenId(null)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <ScoreRing score={open.isScanned ? open.matchScore ?? 0 : null} />
              <div>
                <StatusPill status={open.status} />
                <p className="mt-2 text-sm text-muted-foreground">
                  Applied {new Date(open.createdAt).toLocaleDateString()} · APP-{open._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
            {open.matchBreakdown && (
              <div className="mt-5 space-y-3">
                <Bar label="Skill match" value={open.matchBreakdown.skills ?? 0} max={70} tone="bg-info" />
                <Bar label="Structure" value={open.matchBreakdown.structure ?? 0} max={15} tone="bg-success" />
                <Bar label="Content" value={open.matchBreakdown.content ?? 0} max={15} tone="bg-warning" />
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setOpenId(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm font-medium hover:bg-surface-2"
              >
                Close <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

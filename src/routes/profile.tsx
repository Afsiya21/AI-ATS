import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  Book,
  Briefcase,
  Globe,
  Link as LinkIcon,
  Plus,
  Save,
  User as UserIcon,
  X,
} from "lucide-react";
import { api, type AuthUser } from "@/lib/api";
import { RequireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AI-ATS" },
      { name: "description", content: "Build the professional profile recruiters see." },
    ],
  }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return <RequireAuth>{(user) => <ProfileEditor user={user} />}</RequireAuth>;
}

interface Project { title: string; description: string; link: string }
interface Certification { name: string; issuer: string; link?: string }
interface Education { degree: string; institution: string }
interface Experience { role: string; company: string; duration: string }

interface ProfileShape {
  summary: string;
  linkedIn: string;
  github: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
}

const empty: ProfileShape = {
  summary: "",
  linkedIn: "",
  github: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
};

function ProfileEditor({ user }: { user: AuthUser }) {
  const [profile, setProfile] = useState<ProfileShape>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/profile/me");
        if (res.data?.data) setProfile((p) => ({ ...p, ...res.data.data }));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/profile", profile);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s) return;
    if (profile.skills.includes(s)) return;
    setProfile({ ...profile, skills: [...profile.skills, s] });
    setSkillDraft("");
  };

  const removeSkill = (s: string) =>
    setProfile({ ...profile, skills: profile.skills.filter((x) => x !== s) });

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <header className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm capitalize text-muted-foreground">{user.role} profile</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-muted-foreground">Saved {savedAt}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section icon={<Book size={16} />} title="Professional summary">
            <textarea
              value={profile.summary}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              rows={5}
              placeholder="A concise elevator pitch recruiters will see first..."
              className="w-full rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:bg-surface-2/70"
            />
          </Section>

          <Section icon={<Briefcase size={16} />} title="Featured projects">
            <div className="space-y-3">
              {profile.projects.map((p, i) => (
                <RemovableCard key={i} onRemove={() => setProfile({ ...profile, projects: profile.projects.filter((_, idx) => idx !== i) })}>
                  <input
                    value={p.title}
                    onChange={(e) => updateList(setProfile, profile, "projects", i, { ...p, title: e.target.value })}
                    placeholder="Project title"
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                  />
                  <textarea
                    value={p.description}
                    onChange={(e) => updateList(setProfile, profile, "projects", i, { ...p, description: e.target.value })}
                    placeholder="What did you build?"
                    rows={2}
                    className="mt-2 w-full rounded-md bg-surface-3/60 px-2 py-1.5 text-xs outline-none"
                  />
                  <input
                    value={p.link}
                    onChange={(e) => updateList(setProfile, profile, "projects", i, { ...p, link: e.target.value })}
                    placeholder="Demo link / GitHub"
                    className="mt-2 w-full rounded-md bg-surface-3/60 px-2 py-1.5 text-xs outline-none"
                  />
                </RemovableCard>
              ))}
              <AddButton onClick={() => setProfile({ ...profile, projects: [...profile.projects, { title: "", description: "", link: "" }] })}>
                Add project
              </AddButton>
            </div>
          </Section>

          <Section icon={<Award size={16} />} title="Certifications">
            <div className="space-y-3">
              {profile.certifications.map((c, i) => (
                <RemovableCard key={i} onRemove={() => setProfile({ ...profile, certifications: profile.certifications.filter((_, idx) => idx !== i) })}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={c.name}
                      onChange={(e) => updateList(setProfile, profile, "certifications", i, { ...c, name: e.target.value })}
                      placeholder="Certificate name"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                    <input
                      value={c.issuer}
                      onChange={(e) => updateList(setProfile, profile, "certifications", i, { ...c, issuer: e.target.value })}
                      placeholder="Issuer"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </RemovableCard>
              ))}
              <AddButton onClick={() => setProfile({ ...profile, certifications: [...profile.certifications, { name: "", issuer: "" }] })}>
                Add certificate
              </AddButton>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={<UserIcon size={16} />} title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add the skills recruiters should see.</p>
              ) : (
                profile.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {s}
                    <button
                      onClick={() => removeSkill(s)}
                      className="rounded p-0.5 text-primary/70 hover:bg-primary/20 hover:text-primary"
                      aria-label={`Remove ${s}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill and press Enter"
                className="flex-1 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm outline-none transition focus:border-primary/60"
              />
              <button
                type="button"
                onClick={addSkill}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
              >
                Add
              </button>
            </div>
          </Section>

          <Section icon={<LinkIcon size={16} />} title="Social presence">
            <div className="space-y-3">
              <SocialInput
                icon={<LinkIcon size={14} />}
                value={profile.linkedIn}
                onChange={(v) => setProfile({ ...profile, linkedIn: v })}
                placeholder="linkedin.com/in/your-handle"
              />
              <SocialInput
                icon={<Globe size={14} />}
                value={profile.github}
                onChange={(v) => setProfile({ ...profile, github: v })}
                placeholder="github.com/your-handle"
              />
            </div>
          </Section>

          <Section title="Pro tip">
            <p className="text-xs leading-relaxed text-muted-foreground">
              The cleaner and more complete your profile, the higher your AI match score for jobs.
              Aim for at least 5 skills, one project, and a one-paragraph summary.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* helpers */

function updateList<K extends keyof ProfileShape>(
  setProfile: React.Dispatch<React.SetStateAction<ProfileShape>>,
  profile: ProfileShape,
  key: K,
  index: number,
  value: ProfileShape[K] extends Array<infer U> ? U : never
) {
  const list = [...(profile[key] as unknown as unknown[])];
  list[index] = value as unknown;
  setProfile({ ...profile, [key]: list } as ProfileShape);
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function RemovableCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative rounded-lg border border-border bg-surface-2/40 p-3 pr-9">
      {children}
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
        aria-label="Remove"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-2/30 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
    >
      <Plus size={12} /> {children}
    </button>
  );
}

function SocialInput({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <span className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2 transition focus-within:border-primary/60">
      <span className="text-muted-foreground">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none"
      />
    </span>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, Lock, User as UserIcon, ArrowRight, Sparkles } from "lucide-react";
import { api, type UserRole } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — AI-ATS" },
      { name: "description", content: "Sign up as a candidate or recruiter to get started with AI-ATS." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("candidate");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/auth/register", { name, email, password, role });
      login(res.data.user, res.data.token);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setError(e.response?.data?.error || e.response?.data?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="surface-card w-full max-w-md p-8 slide-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" className="mb-4 inline-flex items-center gap-2" aria-label="AI-ATS home">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-glow">
              <Sparkles size={20} strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-foreground">AI</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-gradient-primary">ATS</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Join AI-ATS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your intelligent recruitment journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {(["candidate", "recruiter"] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition",
                  role === r
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-surface-2/40 text-muted-foreground hover:bg-surface-2/70"
                )}
              >
                {r === "candidate" ? "I'm a candidate" : "I'm a recruiter"}
              </button>
            ))}
          </div>

          <FieldR label="Full name" icon={<UserIcon size={16} />}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Doe"
              className="w-full bg-transparent outline-none text-sm"
            />
          </FieldR>

          <FieldR label="Email address" icon={<Mail size={16} />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="w-full bg-transparent outline-none text-sm"
            />
          </FieldR>

          <FieldR label="Password" icon={<Lock size={16} />}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-transparent outline-none text-sm"
            />
          </FieldR>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create Account"}
            <ArrowRight size={14} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function FieldR({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 transition focus-within:border-primary/60 focus-within:bg-surface-2/70">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </span>
    </label>
  );
}

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  CheckCircle,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NotificationCenter } from "./NotificationCenter";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (path: string) => pathname === path;

  const onLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-6">
        <Link to="/" className="flex items-center gap-1 text-lg font-bold tracking-tight">
          <span className="text-foreground">AI</span>
          <span className="text-muted-foreground">-</span>
          <span className="text-gradient-primary">ATS</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} />
            <NavItem to="/jobs" icon={Briefcase} label="Jobs" active={isActive("/jobs")} />
            <NavItem
              to="/applications"
              icon={CheckCircle}
              label={user.role === "recruiter" ? "Hiring" : "My Jobs"}
              active={isActive("/applications")}
            />
            {user.role === "candidate" && (
              <NavItem to="/profile" icon={UserIcon} label="Profile" active={isActive("/profile")} />
            )}

            <div className="mx-2 hidden h-8 w-px bg-border md:block" />
            <NotificationCenter />
            <div className="ml-2 flex items-center gap-2 rounded-full border border-border bg-surface-2/60 py-1 pl-1 pr-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </span>
              <span className="hidden text-sm font-medium md:inline">{user.name}</span>
              <button
                type="button"
                onClick={onLogout}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </nav>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
      )}
    >
      <Icon size={16} />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

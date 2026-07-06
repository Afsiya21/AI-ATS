import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth";
import type { UserRole, AuthUser } from "./api";

interface RequireAuthProps {
  children: (user: AuthUser) => ReactNode;
  role?: UserRole;
}

export function RequireAuth({ children, role }: RequireAuthProps) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/login" });
    } else if (role && user.role !== role) {
      navigate({ to: "/dashboard" });
    }
  }, [ready, user, role, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (!user) return null;
  if (role && user.role !== role) return null;

  return <>{children(user)}</>;
}

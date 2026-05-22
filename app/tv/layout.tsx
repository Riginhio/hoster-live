import { AuthGuard } from "@/components/auth/AuthGuard";

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["tv"]}>{children}</AuthGuard>;
}

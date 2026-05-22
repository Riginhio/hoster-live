import { AuthGuard } from "@/components/auth/AuthGuard";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["master"]}>{children}</AuthGuard>;
}

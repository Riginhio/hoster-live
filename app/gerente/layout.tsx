import { AuthGuard } from "@/components/auth/AuthGuard";

export default function GerenteLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["gerente"]}>{children}</AuthGuard>;
}

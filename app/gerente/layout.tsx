import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Hoster Live - Gerente",
};

export default function GerenteLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["gerente"]}>{children}</AuthGuard>;
}

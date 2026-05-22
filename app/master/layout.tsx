import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Hoster Live - Master",
};

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["master"]}>{children}</AuthGuard>;
}

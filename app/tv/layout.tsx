import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Hoster Live - TV",
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["tv"]}>{children}</AuthGuard>;
}

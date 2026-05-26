import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hoster Live - TV",
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children;
}

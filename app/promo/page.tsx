import { Suspense } from "react";
import { PromoClient } from "./promo-client";

export default function PromoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian" />}>
      <PromoClient />
    </Suspense>
  );
}

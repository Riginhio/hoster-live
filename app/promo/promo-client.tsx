"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import {
  getActiveQrCampaignsForRestaurant,
  refreshQrCampaignsFromSupabase,
} from "@/lib/qr/qrCampaignStorage";
import type { QrCampaign } from "@/lib/types";

export function PromoClient() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId") ?? searchParams.get("restaurant") ?? "rancho-viejo";
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const [source, setSource] = useState("localStorage");
  const restaurant = useMemo(
    () => getRestaurants().find((item) => item.id === restaurantId) ?? getRestaurants()[0],
    [restaurantId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
      const result = await refreshQrCampaignsFromSupabase();

      if (!isMounted) {
        return;
      }

      setSource(result.source);
      setCampaigns(getActiveQrCampaignsForRestaurant(restaurant?.id ?? restaurantId, "printed_qr"));
    }

    void loadCampaigns();
    const intervalId = window.setInterval(loadCampaigns, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [restaurant?.id, restaurantId]);

  return (
    <main className="min-h-screen bg-obsidian px-4 py-8 text-bone">
      <section className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-12 w-12" textClassName="text-base" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mezcal">
              HOSTER LIVE
            </p>
            <h1 className="font-display text-4xl text-bone">{restaurant?.name ?? "Promociones"}</h1>
          </div>
        </div>

        {campaigns.length ? (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="overflow-hidden rounded-lg border border-mezcal/25 bg-charcoal/88">
                {campaign.bannerImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={campaign.bannerImageUrl} alt="" className="h-64 w-full object-cover" />
                ) : null}
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-mezcal">
                    {campaign.sponsorName || "Promocion activa"}
                  </p>
                  <h2 className="mt-3 font-display text-4xl text-bone">{campaign.title}</h2>
                  <p className="mt-3 text-base leading-7 text-bone/70">{campaign.message}</p>
                  {campaign.ctaLabel && campaign.ctaUrl ? (
                    <a
                      href={campaign.ctaUrl}
                      className="mt-5 inline-flex rounded-lg bg-mezcal px-4 py-3 text-sm font-black text-obsidian"
                    >
                      {campaign.ctaLabel}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-bone/10 bg-charcoal/88 p-6 text-center">
            <h2 className="font-display text-4xl text-bone">Por ahora no hay promociones activas.</h2>
            <p className="mt-3 text-sm text-bone/55">Vuelve a escanear este QR mas tarde.</p>
          </div>
        )}

        <p className="mt-5 text-center text-xs font-semibold text-bone/35">Fuente: {source}</p>
      </section>
    </main>
  );
}

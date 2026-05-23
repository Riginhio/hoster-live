"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";
import type { QrCampaign } from "@/lib/types";

export default function GerentePromocionesPage() {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const isPlay = currentUser?.venueRole === "play";

  useEffect(() => {
    if (currentUser?.restaurantId) {
      setCampaigns(getActiveQrCampaignsForRestaurant(currentUser.restaurantId));
    }
  }, [currentUser?.restaurantId]);

  return (
    <Layout title="Promociones" eyebrow="Gerente">
      {isPlay ? (
        <Card accent className="border-chile/35 bg-chile/10">
          <h2 className="font-display text-3xl text-bone">Acceso restringido</h2>
          <p className="mt-2 text-sm text-bone/60">
            Los usuarios Play no pueden editar promociones.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} accent>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mezcal">
                Promo activa
              </p>
              <h2 className="mt-2 font-display text-3xl text-bone">{campaign.title}</h2>
              <p className="mt-2 text-sm leading-6 text-bone/60">{campaign.message}</p>
              {campaign.ctaLabel ? (
                <p className="mt-4 text-sm font-semibold text-agave">{campaign.ctaLabel}</p>
              ) : null}
            </Card>
          ))}
          {campaigns.length === 0 ? (
            <Card>
              <h2 className="font-display text-3xl text-bone">Sin promociones activas</h2>
              <p className="mt-2 text-sm text-bone/60">
                Master puede configurar promos globales o del restaurante.
              </p>
            </Card>
          ) : null}
        </div>
      )}
    </Layout>
  );
}

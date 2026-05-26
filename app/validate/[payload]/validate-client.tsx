"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ExternalLink, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import {
  getBoardBatches,
  refreshBoardBatchesFromSupabase,
  type BoardBatch,
} from "@/lib/boards/boardBatchStorage";
import {
  getActiveQrCampaignsForRestaurant,
  refreshQrCampaignsFromSupabase,
} from "@/lib/qr/qrCampaignStorage";
import { decodeBoardValidationPayload, type BoardValidationPayload } from "@/lib/qr/qrPayload";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import type { QrCampaign, RestaurantConfig } from "@/lib/types";

type ValidateClientProps = {
  payload: string;
};

const defaultMessage =
  "Disfruta la experiencia Hoster Live. Conserva tu tabla hasta terminar la jugada.";

function isWithinBatchValidity(batch: BoardBatch | null) {
  if (!batch) {
    return false;
  }

  const now = new Date();
  const validFrom = batch.validFrom ? new Date(`${batch.validFrom}T00:00:00`) : null;
  const validTo = batch.validTo ? new Date(`${batch.validTo}T23:59:59`) : null;

  return (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
}

function resolveValidation(payload: BoardValidationPayload | null, batches = getBoardBatches()) {
  if (!payload) {
    return {
      batch: null,
      boardExists: false,
      isValid: false,
    };
  }

  const batch =
    batches.find(
      (item) => item.id === payload.batchId && item.restaurantId === payload.restaurantId,
    ) ?? null;
  const boardExists = Boolean(batch?.boards.some((board) => board.folio === payload.folio));
  const isValid = Boolean(batch && boardExists && batch.status === "active" && isWithinBatchValidity(batch));

  return {
    batch,
    boardExists,
    isValid,
  };
}

export function ValidateClient({ payload }: ValidateClientProps) {
  const decodedPayload = useMemo(() => decodeBoardValidationPayload(payload), [payload]);
  const [batch, setBatch] = useState<BoardBatch | null>(null);
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantConfig | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [boardExists, setBoardExists] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadValidation() {
      const [batchResult] = await Promise.all([
        refreshBoardBatchesFromSupabase(),
        refreshQrCampaignsFromSupabase(),
      ]);

      if (!isMounted) {
        return;
      }

      const validation = resolveValidation(decodedPayload, batchResult.batches);
      setBatch(validation.batch);
      setBoardExists(validation.boardExists);
      setIsValid(validation.isValid);
      setCampaigns(
        decodedPayload ? getActiveQrCampaignsForRestaurant(decodedPayload.restaurantId, "printed_qr") : [],
      );
      setRestaurant(decodedPayload ? getRestaurantById(decodedPayload.restaurantId) ?? null : null);
    }

    void loadValidation();
    return () => {
      isMounted = false;
    };
  }, [decodedPayload]);

  const restaurantName =
    restaurant?.name ?? batch?.restaurantName ?? decodedPayload?.restaurantName ?? "No disponible";
  const batchName = batch?.name ?? decodedPayload?.batchName ?? "No disponible";
  const statusText = isValid ? "Valida" : "Esta tabla ya no esta activa";

  return (
    <main className="screen-safe cantina-grid bg-obsidian px-4 py-6">
      <div className="mx-auto grid max-w-4xl gap-4">
        <section className="rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_0%,rgba(217,164,65,0.20),rgba(20,17,15,0.92)_44%,rgba(8,7,6,0.98)_100%)] p-5 text-center shadow-cantina">
          <BrandMark className="mx-auto h-16 w-16" textClassName="text-xl" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-mezcal">
            HOSTER LIVE
          </p>
          <h1 className="mt-2 font-display text-5xl text-bone">Tabla oficial</h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-bone/45">
            Hospitality Gaming Platform
          </p>
        </section>

        <Card className={isValid ? "border-agave/35 bg-agave/8" : "border-chile/35 bg-chile/8"}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-12 w-12 place-items-center rounded-lg border ${
                  isValid
                    ? "border-agave/35 bg-agave/12 text-agave"
                    : "border-chile/35 bg-chile/12 text-chile"
                }`}
              >
                {isValid ? <BadgeCheck size={26} /> : <ShieldAlert size={26} />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-bone/45">
                  Estado
                </p>
                <p className="font-display text-3xl text-bone">{statusText}</p>
              </div>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ring-1 ${
                isValid ? "bg-agave/16 text-agave ring-agave/35" : "bg-chile/16 text-chile ring-chile/35"
              }`}
            >
              {boardExists ? "Folio encontrado" : "Folio no encontrado"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ValidationItem label="Restaurante" value={restaurantName} />
            <ValidationItem label="Folio" value={decodedPayload?.folio ?? "No disponible"} />
            <ValidationItem label="Lote" value={batchName} />
            <ValidationItem
              label="Vigencia"
              value={
                batch ? `${batch.validFrom || "Sin inicio"} - ${batch.validTo || "Sin fin"}` : "No disponible"
              }
            />
          </div>
        </Card>

        {campaigns.length > 0 ? (
          <section className="grid gap-4">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </section>
        ) : (
          <Card accent className="overflow-hidden">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mezcal">
              Mensaje para tu mesa
            </p>
            <h2 className="mt-3 font-display text-4xl text-bone">
              {restaurant?.promoTitle ?? "Experiencia Hoster Live"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-bone/66">
              {restaurant?.promoSubtitle ?? defaultMessage}
            </p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-bone/42">
              Powered by Hoster Live
            </p>
          </Card>
        )}

        {restaurant ? (
          <Card className="bg-bone/[0.035]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mezcal">
              Redes del restaurante
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-bone/70">
              {restaurant.instagram ? <Link href={restaurant.instagram}>Instagram</Link> : null}
              {restaurant.facebook ? <Link href={restaurant.facebook}>Facebook</Link> : null}
              {restaurant.tiktok ? <Link href={restaurant.tiktok}>TikTok</Link> : null}
            </div>
          </Card>
        ) : null}

        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
          Powered by Hoster Live
        </p>
        <ButtonLink href="/login" variant="ghost" className="mx-auto">
          Acceso staff
        </ButtonLink>
      </div>
    </main>
  );
}

function CampaignCard({ campaign }: { campaign: QrCampaign }) {
  return (
    <Card accent className="overflow-hidden">
      {campaign.bannerImageUrl ? (
        <img
          src={campaign.bannerImageUrl}
          alt={campaign.title}
          className="-mx-5 -mt-5 mb-5 h-44 w-[calc(100%+2.5rem)] object-cover"
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-mezcal">
            Promocion activa
          </p>
          <h2 className="mt-3 font-display text-4xl text-bone">{campaign.title}</h2>
          <p className="mt-3 text-sm leading-6 text-bone/66">{campaign.message}</p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-bone/42">
            {campaign.sponsorName ? `Presentado por ${campaign.sponsorName}` : "Powered by Hoster Live"}
          </p>
        </div>
        {campaign.sponsorLogoUrl ? (
          <img
            src={campaign.sponsorLogoUrl}
            alt={campaign.sponsorName || "Sponsor"}
            className="h-20 max-w-36 rounded-lg border border-bone/10 bg-bone/8 object-contain p-2"
          />
        ) : null}
      </div>
      {campaign.ctaLabel && campaign.ctaUrl ? (
        <Link
          href={campaign.ctaUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-mezcal px-4 text-sm font-semibold text-obsidian shadow-glow transition hover:bg-[#f0b84d]"
        >
          {campaign.ctaLabel}
          <ExternalLink size={16} />
        </Link>
      ) : null}
    </Card>
  );
}

function ValidationItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bone/10 bg-obsidian/45 p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-bone/38">{label}</p>
      <p className="mt-2 font-semibold text-bone">{value}</p>
    </div>
  );
}

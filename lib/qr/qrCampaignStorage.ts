import type { QrCampaign } from "@/lib/types";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

export const qrCampaignsStorageKey = "hoster-live:qr-campaigns";

const defaultCampaign: QrCampaign = {
  id: "campaign-hoster-live-default",
  name: "Experiencia Hoster Live",
  active: true,
  channel: "printed_qr",
  title: "Tu tabla oficial esta registrada",
  message:
    "Disfruta la experiencia Hoster Live. Conserva tu tabla hasta terminar la jugada.",
  ctaLabel: "Seguir a Hoster Live",
  ctaUrl: "https://instagram.com/hosterlive",
  sponsorName: "HOSTER LIVE",
  sponsorLogoUrl: "",
  bannerImageUrl: "",
  validFrom: "2026-01-01",
  validTo: "2026-12-31",
  appliesToRestaurantIds: "all",
};

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `qr-campaign-${crypto.randomUUID()}`;
  }

  return `qr-campaign-${Date.now()}`;
}

function isNowWithinRange(campaign: QrCampaign) {
  const now = new Date();
  const validFrom = campaign.validFrom ? new Date(`${campaign.validFrom}T00:00:00`) : null;
  const validTo = campaign.validTo ? new Date(`${campaign.validTo}T23:59:59`) : null;

  return (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
}

function appliesToRestaurant(campaign: QrCampaign, restaurantId: string) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return (
    campaign.appliesToRestaurantIds === "all" ||
    campaign.appliesToRestaurantIds.includes(slug)
  );
}

function normalizeCampaign(campaign: Partial<QrCampaign>): QrCampaign {
  return {
    id: campaign.id ?? createId(),
    name: campaign.name ?? "Campana QR",
    active: campaign.active ?? true,
    channel:
      campaign.channel === "tv_standby" || campaign.channel === "general"
        ? campaign.channel
        : "printed_qr",
    title: campaign.title ?? defaultCampaign.title,
    message: campaign.message ?? defaultCampaign.message,
    ctaLabel: campaign.ctaLabel ?? "",
    ctaUrl: campaign.ctaUrl ?? "",
    sponsorName: campaign.sponsorName ?? "",
    sponsorLogoUrl: campaign.sponsorLogoUrl ?? "",
    bannerImageUrl: campaign.bannerImageUrl ?? "",
    validFrom: campaign.validFrom ?? "",
    validTo: campaign.validTo ?? "",
    appliesToRestaurantIds:
      campaign.appliesToRestaurantIds === "all" || !campaign.appliesToRestaurantIds
        ? "all"
        : campaign.appliesToRestaurantIds.map((restaurantId) =>
            getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId),
          ),
  };
}

export function getQrCampaigns(): QrCampaign[] {
  if (!hasLocalStorage()) {
    return [defaultCampaign];
  }

  const rawValue = window.localStorage.getItem(qrCampaignsStorageKey);

  if (!rawValue) {
    saveQrCampaigns([defaultCampaign]);
    return [defaultCampaign];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as QrCampaign[];
    const campaigns = Array.isArray(parsedValue)
      ? parsedValue.map(normalizeCampaign)
      : [defaultCampaign];

    saveQrCampaigns(campaigns);
    return campaigns;
  } catch {
    saveQrCampaigns([defaultCampaign]);
    return [defaultCampaign];
  }
}

function saveQrCampaigns(campaigns: QrCampaign[]) {
  if (!hasLocalStorage()) {
    return campaigns;
  }

  window.localStorage.setItem(qrCampaignsStorageKey, JSON.stringify(campaigns));
  return campaigns;
}

export function getActiveQrCampaignForRestaurant(
  restaurantId: string,
  channel?: QrCampaign["channel"],
) {
  return getActiveQrCampaignsForRestaurant(restaurantId, channel)[0];
}

export function getActiveQrCampaignsForRestaurant(
  restaurantId: string,
  channel?: QrCampaign["channel"],
) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  const campaigns = getQrCampaigns();
  const restaurant = getRestaurantById(slug);
  const applicableCampaigns = campaigns.filter(
    (campaign) =>
      campaign.active && appliesToRestaurant(campaign, slug) && isNowWithinRange(campaign),
  );
  const channelCampaigns = channel
    ? applicableCampaigns.filter(
        (campaign) => campaign.channel === channel || campaign.channel === "general",
      )
    : applicableCampaigns;
  const configuredCampaign = restaurant?.qrCampaignId
    ? channelCampaigns.find((campaign) => campaign.id === restaurant.qrCampaignId)
    : undefined;
  const specificCampaigns = channelCampaigns.filter(
    (campaign) => campaign.appliesToRestaurantIds !== "all",
  );
  const globalCampaigns = channelCampaigns.filter(
    (campaign) => campaign.appliesToRestaurantIds === "all",
  );
  const orderedCampaigns = [
    ...(configuredCampaign ? [configuredCampaign] : []),
    ...specificCampaigns.filter((campaign) => campaign.id !== configuredCampaign?.id),
    ...globalCampaigns.filter((campaign) => campaign.id !== configuredCampaign?.id),
  ];

  return orderedCampaigns;
}

export function createQrCampaign(
  campaign: Omit<QrCampaign, "id" | "active"> &
    Partial<Pick<QrCampaign, "id" | "active">>,
) {
  const appliesToRestaurantIds =
    campaign.appliesToRestaurantIds === "all"
      ? "all"
      : campaign.appliesToRestaurantIds.map((restaurantId) =>
          getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId),
        );
  const createdCampaign: QrCampaign = {
    ...campaign,
    appliesToRestaurantIds,
    id: campaign.id ?? createId(),
    active: campaign.active ?? true,
  };

  saveQrCampaigns([createdCampaign, ...getQrCampaigns()]);
  return createdCampaign;
}

export function updateQrCampaign(campaignId: string, updates: Partial<Omit<QrCampaign, "id">>) {
  const normalizedAppliesToRestaurantIds: QrCampaign["appliesToRestaurantIds"] | undefined =
    updates.appliesToRestaurantIds
      ? updates.appliesToRestaurantIds === "all"
        ? "all"
        : updates.appliesToRestaurantIds.map((restaurantId) =>
            getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId),
          )
      : undefined;
  const normalizedUpdates: Partial<Omit<QrCampaign, "id">> = {
    ...updates,
    ...(normalizedAppliesToRestaurantIds
      ? { appliesToRestaurantIds: normalizedAppliesToRestaurantIds }
      : {}),
  };
  const updatedCampaigns = getQrCampaigns().map((campaign) =>
    campaign.id === campaignId ? normalizeCampaign({ ...campaign, ...normalizedUpdates }) : campaign,
  );

  saveQrCampaigns(updatedCampaigns);
  return updatedCampaigns.find((campaign) => campaign.id === campaignId);
}

export function toggleQrCampaign(campaignId: string) {
  const updatedCampaigns = getQrCampaigns().map((campaign) =>
    campaign.id === campaignId ? { ...campaign, active: !campaign.active } : campaign,
  );

  saveQrCampaigns(updatedCampaigns);
  return updatedCampaigns.find((campaign) => campaign.id === campaignId);
}

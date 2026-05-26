import { getSupabaseClient } from "@/lib/supabase/client";
import type { ManagerUser } from "@/lib/auth/managerUsersStorage";
import type { BoardBatch } from "@/lib/boards/boardBatchStorage";
import type { QrCampaign } from "@/lib/types";
import type { RestaurantConfig } from "@/lib/types";
import type { Session } from "@/lib/sessions/sessionStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import { normalizeDeckId } from "@/lib/decks";
import type { BusinessType } from "@/lib/types";

export type SupabasePersistenceResult<T> = {
  data: T | null;
  error: Error | null;
  mode: "local" | "supabase";
};

function localResult<T>(): SupabasePersistenceResult<T> {
  return { data: null, error: null, mode: "local" };
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Supabase persistence error");
}

function restaurantPayload(restaurant: RestaurantConfig) {
  return {
    id: normalizeRestaurantSlug(restaurant.id),
    slug: normalizeRestaurantSlug(restaurant.slug ?? restaurant.id),
    name: restaurant.name,
    logo_url: restaurant.logoUrl,
    active: restaurant.active,
    is_active: restaurant.isActive,
    business_type: restaurant.businessType,
    manager_name: restaurant.managerName,
    manager_whatsapp: restaurant.managerWhatsapp,
    manager_email: restaurant.managerEmail,
    owner_name: restaurant.ownerName,
    owner_whatsapp: restaurant.ownerWhatsapp,
    address: restaurant.address,
    google_maps_url: restaurant.googleMapsUrl,
    instagram_url: restaurant.instagramUrl,
    facebook_url: restaurant.facebookUrl,
    tiktok_url: restaurant.tiktokUrl,
    average_hostesses: restaurant.averageHostesses,
    strong_days: restaurant.strongDays,
    estimated_games_per_week: restaurant.estimatedGamesPerWeek,
    audience_type: restaurant.audienceType,
    audience_notes: restaurant.audienceNotes,
    notes: restaurant.notes,
    restaurant_commission_percent: restaurant.restaurantCommissionPercent,
    hl_commission_mode: restaurant.hlCommissionMode,
    hl_commission_value: restaurant.hlCommissionValue,
    hl_fixed_fee: restaurant.hlFixedFee,
    accumulated_enabled: restaurant.accumulatedEnabled,
    accumulated_amount_per_game: restaurant.accumulatedAmountPerGame,
    accumulated_day: restaurant.accumulatedDay,
    accumulated_table_price: restaurant.accumulatedTablePrice,
    accumulated_table_count: restaurant.accumulatedTableCount,
    active_deck: normalizeDeckId(restaurant.activeDeck),
    commission_percent: restaurant.commissionPercent,
    commission_hl_percent: restaurant.commissionHLPercent,
    commission_restaurant_percent: restaurant.commissionRestaurantPercent,
    allowed_table_counts: restaurant.allowedTableCounts,
    allowed_prices: restaurant.allowedPrices,
    allowed_modes: restaurant.allowedModes,
    enabled_games: restaurant.enabledGames,
    active_games: restaurant.activeGames,
    enabled_decks: restaurant.enabledDecks,
    primary_color: restaurant.primaryColor,
    secondary_color: restaurant.secondaryColor,
    accent_color: restaurant.accentColor,
    autoplay_default: restaurant.autoplayDefault,
    autoplay_interval: restaurant.autoplayInterval,
    show_clock: restaurant.showClock,
    show_sponsors: restaurant.showSponsors,
    show_promotions: restaurant.showPromotions,
    show_qr_promo: restaurant.showQRPromo,
    promo_title: restaurant.promoTitle,
    promo_subtitle: restaurant.promoSubtitle,
    promo_image_url: restaurant.promoImageUrl,
    standby_title: restaurant.standbyTitle,
    standby_subtitle: restaurant.standbySubtitle,
    standby_image_url: restaurant.standbyImageUrl,
    standby_promo_text: restaurant.standbyPromoText,
    standby_cta_text: restaurant.standbyCtaText,
    standby_cta_qr_url: restaurant.standbyCtaQrUrl,
    standby_rotate_promotions: restaurant.standbyRotatePromotions,
    instagram: restaurant.instagram,
    facebook: restaurant.facebook,
    tiktok: restaurant.tiktok,
    qr_campaign_id: restaurant.qrCampaignId,
    theme: restaurant.theme,
    updated_at: new Date().toISOString(),
  };
}

function asStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

function asNumberArray(value: unknown, fallback: number[] = []) {
  return Array.isArray(value) && value.every((item) => typeof item === "number")
    ? value
    : fallback;
}

function restaurantFromRow(row: Record<string, unknown>): RestaurantConfig {
  const primaryColor = String(row.primary_color ?? "#d9a441");
  const secondaryColor = String(row.secondary_color ?? "#1fa187");
  const businessType = String(row.business_type ?? "restaurante_bar") as BusinessType;
  const enabledDecks = asStringArray(row.enabled_decks, ["loteria"]).map(normalizeDeckId);
  const allowedPrices = asNumberArray(row.allowed_prices, [100, 150, 200, 300]);
  const rawDefaultTablePrice = Number(row.default_table_price);
  const defaultTablePrice =
    Number.isFinite(rawDefaultTablePrice) && allowedPrices.includes(rawDefaultTablePrice)
      ? rawDefaultTablePrice
      : allowedPrices[0] ?? 100;

  return {
    id: normalizeRestaurantSlug(String(row.id ?? row.slug ?? row.name ?? "rancho-viejo")),
    slug: normalizeRestaurantSlug(String(row.slug ?? row.id ?? row.name ?? "rancho-viejo")),
    name: String(row.name ?? "Rancho Viejo"),
    logoUrl: String(row.logo_url ?? ""),
    active: Boolean(row.active ?? true),
    isActive: Boolean(row.is_active ?? row.active ?? true),
    businessType,
    managerName: String(row.manager_name ?? ""),
    managerWhatsapp: String(row.manager_whatsapp ?? ""),
    managerEmail: String(row.manager_email ?? ""),
    ownerName: String(row.owner_name ?? ""),
    ownerWhatsapp: String(row.owner_whatsapp ?? ""),
    address: String(row.address ?? ""),
    googleMapsUrl: String(row.google_maps_url ?? ""),
    instagramUrl: String(row.instagram_url ?? ""),
    facebookUrl: String(row.facebook_url ?? ""),
    tiktokUrl: String(row.tiktok_url ?? ""),
    averageHostesses: Number(row.average_hostesses ?? 0),
    strongDays: asStringArray(row.strong_days),
    estimatedGamesPerWeek: Number(row.estimated_games_per_week ?? 0),
    audienceType: asStringArray(row.audience_type, ["Mixto / general"]),
    audienceNotes: String(row.audience_notes ?? ""),
    notes: String(row.notes ?? ""),
    restaurantCommissionPercent: Number(row.restaurant_commission_percent ?? 0),
    hlCommissionMode: row.hl_commission_mode === "percent" ? "percent" : "fixed",
    hlCommissionValue: Number(row.hl_commission_value ?? row.hl_fixed_fee ?? 0),
    hlFixedFee: Number(row.hl_fixed_fee ?? 0),
    accumulatedEnabled: Boolean(row.accumulated_enabled ?? false),
    accumulatedAmountPerGame: Number(row.accumulated_amount_per_game ?? 0),
    accumulatedDay: (String(row.accumulated_day ?? "lunes") as RestaurantConfig["accumulatedDay"]),
    accumulatedTablePrice: Number(row.accumulated_table_price ?? 300),
    accumulatedTableCount: Number(row.accumulated_table_count ?? 30),
    activeDeck: normalizeDeckId(String(row.active_deck ?? enabledDecks[0] ?? "loteria")),
    commissionPercent: Number(row.commission_percent ?? row.commission_restaurant_percent ?? 0),
    commissionHLPercent: Number(row.commission_hl_percent ?? 0),
    commissionRestaurantPercent: Number(row.commission_restaurant_percent ?? row.restaurant_commission_percent ?? 0),
    allowedTableCounts: asNumberArray(row.allowed_table_counts, [30, 50]),
    allowedPrices,
    defaultTablePrice,
    allowedModes: asStringArray(row.allowed_modes, ["four_corners"]) as RestaurantConfig["allowedModes"],
    enabledGames: asStringArray(row.enabled_games, ["loteria"]),
    activeGames: asStringArray(row.active_games, ["loteria"]) as RestaurantConfig["activeGames"],
    enabledDecks,
    primaryColor,
    secondaryColor,
    accentColor: String(row.accent_color ?? "#c0392b"),
    autoplayDefault: Boolean(row.autoplay_default ?? true),
    autoplayInterval: Number(row.autoplay_interval ?? 5000),
    showClock: Boolean(row.show_clock ?? true),
    showSponsors: Boolean(row.show_sponsors ?? true),
    showPromotions: Boolean(row.show_promotions ?? true),
    showQRPromo: Boolean(row.show_qr_promo ?? true),
    promoTitle: String(row.promo_title ?? ""),
    promoSubtitle: String(row.promo_subtitle ?? ""),
    promoImageUrl: String(row.promo_image_url ?? ""),
    standbyTitle: String(row.standby_title ?? ""),
    standbySubtitle: String(row.standby_subtitle ?? ""),
    standbyImageUrl: String(row.standby_image_url ?? ""),
    standbyPromoText: String(row.standby_promo_text ?? ""),
    standbyCtaText: String(row.standby_cta_text ?? ""),
    standbyCtaQrUrl: String(row.standby_cta_qr_url ?? ""),
    standbyRotatePromotions: Boolean(row.standby_rotate_promotions ?? true),
    instagram: String(row.instagram ?? row.instagram_url ?? ""),
    facebook: String(row.facebook ?? row.facebook_url ?? ""),
    tiktok: String(row.tiktok ?? row.tiktok_url ?? ""),
    qrCampaignId: String(row.qr_campaign_id ?? ""),
    theme: {
      primaryColor,
      secondaryColor,
    },
  };
}

function managerUserPayload(user: ManagerUser) {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    name: user.name,
    restaurant_id: normalizeRestaurantSlug(user.restaurantId),
    role: user.role,
    active: user.active,
    created_at: user.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function managerUserFromRow(row: Record<string, unknown>): ManagerUser {
  const restaurantId = normalizeRestaurantSlug(String(row.restaurant_id ?? "rancho-viejo"));
  const restaurantIds = asStringArray(row.restaurant_ids, [restaurantId]).map((id) =>
    normalizeRestaurantSlug(id),
  );

  return {
    id: String(row.id ?? ""),
    username: String(row.username ?? "").trim().toLowerCase(),
    password: String(row.password ?? ""),
    name: String(row.name ?? ""),
    restaurantId,
    restaurantIds,
    brandName: String(row.brand_name ?? ""),
    role:
      row.role === "restaurant_admin" ||
      row.role === "play" ||
      row.role === "supervisor" ||
      row.role === "tv"
        ? row.role
        : "manager",
    active: Boolean(row.active ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function boardBatchPayload(batch: BoardBatch) {
  return {
    id: batch.id,
    restaurant_id: normalizeRestaurantSlug(batch.restaurantId),
    game_id: batch.gameId,
    deck_id: normalizeDeckId(batch.deckId),
    restaurant_name: batch.restaurantName,
    name: batch.name,
    quantity: batch.quantity,
    status: batch.status,
    is_active: batch.status === "active",
    active: batch.status === "active",
    valid_from: batch.validFrom,
    valid_to: batch.validTo,
    boards: batch.boards,
    created_at: batch.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function boardBatchFromRow(row: Record<string, unknown>): BoardBatch {
  const status = String(row.status ?? (row.is_active || row.active ? "active" : "inactive"));

  return {
    id: String(row.id ?? ""),
    restaurantId: normalizeRestaurantSlug(String(row.restaurant_id ?? "rancho-viejo")),
    gameId: String(row.game_id ?? "loteria") as BoardBatch["gameId"],
    deckId: normalizeDeckId(String(row.deck_id ?? "loteria")),
    restaurantName: String(row.restaurant_name ?? ""),
    name: String(row.name ?? "Lote operativo"),
    quantity: Number(row.quantity ?? 0),
    status: status === "active" || status === "archived" ? status : "inactive",
    validFrom: String(row.valid_from ?? ""),
    validTo: String(row.valid_to ?? ""),
    boards: Array.isArray(row.boards) ? (row.boards as BoardBatch["boards"]) : [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function qrCampaignPayload(campaign: QrCampaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    active: campaign.active,
    channel: campaign.channel,
    title: campaign.title,
    message: campaign.message,
    cta_label: campaign.ctaLabel,
    cta_url: campaign.ctaUrl,
    sponsor_name: campaign.sponsorName,
    sponsor_logo_url: campaign.sponsorLogoUrl,
    banner_image_url: campaign.bannerImageUrl,
    valid_from: campaign.validFrom,
    valid_to: campaign.validTo,
    applies_to_restaurant_ids: campaign.appliesToRestaurantIds,
    updated_at: new Date().toISOString(),
  };
}

function qrCampaignFromRow(row: Record<string, unknown>): QrCampaign {
  const appliesToRestaurantIds =
    row.applies_to_restaurant_ids === "all"
      ? "all"
      : asStringArray(row.applies_to_restaurant_ids).map((id) => normalizeRestaurantSlug(id));

  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "Campana QR"),
    active: Boolean(row.active ?? true),
    channel:
      row.channel === "tv_standby" || row.channel === "general"
        ? row.channel
        : "printed_qr",
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    ctaLabel: String(row.cta_label ?? ""),
    ctaUrl: String(row.cta_url ?? ""),
    sponsorName: String(row.sponsor_name ?? ""),
    sponsorLogoUrl: String(row.sponsor_logo_url ?? ""),
    bannerImageUrl: String(row.banner_image_url ?? ""),
    validFrom: String(row.valid_from ?? ""),
    validTo: String(row.valid_to ?? ""),
    appliesToRestaurantIds,
  };
}

function sessionPayload(session: Session) {
  return {
    id: session.id,
    batch_id: session.batchId ?? null,
    restaurant_id: normalizeRestaurantSlug(session.restaurantId),
    restaurant_name: session.restaurantName,
    operator_user_id: session.operatorUserId ?? null,
    operator_username: session.operatorUsername ?? null,
    operator_role: session.operatorRole ?? null,
    created_at: session.createdAt,
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
    last_updated_at: session.lastUpdatedAt,
    mode: session.mode,
    deck_id: normalizeDeckId(session.deckId),
    active_tables: session.activeTables,
    table_price: session.tablePrice,
    restaurant_commission_percent: session.restaurantCommissionPercent,
    restaurant_commission_amount: session.restaurantCommissionAmount,
    hl_commission_mode: session.hlCommissionMode,
    hl_commission_value: session.hlCommissionValue,
    hl_commission_amount: session.hlCommissionAmount,
    commission_total_percent: session.commissionTotalPercent,
    commission_total_amount: session.commissionTotalAmount,
    hl_fixed_fee: session.hlFixedFee,
    restaurant_net_amount: session.restaurantNetAmount,
    commission_hl_percent: session.commissionHLPercent,
    commission_restaurant_percent: session.commissionRestaurantPercent,
    commission_net_percent: session.commissionNetPercent,
    commission_hl_amount: session.commissionHLAmount,
    commission_restaurant_amount: session.commissionRestaurantAmount,
    commission_net_amount: session.commissionNetAmount,
    gross_revenue: session.grossRevenue,
    prize_amount: session.prizeAmount,
    base_prize_amount: session.basePrizeAmount ?? session.prizeAmount,
    accumulated_contribution_amount: session.accumulatedContributionAmount ?? 0,
    accumulated_prize_amount: session.accumulatedPrizeAmount ?? 0,
    game_type: session.gameType ?? "normal",
    called_cards: session.calledCards,
    winner_folio: session.winnerFolio ?? null,
    winner_cards: session.winnerCards,
    autoplay_status: session.autoplayStatus,
    autoplay_interval_seconds: session.autoplayIntervalSeconds,
    pre_start_countdown_seconds: session.preStartCountdownSeconds,
    pre_start_started_at: session.preStartStartedAt ?? null,
    autoplay_started_at: session.autoplayStartedAt ?? null,
    play_started_at: session.playStartedAt ?? null,
    play_ended_at: session.playEndedAt ?? null,
    active_promotions: session.activePromotions ?? [],
    status: session.status,
    duration_seconds: session.durationSeconds,
  };
}

export async function upsertRestaurantsToSupabase(restaurants: RestaurantConfig[]) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<RestaurantConfig[]>();
  }

  const { data, error } = await supabase.from("restaurants").upsert(
    restaurants.map(restaurantPayload),
    { onConflict: "id" },
  ).select();

  return { data: (data as RestaurantConfig[] | null) ?? null, error: error ? toError(error) : null, mode: "supabase" as const };
}

export async function getRestaurantsFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<RestaurantConfig[]>();
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("updated_at", { ascending: false });

  return {
    data: data ? (data as Record<string, unknown>[]).map(restaurantFromRow) : null,
    error: error ? toError(error) : null,
    mode: "supabase" as const,
  };
}

export async function upsertManagerUsersToSupabase(users: ManagerUser[]) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<ManagerUser[]>();
  }

  const { data, error } = await supabase.from("manager_users").upsert(
    users.map(managerUserPayload),
    { onConflict: "id" },
  ).select();

  return { data: (data as ManagerUser[] | null) ?? null, error: error ? toError(error) : null, mode: "supabase" as const };
}

export async function getManagerUsersFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<ManagerUser[]>();
  }

  const { data, error } = await supabase
    .from("manager_users")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: data ? (data as Record<string, unknown>[]).map(managerUserFromRow) : null,
    error: error ? toError(error) : null,
    mode: "supabase" as const,
  };
}

export async function deleteManagerUserFromSupabase(userId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<null>();
  }

  const { error } = await supabase.from("manager_users").delete().eq("id", userId);

  return { data: null, error: error ? toError(error) : null, mode: "supabase" as const };
}

export async function upsertBoardBatchesToSupabase(batches: BoardBatch[]) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<BoardBatch[]>();
  }

  const { data, error } = await supabase.from("board_batches").upsert(
    batches.map(boardBatchPayload),
    { onConflict: "id" },
  ).select();

  return {
    data: data ? (data as Record<string, unknown>[]).map(boardBatchFromRow) : null,
    error: error ? toError(error) : null,
    mode: "supabase" as const,
  };
}

export async function getBoardBatchesFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<BoardBatch[]>();
  }

  const { data, error } = await supabase
    .from("board_batches")
    .select("*")
    .order("updated_at", { ascending: false });

  return {
    data: data ? (data as Record<string, unknown>[]).map(boardBatchFromRow) : null,
    error: error ? toError(error) : null,
    mode: "supabase" as const,
  };
}

export async function upsertQrCampaignsToSupabase(campaigns: QrCampaign[]) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<QrCampaign[]>();
  }

  const { data, error } = await supabase.from("qr_campaigns").upsert(
    campaigns.map(qrCampaignPayload),
    { onConflict: "id" },
  ).select();

  return {
    data: data ? (data as Record<string, unknown>[]).map(qrCampaignFromRow) : null,
    error: error ? toError(error) : null,
    mode: "supabase" as const,
  };
}

export async function getQrCampaignsFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<QrCampaign[]>();
  }

  const { data, error } = await supabase
    .from("qr_campaigns")
    .select("*")
    .order("updated_at", { ascending: false });

  return {
    data: data ? (data as Record<string, unknown>[]).map(qrCampaignFromRow) : null,
    error: error ? toError(error) : null,
    mode: "supabase" as const,
  };
}

export async function upsertSessionToSupabase(session: Session) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<Session>();
  }

  const { data, error } = await supabase.from("game_sessions").upsert(sessionPayload(session), {
    onConflict: "id",
  }).select().single();

  return { data: data as Session | null, error: error ? toError(error) : null, mode: "supabase" as const };
}

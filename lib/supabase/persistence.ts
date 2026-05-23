import { getSupabaseClient } from "@/lib/supabase/client";
import type { ManagerUser } from "@/lib/auth/managerUsersStorage";
import type { RestaurantConfig } from "@/lib/types";
import type { Session } from "@/lib/sessions/sessionStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import { normalizeDeckId } from "@/lib/decks";

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

export async function deleteManagerUserFromSupabase(userId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult<null>();
  }

  const { error } = await supabase.from("manager_users").delete().eq("id", userId);

  return { data: null, error: error ? toError(error) : null, mode: "supabase" as const };
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


import type { RealtimeChannel } from "@supabase/supabase-js";
import type { WinMode } from "@/lib/loteria";
import type { Session } from "@/lib/sessions/sessionStorage";
import { getSupabaseClient } from "@/lib/supabase/client";

export type RealtimeGameSession = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  status: string;
  autoplay_status: string;
  mode: string;
  active_tables: number;
  table_price: number;
  gross_revenue: number;
  commission_hl_percent: number;
  commission_restaurant_percent: number;
  commission_net_percent: number;
  commission_hl_amount: number;
  commission_restaurant_amount: number;
  commission_net_amount: number;
  prize_amount: number;
  called_cards: string[];
  winner_folio: string | null;
  winner_cards: string[];
  autoplay_interval_seconds: number;
  pre_start_countdown_seconds: number;
  pre_start_started_at: string | null;
  autoplay_started_at: string | null;
  play_started_at: string | null;
  play_ended_at: string | null;
  active_promotions: Session["activePromotions"];
  duration_seconds: number;
  last_updated_at: string;
  created_at: string;
};

type RealtimeResult<T> = {
  data: T | null;
  error: Error | null;
  mode: "local" | "supabase";
};

type RealtimeSessionUpdate = Partial<
  Pick<
    Session,
    | "status"
    | "autoplayStatus"
    | "calledCards"
    | "winnerFolio"
    | "winnerCards"
    | "autoplayIntervalSeconds"
    | "preStartCountdownSeconds"
    | "preStartStartedAt"
    | "autoplayStartedAt"
    | "playStartedAt"
    | "playEndedAt"
    | "activePromotions"
    | "durationSeconds"
    | "lastUpdatedAt"
  >
>;

function toRealtimePayload(session: Session) {
  return {
    id: session.id,
    restaurant_id: session.restaurantId,
    restaurant_name: session.restaurantName,
    status: session.status,
    autoplay_status: session.autoplayStatus,
    mode: session.mode,
    active_tables: session.activeTables,
    table_price: session.tablePrice,
    gross_revenue: session.grossRevenue,
    commission_hl_percent: session.commissionHLPercent,
    commission_restaurant_percent: session.commissionRestaurantPercent,
    commission_net_percent: session.commissionNetPercent,
    commission_hl_amount: session.commissionHLAmount,
    commission_restaurant_amount: session.commissionRestaurantAmount,
    commission_net_amount: session.commissionNetAmount,
    prize_amount: session.prizeAmount,
    called_cards: session.calledCards,
    winner_folio: session.winnerFolio ?? null,
    winner_cards: session.winnerCards,
    autoplay_interval_seconds: session.autoplayIntervalSeconds,
    pre_start_countdown_seconds: session.preStartCountdownSeconds,
    pre_start_started_at: session.preStartStartedAt ?? null,
    autoplay_started_at: session.autoplayStartedAt ?? null,
    play_started_at: session.playStartedAt ?? null,
    play_ended_at: session.playEndedAt ?? null,
    active_promotions: session.activePromotions ?? [],
    duration_seconds: session.durationSeconds,
    last_updated_at: session.lastUpdatedAt,
    created_at: session.createdAt,
  };
}

function toRealtimeUpdate(updates: RealtimeSessionUpdate) {
  return {
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.autoplayStatus ? { autoplay_status: updates.autoplayStatus } : {}),
    ...(updates.calledCards ? { called_cards: updates.calledCards } : {}),
    ...(updates.winnerFolio !== undefined ? { winner_folio: updates.winnerFolio ?? null } : {}),
    ...(updates.winnerCards ? { winner_cards: updates.winnerCards } : {}),
    ...(updates.autoplayIntervalSeconds !== undefined
      ? { autoplay_interval_seconds: updates.autoplayIntervalSeconds }
      : {}),
    ...(updates.preStartCountdownSeconds !== undefined
      ? { pre_start_countdown_seconds: updates.preStartCountdownSeconds }
      : {}),
    ...(updates.preStartStartedAt !== undefined
      ? { pre_start_started_at: updates.preStartStartedAt ?? null }
      : {}),
    ...(updates.autoplayStartedAt !== undefined
      ? { autoplay_started_at: updates.autoplayStartedAt ?? null }
      : {}),
    ...(updates.playStartedAt !== undefined ? { play_started_at: updates.playStartedAt ?? null } : {}),
    ...(updates.playEndedAt !== undefined ? { play_ended_at: updates.playEndedAt ?? null } : {}),
    ...(updates.activePromotions ? { active_promotions: updates.activePromotions } : {}),
    ...(updates.durationSeconds !== undefined ? { duration_seconds: updates.durationSeconds } : {}),
    last_updated_at: updates.lastUpdatedAt ?? new Date().toISOString(),
  };
}

export function realtimeSessionToSession(row: RealtimeGameSession): Session {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    createdAt: row.created_at,
    startedAt: row.created_at,
    lastUpdatedAt: row.last_updated_at,
    mode: row.mode as WinMode,
    activeTables: row.active_tables,
    tablePrice: row.table_price,
    commissionPercent: row.commission_net_percent,
    commissionHLPercent: row.commission_hl_percent,
    commissionRestaurantPercent: row.commission_restaurant_percent,
    commissionNetPercent: row.commission_net_percent,
    commissionHLAmount: row.commission_hl_amount,
    commissionRestaurantAmount: row.commission_restaurant_amount,
    commissionNetAmount: row.commission_net_amount,
    grossRevenue: row.gross_revenue,
    prizeAmount: row.prize_amount,
    calledCards: row.called_cards ?? [],
    winnerFolio: row.winner_folio ?? undefined,
    winnerCards: row.winner_cards ?? [],
    autoplayStatus: row.autoplay_status as Session["autoplayStatus"],
    autoplayIntervalSeconds: row.autoplay_interval_seconds ?? 5,
    preStartCountdownSeconds: row.pre_start_countdown_seconds ?? 60,
    preStartStartedAt: row.pre_start_started_at ?? undefined,
    autoplayStartedAt: row.autoplay_started_at ?? undefined,
    playStartedAt: row.play_started_at ?? undefined,
    playEndedAt: row.play_ended_at ?? undefined,
    activePromotions: row.active_promotions ?? [],
    status: row.status as Session["status"],
    durationSeconds: row.duration_seconds ?? 0,
  };
}

function localResult<T>(): RealtimeResult<T> {
  return { data: null, error: null, mode: "local" };
}

export async function createRealtimeSession(session: Session): Promise<RealtimeResult<RealtimeGameSession>> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult();
  }

  await supabase
    .from("game_sessions")
    .update({
      status: "finalized",
      autoplay_status: "finished",
      play_ended_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", session.restaurantId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("game_sessions")
    .insert(toRealtimePayload(session))
    .select()
    .single();

  return { data: data as RealtimeGameSession | null, error, mode: "supabase" };
}

export async function updateRealtimeSession(
  sessionId: string,
  updates: RealtimeSessionUpdate,
): Promise<RealtimeResult<RealtimeGameSession>> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult();
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .update(toRealtimeUpdate(updates))
    .eq("id", sessionId)
    .select()
    .single();

  return { data: data as RealtimeGameSession | null, error, mode: "supabase" };
}

export async function getActiveRealtimeSessionByRestaurantId(
  restaurantId: string,
): Promise<RealtimeResult<RealtimeGameSession>> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localResult();
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data as RealtimeGameSession | null, error, mode: "supabase" };
}

export function subscribeToRestaurantSession(
  restaurantId: string,
  onChange: (session: RealtimeGameSession | null) => void,
  onStatusChange?: (status: string) => void,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => undefined;
  }

  const channel: RealtimeChannel = supabase
    .channel(`game_sessions:${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_sessions",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => {
        onChange((payload.new || payload.old || null) as RealtimeGameSession | null);
      },
    )
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function closeRealtimeSession(
  sessionId: string,
  updates: RealtimeSessionUpdate = {},
): Promise<RealtimeResult<RealtimeGameSession>> {
  const now = new Date().toISOString();

  return updateRealtimeSession(sessionId, {
    ...updates,
    status: "finalized",
    autoplayStatus: "finished",
    playEndedAt: updates.playEndedAt ?? now,
    lastUpdatedAt: now,
  });
}

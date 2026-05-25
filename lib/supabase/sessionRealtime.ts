import type { PostgrestError, RealtimeChannel } from "@supabase/supabase-js";
import type { WinMode } from "@/lib/loteria";
import type { Session } from "@/lib/sessions/sessionStorage";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import { normalizeDeckId } from "@/lib/decks";

export type RealtimeGameSession = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  status: string;
  autoplay_status: string;
  deck_id: string | null;
  mode: string;
  active_tables: number;
  table_price: number;
  restaurant_commission_percent: number | null;
  restaurant_commission_amount: number | null;
  hl_commission_mode: "fixed" | "percent" | null;
  hl_commission_value: number | null;
  hl_commission_amount: number | null;
  commission_total_percent: number | null;
  commission_total_amount: number | null;
  hl_fixed_fee: number | null;
  restaurant_net_amount: number | null;
  gross_revenue: number;
  commission_hl_percent: number;
  commission_restaurant_percent: number;
  commission_net_percent: number;
  commission_hl_amount: number;
  commission_restaurant_amount: number;
  commission_net_amount: number;
  prize_amount: number;
  base_prize_amount: number | null;
  accumulated_contribution_amount: number | null;
  accumulated_prize_amount: number | null;
  game_type: string | null;
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
  operator_user_id: string | null;
  operator_username: string | null;
  operator_role: "manager" | "play" | "supervisor" | null;
  duration_seconds: number;
  last_updated_at: string;
  created_at: string;
};

export type RestaurantSessionChannelStatus =
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

export type RestaurantSessionChannelState = {
  status: RestaurantSessionChannelStatus;
  label: "Realtime conectado" | "Realtime desconectado";
};

export type RealtimeSessionDebugRow = {
  id: string;
  restaurant_id: string;
  status: string;
  autoplay_status: string;
  last_updated_at: string;
};

type RealtimeResult<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
  mode: "local" | "supabase";
};

const activeSessionStatuses = ["created", "countdown", "active", "playing"];
const terminalSessionStatuses = ["completed", "cancelled", "closed_without_winner"];
const activeAutoplayStatuses = ["idle", "countdown", "playing", "paused", "winner"];

export type RealtimeSessionUpdate = Partial<
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
    | "operatorUserId"
    | "operatorUsername"
    | "operatorRole"
    | "durationSeconds"
    | "lastUpdatedAt"
  >
>;

function toRealtimePayload(session: Session) {
  const restaurantId = normalizeRestaurantSlug(session.restaurantId);

  return {
    id: session.id,
    restaurant_id: restaurantId,
    restaurant_name: session.restaurantName,
    status: session.status,
    autoplay_status: session.autoplayStatus,
    deck_id: session.deckId,
    mode: session.mode,
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
    gross_revenue: session.grossRevenue,
    commission_hl_percent: session.commissionHLPercent,
    commission_restaurant_percent: session.commissionRestaurantPercent,
    commission_net_percent: session.commissionNetPercent,
    commission_hl_amount: session.commissionHLAmount,
    commission_restaurant_amount: session.commissionRestaurantAmount,
    commission_net_amount: session.commissionNetAmount,
    prize_amount: session.prizeAmount,
    base_prize_amount: session.basePrizeAmount ?? session.prizeAmount,
    accumulated_contribution_amount: session.accumulatedContributionAmount ?? 0,
    accumulated_prize_amount: session.accumulatedPrizeAmount ?? 0,
    game_type: session.gameType ?? "normal",
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
    operator_user_id: session.operatorUserId ?? null,
    operator_username: session.operatorUsername ?? null,
    operator_role: session.operatorRole ?? null,
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
    ...(updates.operatorUserId !== undefined
      ? { operator_user_id: updates.operatorUserId ?? null }
      : {}),
    ...(updates.operatorUsername !== undefined
      ? { operator_username: updates.operatorUsername ?? null }
      : {}),
    ...(updates.operatorRole !== undefined ? { operator_role: updates.operatorRole ?? null } : {}),
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
    deckId: normalizeDeckId(row.deck_id ?? undefined),
    mode: row.mode as WinMode,
    activeTables: row.active_tables,
    tablePrice: row.table_price,
    restaurantCommissionPercent:
      row.restaurant_commission_percent ?? row.commission_restaurant_percent,
    restaurantCommissionAmount:
      row.restaurant_commission_amount ?? row.commission_restaurant_amount,
    hlCommissionMode: row.hl_commission_mode ?? (row.hl_fixed_fee ? "fixed" : "percent"),
    hlCommissionValue:
      row.hl_commission_value ?? row.hl_fixed_fee ?? row.commission_hl_percent ?? 0,
    hlCommissionAmount: row.hl_commission_amount ?? row.commission_hl_amount,
    commissionTotalPercent: row.commission_total_percent ?? row.commission_net_percent,
    commissionTotalAmount: row.commission_total_amount ?? row.commission_net_amount,
    hlFixedFee: row.hl_fixed_fee ?? row.commission_hl_amount,
    restaurantNetAmount:
      row.restaurant_net_amount ??
      Math.max(0, row.commission_restaurant_amount - row.commission_hl_amount),
    commissionPercent: row.commission_net_percent,
    commissionHLPercent: row.commission_hl_percent,
    commissionRestaurantPercent: row.commission_restaurant_percent,
    commissionNetPercent: row.commission_net_percent,
    commissionHLAmount: row.commission_hl_amount,
    commissionRestaurantAmount: row.commission_restaurant_amount,
    commissionNetAmount: row.commission_net_amount,
    grossRevenue: row.gross_revenue,
    prizeAmount: row.prize_amount,
    basePrizeAmount: row.base_prize_amount ?? row.prize_amount,
    accumulatedContributionAmount: row.accumulated_contribution_amount ?? 0,
    accumulatedPrizeAmount: row.accumulated_prize_amount ?? 0,
    gameType: (row.game_type as Session["gameType"]) ?? "normal",
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
    operatorUserId: row.operator_user_id ?? undefined,
    operatorUsername: row.operator_username ?? undefined,
    operatorRole: row.operator_role ?? undefined,
    status: row.status as Session["status"],
    durationSeconds: row.duration_seconds ?? 0,
  };
}

function localResult<T>(): RealtimeResult<T> {
  return { data: null, error: null, mode: "local" };
}

function toChannelState(status: string): RestaurantSessionChannelState {
  if (status === "SUBSCRIBED") {
    return { status: "SUBSCRIBED", label: "Realtime conectado" };
  }

  if (status === "TIMED_OUT") {
    return { status: "TIMED_OUT", label: "Realtime desconectado" };
  }

  if (status === "CLOSED") {
    return { status: "CLOSED", label: "Realtime desconectado" };
  }

  return { status: "CHANNEL_ERROR", label: "Realtime desconectado" };
}

export async function createRealtimeSession(session: Session): Promise<RealtimeResult<RealtimeGameSession>> {
  const supabase = getSupabaseClient();
  const restaurantId = normalizeRestaurantSlug(session.restaurantId);
  const now = new Date().toISOString();

  if (!supabase) {
    return localResult();
  }

  await supabase
    .from("game_sessions")
    .update({
      status: "closed_without_winner",
      autoplay_status: "finished",
      play_ended_at: now,
      last_updated_at: now,
    })
    .eq("restaurant_id", restaurantId)
    .in("status", activeSessionStatuses);

  const { data, error } = await supabase
    .from("game_sessions")
    .upsert(
      {
        ...toRealtimePayload(session),
        restaurant_id: restaurantId,
        status: session.status || "active",
        last_updated_at: session.lastUpdatedAt || now,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  const realtimeSession = data as RealtimeGameSession | null;

  if (error) {
    console.warn("[HOSTER LIVE] UPSERT REALTIME SESSION ERROR", {
      message: error.message,
      details: error.details,
      code: error.code,
      sessionId: session.id,
      restaurant_id: restaurantId,
      status: session.status,
      autoplay_status: session.autoplayStatus,
    });
  } else {
    console.info("[HOSTER LIVE] UPSERT REALTIME SESSION OK", {
      sessionId: realtimeSession?.id,
      restaurant_id: realtimeSession?.restaurant_id,
      status: realtimeSession?.status,
      autoplay_status: realtimeSession?.autoplay_status,
    });
  }

  return { data: realtimeSession, error, mode: "supabase" };
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
  const slug = normalizeRestaurantSlug(restaurantId);

  if (!supabase) {
    return localResult();
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[HOSTER LIVE] QUERY restaurant_id:", slug);
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("restaurant_id", slug)
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (data as RealtimeGameSession[] | null) ?? [];
  const activeRow =
    rows.find((row) => {
      const status = String(row.status ?? "");
      const autoplayStatus = String(row.autoplay_status ?? "");

      return (
        !terminalSessionStatuses.includes(status) &&
        (activeSessionStatuses.includes(status) || activeAutoplayStatuses.includes(autoplayStatus))
      );
    }) ?? null;

  if (process.env.NODE_ENV === "development") {
    if (activeRow) {
      console.info("[HOSTER LIVE] SESSION FOUND realtime:", {
        id: activeRow.id,
        restaurant_id: activeRow.restaurant_id,
        status: activeRow.status,
        autoplay_status: activeRow.autoplay_status,
      });
    } else {
      console.info("[HOSTER LIVE] SESSION NOT FOUND realtime:", {
        restaurant_id: slug,
        error: error?.message,
        latestRows: rows.map((row) => ({
          id: row.id,
          status: row.status,
          autoplay_status: row.autoplay_status,
          last_updated_at: row.last_updated_at,
        })),
      });
    }
  }

  return { data: activeRow, error, mode: "supabase" };
}

export async function getLatestRealtimeSessionDebugByRestaurantId(
  restaurantId: string,
): Promise<RealtimeResult<RealtimeSessionDebugRow>> {
  const supabase = getSupabaseClient();
  const slug = normalizeRestaurantSlug(restaurantId);

  if (!supabase) {
    return localResult();
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .select("id, restaurant_id, status, autoplay_status, last_updated_at")
    .eq("restaurant_id", slug)
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data as RealtimeSessionDebugRow | null, error, mode: "supabase" };
}

export async function getLatestRealtimeSessionByRestaurantId(
  restaurantId: string,
): Promise<RealtimeResult<RealtimeGameSession>> {
  const supabase = getSupabaseClient();
  const slug = normalizeRestaurantSlug(restaurantId);

  if (!supabase) {
    return localResult();
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("restaurant_id", slug)
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data as RealtimeGameSession | null, error, mode: "supabase" };
}

export function subscribeToRestaurantSession(
  restaurantId: string,
  onChange: (session: RealtimeGameSession | null) => void,
  onStatusChange?: (status: RestaurantSessionChannelState) => void,
) {
  const supabase = getSupabaseClient();
  const slug = normalizeRestaurantSlug(restaurantId);

  if (!supabase) {
    return () => undefined;
  }

  let channel: RealtimeChannel | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let closedByClient = false;

  const openChannel = () => {
    const channelName = `game_sessions:${slug}:${Date.now()}`;

    if (process.env.NODE_ENV === "development") {
      console.info("[HOSTER LIVE] SUBSCRIBE restaurant_id:", slug);
      console.info("[HOSTER LIVE] Realtime subscribe config", {
        channelName,
        event: "*",
        schema: "public",
        table: "game_sessions",
        filter: `restaurant_id=eq.${slug}`,
      });
    }

    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `restaurant_id=eq.${slug}`,
        },
        (payload) => {
          onChange((payload.new || payload.old || null) as RealtimeGameSession | null);
        },
      )
      .subscribe((status) => {
      const channelState = toChannelState(status);

      if (process.env.NODE_ENV === "development") {
        console.info("[HOSTER LIVE] Realtime channel status", {
          restaurantId: slug,
          status: channelState.status,
          label: channelState.label,
        });
      }

      onStatusChange?.(channelState);

        if ((status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !closedByClient) {
          reconnectTimer = setTimeout(() => {
            if (channel) {
              void supabase.removeChannel(channel);
            }

            openChannel();
          }, 1200);
        }
      });
  };

  openChannel();

  return () => {
    closedByClient = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}

export async function closeRealtimeSession(
  sessionId: string,
  updates: RealtimeSessionUpdate = {},
): Promise<RealtimeResult<RealtimeGameSession>> {
  const now = new Date().toISOString();

  return updateRealtimeSession(sessionId, {
    ...updates,
    status: updates.status ?? "completed",
    autoplayStatus: "finished",
    playEndedAt: updates.playEndedAt ?? now,
    lastUpdatedAt: now,
  });
}

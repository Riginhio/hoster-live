import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import {
  getActiveSessionByRestaurantId,
  type Session,
} from "@/lib/sessions/sessionStorage";
import {
  getActiveRealtimeSessionByRestaurantId,
  realtimeSessionToSession,
} from "@/lib/supabase/sessionRealtime";

export type ActiveSessionResult = {
  session: Session | null;
  source: "supabase" | "localStorage" | "none";
  error: Error | null;
};

export async function getActiveSessionForRestaurant(restaurantId: string): Promise<ActiveSessionResult> {
  const slug = normalizeRestaurantSlug(restaurantId);
  const remoteResult = await getActiveRealtimeSessionByRestaurantId(slug);

  if (remoteResult.mode === "supabase" && remoteResult.data && !remoteResult.error) {
    return {
      session: realtimeSessionToSession(remoteResult.data),
      source: "supabase",
      error: null,
    };
  }

  const localSession = getActiveSessionByRestaurantId(slug) ?? null;

  return {
    session: localSession,
    source: localSession ? "localStorage" : "none",
    error: remoteResult.error,
  };
}

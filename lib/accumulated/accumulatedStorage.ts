import type { Session } from "@/lib/sessions/sessionStorage";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

export type AccumulatedWeekStatus = "active" | "played" | "reset";

export type AccumulatedWeek = {
  id: string;
  restaurantId: string;
  weekStart: string;
  weekEnd: string;
  amount: number;
  status: AccumulatedWeekStatus;
  appliedSessionIds: string[];
  playedAt?: string;
  playedSessionId?: string;
};

export const accumulatedStorageKey = "hoster-live:accumulated-weeks";

const dayIndexes: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getWeekStartDate(date = new Date()) {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekRange(date = new Date()) {
  const weekStart = getWeekStartDate(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    weekStart: toDateString(weekStart),
    weekEnd: toDateString(weekEnd),
  };
}

export function getNextAccumulatedDate(dayName: string, fromDate = new Date()) {
  const targetDay = dayIndexes[dayName] ?? 1;
  const next = startOfDay(fromDate);
  const diff = (targetDay - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + diff);
  return toDateString(next);
}

function normalizeWeek(value: Partial<AccumulatedWeek>): AccumulatedWeek {
  const restaurantId = normalizeRestaurantSlug(value.restaurantId);
  const range = value.weekStart && value.weekEnd ? value : getWeekRange();

  return {
    id: value.id ?? `${restaurantId}:${range.weekStart}`,
    restaurantId,
    weekStart: range.weekStart ?? getWeekRange().weekStart,
    weekEnd: range.weekEnd ?? getWeekRange().weekEnd,
    amount: typeof value.amount === "number" && Number.isFinite(value.amount) ? value.amount : 0,
    status: value.status ?? "active",
    appliedSessionIds: Array.isArray(value.appliedSessionIds) ? value.appliedSessionIds : [],
    playedAt: value.playedAt,
    playedSessionId: value.playedSessionId,
  };
}

export function getAccumulatedWeeks() {
  if (!hasLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(accumulatedStorageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AccumulatedWeek>[];
    return Array.isArray(parsedValue) ? parsedValue.map(normalizeWeek) : [];
  } catch {
    return [];
  }
}

function saveAccumulatedWeeks(weeks: AccumulatedWeek[]) {
  if (!hasLocalStorage()) {
    return weeks;
  }

  window.localStorage.setItem(accumulatedStorageKey, JSON.stringify(weeks.map(normalizeWeek)));
  return weeks;
}

export function getActiveAccumulatedWeek(restaurantId: string, date = new Date()) {
  const slug = normalizeRestaurantSlug(restaurantId);
  const { weekStart, weekEnd } = getWeekRange(date);
  const weeks = getAccumulatedWeeks();
  const existingWeek = weeks.find(
    (week) =>
      week.restaurantId === slug &&
      week.weekStart === weekStart &&
      week.weekEnd === weekEnd &&
      week.status === "active",
  );

  if (existingWeek) {
    return existingWeek;
  }

  const createdWeek = normalizeWeek({
    restaurantId: slug,
    weekStart,
    weekEnd,
    amount: 0,
    status: "active",
    appliedSessionIds: [],
  });

  saveAccumulatedWeeks([createdWeek, ...weeks]);
  return createdWeek;
}

export function getAccumulatedSummary(restaurantId: string) {
  const restaurant = getRestaurantById(restaurantId);
  const activeWeek = getActiveAccumulatedWeek(restaurantId);

  return {
    activeWeek,
    enabled: Boolean(restaurant?.accumulatedEnabled),
    amountPerGame: restaurant?.accumulatedAmountPerGame ?? 0,
    day: restaurant?.accumulatedDay ?? "lunes",
    nextDate: getNextAccumulatedDate(restaurant?.accumulatedDay ?? "lunes"),
  };
}

export function applyCompletedSessionToAccumulated(session: Session) {
  if (session.status !== "completed") {
    return getActiveAccumulatedWeek(session.restaurantId);
  }

  const restaurant = getRestaurantById(session.restaurantId);
  const week = getActiveAccumulatedWeek(session.restaurantId, new Date(session.startedAt));
  const weeks = getAccumulatedWeeks();

  if (session.gameType === "accumulated_special") {
    if (week.playedSessionId === session.id) {
      return week;
    }

    const playedWeek: AccumulatedWeek = {
      ...week,
      amount: 0,
      status: "played",
      playedAt: session.endedAt ?? new Date().toISOString(),
      playedSessionId: session.id,
      appliedSessionIds: week.appliedSessionIds.includes(session.id)
        ? week.appliedSessionIds
        : [...week.appliedSessionIds, session.id],
    };
    const nextRange = getWeekRange(new Date(new Date(playedWeek.weekEnd).getTime() + 24 * 60 * 60 * 1000));
    const nextWeek = normalizeWeek({
      restaurantId: session.restaurantId,
      weekStart: nextRange.weekStart,
      weekEnd: nextRange.weekEnd,
      amount: 0,
      status: "active",
      appliedSessionIds: [],
    });

    saveAccumulatedWeeks([
      nextWeek,
      playedWeek,
      ...weeks.filter((item) => item.id !== week.id && item.id !== nextWeek.id),
    ]);
    return playedWeek;
  }

  if (
    session.gameType !== "normal" ||
    !restaurant?.accumulatedEnabled ||
    session.accumulatedContributionAmount <= 0 ||
    week.appliedSessionIds.includes(session.id)
  ) {
    return week;
  }

  const updatedWeek: AccumulatedWeek = {
    ...week,
    amount: week.amount + session.accumulatedContributionAmount,
    appliedSessionIds: [...week.appliedSessionIds, session.id],
  };

  saveAccumulatedWeeks([updatedWeek, ...weeks.filter((item) => item.id !== week.id)]);
  return updatedWeek;
}

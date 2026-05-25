import type { Session } from "@/lib/sessions/sessionStorage";

function countsAsSale(session: Session) {
  return session.status === "active" || session.status === "completed";
}

export function getSessionGrossRevenue(session: Session) {
  if (!countsAsSale(session)) {
    return 0;
  }

  return session.grossRevenue ?? session.activeTables * session.tablePrice;
}

export function getSessionRestaurantCommissionAmount(session: Session) {
  if (!countsAsSale(session)) {
    return 0;
  }

  return (
    session.restaurantCommissionAmount ??
    session.commissionRestaurantAmount ??
    Math.round(
      getSessionGrossRevenue(session) *
        ((session.restaurantCommissionPercent ??
          session.commissionRestaurantPercent ??
          session.commissionPercent ??
          0) /
          100),
    )
  );
}

export function getSessionHlFixedFee(session: Session) {
  if (!countsAsSale(session)) {
    return 0;
  }

  return session.hlCommissionAmount ?? session.commissionHLAmount ?? session.hlFixedFee ?? 0;
}

export function getSessionPrizeAmount(session: Session) {
  if (!countsAsSale(session)) {
    return 0;
  }

  return (
    session.prizeAmount ??
    Math.max(
      0,
      getSessionGrossRevenue(session) -
        (session.commissionTotalAmount ?? getSessionRestaurantCommissionAmount(session)),
    )
  );
}

export function getSessionRestaurantNetAmount(session: Session) {
  if (!countsAsSale(session)) {
    return 0;
  }

  return (
    session.restaurantNetAmount ??
    (session.hlCommissionMode === "percent"
      ? getSessionRestaurantCommissionAmount(session)
      : Math.max(0, getSessionRestaurantCommissionAmount(session) - getSessionHlFixedFee(session)))
  );
}

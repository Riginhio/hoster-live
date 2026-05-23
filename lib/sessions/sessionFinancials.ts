import type { Session } from "@/lib/sessions/sessionStorage";

export function getSessionGrossRevenue(session: Session) {
  return session.grossRevenue ?? session.activeTables * session.tablePrice;
}

export function getSessionRestaurantCommissionAmount(session: Session) {
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
  return session.hlCommissionAmount ?? session.commissionHLAmount ?? session.hlFixedFee ?? 0;
}

export function getSessionPrizeAmount(session: Session) {
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
  return (
    session.restaurantNetAmount ??
    (session.hlCommissionMode === "percent"
      ? getSessionRestaurantCommissionAmount(session)
      : Math.max(0, getSessionRestaurantCommissionAmount(session) - getSessionHlFixedFee(session)))
  );
}

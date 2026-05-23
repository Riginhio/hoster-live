export type FinancialBreakdown = {
  grossRevenue: number;
  restaurantCommissionPercent: number;
  restaurantCommissionAmount: number;
  hlCommissionMode: "fixed" | "percent";
  hlCommissionValue: number;
  hlCommissionAmount: number;
  commissionTotalPercent: number;
  commissionTotalAmount: number;
  hlFixedFee: number;
  prizeAmount: number;
  restaurantNetAmount: number;
  commissionHLPercent: number;
  commissionRestaurantPercent: number;
  commissionNetPercent: number;
  commissionHLAmount: number;
  commissionRestaurantAmount: number;
  commissionNetAmount: number;
};

export function calculateFinancialBreakdown(input: {
  activeTables: number;
  tablePrice: number;
  restaurantCommissionPercent?: number;
  hlCommissionMode?: "fixed" | "percent";
  hlCommissionValue?: number;
  hlFixedFee?: number;
  commissionHLAmount?: number;
  commissionHLPercent?: number;
  commissionRestaurantPercent?: number;
  commissionPercent?: number;
}): FinancialBreakdown {
  const grossRevenue = input.activeTables * input.tablePrice;
  const restaurantCommissionPercent = Math.max(
    0,
    input.restaurantCommissionPercent ??
      input.commissionRestaurantPercent ??
      input.commissionPercent ??
      0,
  );
  const restaurantCommissionAmount = Math.round(
    grossRevenue * (restaurantCommissionPercent / 100),
  );
  const hlCommissionMode = input.hlCommissionMode ?? (input.hlFixedFee !== undefined ? "fixed" : "fixed");
  const hlCommissionValue = Math.max(
    0,
    input.hlCommissionValue ?? input.hlFixedFee ?? input.commissionHLAmount ?? 0,
  );
  const hlCommissionAmount =
    hlCommissionMode === "percent"
      ? Math.round(grossRevenue * (hlCommissionValue / 100))
      : Math.round(hlCommissionValue);
  const commissionTotalPercent =
    hlCommissionMode === "percent"
      ? restaurantCommissionPercent + hlCommissionValue
      : restaurantCommissionPercent;
  const commissionTotalAmount =
    hlCommissionMode === "percent"
      ? restaurantCommissionAmount + hlCommissionAmount
      : restaurantCommissionAmount;
  const prizeAmount = Math.max(0, grossRevenue - commissionTotalAmount);
  const restaurantNetAmount =
    hlCommissionMode === "fixed"
      ? Math.max(0, restaurantCommissionAmount - hlCommissionAmount)
      : restaurantCommissionAmount;

  return {
    grossRevenue,
    restaurantCommissionPercent,
    restaurantCommissionAmount,
    hlCommissionMode,
    hlCommissionValue,
    hlCommissionAmount,
    commissionTotalPercent,
    commissionTotalAmount,
    hlFixedFee: hlCommissionMode === "fixed" ? hlCommissionAmount : 0,
    prizeAmount,
    restaurantNetAmount,
    commissionHLPercent: hlCommissionMode === "percent" ? hlCommissionValue : 0,
    commissionRestaurantPercent: restaurantCommissionPercent,
    commissionNetPercent: commissionTotalPercent,
    commissionHLAmount: hlCommissionAmount,
    commissionRestaurantAmount: restaurantCommissionAmount,
    commissionNetAmount: commissionTotalAmount,
  };
}

export type FinancialBreakdown = {
  grossRevenue: number;
  commissionHLPercent: number;
  commissionRestaurantPercent: number;
  commissionNetPercent: number;
  commissionHLAmount: number;
  commissionRestaurantAmount: number;
  commissionNetAmount: number;
  prizeAmount: number;
};

export function calculateFinancialBreakdown(input: {
  activeTables: number;
  tablePrice: number;
  commissionHLPercent?: number;
  commissionRestaurantPercent?: number;
  commissionPercent?: number;
}): FinancialBreakdown {
  const grossRevenue = input.activeTables * input.tablePrice;
  const commissionHLPercent = Math.max(0, input.commissionHLPercent ?? 0);
  const commissionRestaurantPercent = Math.max(
    0,
    input.commissionRestaurantPercent ?? input.commissionPercent ?? 0,
  );
  const commissionNetPercent = Math.min(100, commissionHLPercent + commissionRestaurantPercent);
  const commissionHLAmount = Math.round(grossRevenue * (commissionHLPercent / 100));
  const commissionRestaurantAmount = Math.round(
    grossRevenue * (commissionRestaurantPercent / 100),
  );
  const commissionNetAmount = commissionHLAmount + commissionRestaurantAmount;

  return {
    grossRevenue,
    commissionHLPercent,
    commissionRestaurantPercent,
    commissionNetPercent,
    commissionHLAmount,
    commissionRestaurantAmount,
    commissionNetAmount,
    prizeAmount: Math.max(0, grossRevenue - commissionNetAmount),
  };
}

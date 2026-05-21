export type DashboardKpi = {
  label: string;
  value: string;
  note: string;
};

export type RestaurantRankingRow = {
  name: string;
  games: number;
  grossRevenue: number;
  profit: number;
  status: "active" | "paused" | "review";
};

export type WeeklyMetric = {
  day: string;
  revenue: number;
  games: number;
};

export type RecentGameActivity = {
  restaurant: string;
  mode: string;
  prize: number;
  time: string;
};

export const dashboardKpis: DashboardKpi[] = [
  {
    label: "Ingreso bruto",
    value: "$428,600",
    note: "+18% vs. semana anterior",
  },
  {
    label: "Comision restaurantes",
    value: "$94,292",
    note: "Promedio operativo 22%",
  },
  {
    label: "Utilidad Hoster Live",
    value: "$71,480",
    note: "Margen neto mock 16.7%",
  },
  {
    label: "Premios entregados",
    value: "$262,828",
    note: "42 premios liquidados",
  },
  {
    label: "Jugadas activas",
    value: "18",
    note: "6 venues en vivo",
  },
  {
    label: "Ticket promedio",
    value: "$142",
    note: "Por tabla registrada",
  },
];

export const restaurantRanking: RestaurantRankingRow[] = [
  {
    name: "Doroteo",
    games: 34,
    grossRevenue: 128400,
    profit: 23112,
    status: "active",
  },
  {
    name: "Rancho Viejo",
    games: 29,
    grossRevenue: 96400,
    profit: 17352,
    status: "active",
  },
  {
    name: "Casa Norte",
    games: 21,
    grossRevenue: 74250,
    profit: 11880,
    status: "review",
  },
  {
    name: "Terraza 88",
    games: 18,
    grossRevenue: 58100,
    profit: 9296,
    status: "active",
  },
  {
    name: "Salon Aurora",
    games: 12,
    grossRevenue: 39200,
    profit: 5488,
    status: "paused",
  },
];

export const weeklyMetrics: WeeklyMetric[] = [
  { day: "Lun", revenue: 38600, games: 11 },
  { day: "Mar", revenue: 42100, games: 13 },
  { day: "Mie", revenue: 48300, games: 15 },
  { day: "Jue", revenue: 61200, games: 18 },
  { day: "Vie", revenue: 88400, games: 26 },
  { day: "Sab", revenue: 103800, games: 31 },
  { day: "Dom", revenue: 46200, games: 14 },
];

export const recentGameActivity: RecentGameActivity[] = [
  {
    restaurant: "Doroteo",
    mode: "Figura X",
    prize: 18400,
    time: "22:48",
  },
  {
    restaurant: "Rancho Viejo",
    mode: "4 esquinas",
    prize: 12000,
    time: "22:16",
  },
  {
    restaurant: "Terraza 88",
    mode: "Centro 4",
    prize: 9800,
    time: "21:42",
  },
  {
    restaurant: "Casa Norte",
    mode: "Figura X",
    prize: 15600,
    time: "21:05",
  },
  {
    restaurant: "Salon Aurora",
    mode: "4 esquinas",
    prize: 7200,
    time: "20:31",
  },
];

import type { WinMode } from "@/lib/loteria";

export type BusinessType =
  | "bar"
  | "restaurante_bar"
  | "antro"
  | "restaurante_hostes"
  | "restaurante_familiar"
  | "salon_eventos"
  | "activacion_temporal"
  | "otro";

export type RestaurantConfig = {
  id: string;
  name: string;
  active: boolean;
  businessType: BusinessType;
  managerName: string;
  managerWhatsapp: string;
  managerEmail: string;
  ownerName: string;
  ownerWhatsapp: string;
  address: string;
  googleMapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  averageHostesses: number;
  strongDays: string[];
  estimatedGamesPerWeek: number;
  audienceType: string;
  notes: string;
  commissionPercent: number;
  allowedTableCounts: number[];
  allowedPrices: number[];
  allowedModes: WinMode[];
  enabledGames: string[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
};

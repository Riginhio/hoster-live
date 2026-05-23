import type { WinMode } from "@/lib/loteria";
import type { DeckId, GameId } from "@/lib/decks";

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
  slug: string;
  name: string;
  logoUrl: string;
  active: boolean;
  isActive: boolean;
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
  audienceType: string[];
  audienceNotes: string;
  notes: string;
  restaurantCommissionPercent: number;
  hlCommissionMode: "fixed" | "percent";
  hlCommissionValue: number;
  hlFixedFee: number;
  activeDeck: DeckId;
  commissionPercent: number;
  commissionHLPercent: number;
  commissionRestaurantPercent: number;
  allowedTableCounts: number[];
  allowedPrices: number[];
  allowedModes: WinMode[];
  enabledGames: string[];
  activeGames: GameId[];
  enabledDecks: DeckId[];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  autoplayDefault: boolean;
  autoplayInterval: number;
  showClock: boolean;
  showSponsors: boolean;
  showPromotions: boolean;
  showQRPromo: boolean;
  promoTitle: string;
  promoSubtitle: string;
  promoImageUrl: string;
  standbyTitle: string;
  standbySubtitle: string;
  standbyImageUrl: string;
  standbyPromoText: string;
  standbyCtaText: string;
  standbyCtaQrUrl: string;
  standbyRotatePromotions: boolean;
  instagram: string;
  facebook: string;
  tiktok: string;
  qrCampaignId: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
};

export type QrCampaign = {
  id: string;
  name: string;
  active: boolean;
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  sponsorName: string;
  sponsorLogoUrl: string;
  bannerImageUrl: string;
  validFrom: string;
  validTo: string;
  appliesToRestaurantIds: string[] | "all";
};

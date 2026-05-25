"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Gamepad2, Pencil, Plus, Power, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { readImageFileAsDataUrl } from "@/lib/browserFiles";
import type { WinMode } from "@/lib/loteria";
import type { DeckId, GameId } from "@/lib/decks";
import type { BusinessType, RestaurantConfig } from "@/lib/types";
import {
  createRestaurant,
  getRestaurants,
  toggleRestaurant,
  updateRestaurant,
} from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

type RestaurantFormState = {
  name: string;
  slug: string;
  logoUrl: string;
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
  strongDays: string[];
  audienceType: string[];
  audienceNotes: string;
  notes: string;
  restaurantCommissionPercent: string;
  hlCommissionMode: "fixed" | "percent";
  hlCommissionValue: string;
  accumulatedEnabled: boolean;
  accumulatedAmountPerGame: string;
  accumulatedDay: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
  accumulatedTablePrice: string;
  accumulatedTableCount: string;
  activeDeck: DeckId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  autoplayDefault: boolean;
  autoplayInterval: string;
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
  allowedPrices: number[];
  defaultTablePrice: string;
  allowedModes: WinMode[];
  allowedTableCounts: number[];
  enabledGames: GameId[];
  activeGames: GameId[];
  enabledDecks: DeckId[];
};

const businessTypeOptions: Array<{ value: BusinessType; label: string }> = [
  { value: "bar", label: "Bar" },
  { value: "restaurante_bar", label: "Restaurante bar" },
  { value: "antro", label: "Antro" },
  { value: "restaurante_hostes", label: "Restaurante con hostes" },
  { value: "restaurante_familiar", label: "Restaurante familiar" },
  { value: "salon_eventos", label: "Salon de eventos" },
  { value: "activacion_temporal", label: "Activacion temporal" },
  { value: "otro", label: "Otro" },
];
const activeGameOptions: GameId[] = ["loteria"];
const deckOptions: DeckId[] = ["loteria", "worldcup2026"];
const priceOptions = [50, 100, 150, 200, 250, 300, 500, 1000];
const tableOptions = [10, 20, 30, 40, 50, 60, 80, 100];
const dayOptions = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const audienceTypeOptions = [
  "Familiar infantil",
  "Familiar juvenil",
  "Jovenes",
  "Adultos 30 a 45",
  "Adultos 46 a 60",
  "NSE medio",
  "NSE medio alto",
  "NSE alto",
  "Mixto / general",
];
const modeOptions: Array<{ value: WinMode; label: string }> = [
  { value: "four_corners", label: "4 esquinas" },
  { value: "x_shape", label: "Figura X" },
  { value: "center_four", label: "Centro 4" },
  { value: "full_card", label: "Llena" },
];

const inputClassName =
  "h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";
const textareaClassName =
  "min-h-24 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 py-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";

const emptyForm: RestaurantFormState = {
  name: "",
  slug: "",
  logoUrl: "",
  businessType: "restaurante_bar",
  managerName: "",
  managerWhatsapp: "",
  managerEmail: "",
  ownerName: "",
  ownerWhatsapp: "",
  address: "",
  googleMapsUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  strongDays: ["viernes", "sabado"],
  audienceType: ["Mixto / general"],
  audienceNotes: "",
  notes: "",
  restaurantCommissionPercent: "30",
  hlCommissionMode: "fixed",
  hlCommissionValue: "300",
  accumulatedEnabled: false,
  accumulatedAmountPerGame: "100",
  accumulatedDay: "lunes",
  accumulatedTablePrice: "300",
  accumulatedTableCount: "30",
  activeDeck: "loteria",
  primaryColor: "#d9a441",
  secondaryColor: "#1fa187",
  accentColor: "#c0392b",
  autoplayDefault: true,
  autoplayInterval: "5000",
  showClock: true,
  showSponsors: true,
  showPromotions: true,
  showQRPromo: true,
  promoTitle: "",
  promoSubtitle: "",
  promoImageUrl: "",
  standbyTitle: "",
  standbySubtitle: "",
  standbyImageUrl: "",
  standbyPromoText: "",
  standbyCtaText: "",
  standbyCtaQrUrl: "",
  standbyRotatePromotions: true,
  instagram: "",
  facebook: "",
  tiktok: "",
  qrCampaignId: "",
  allowedPrices: [50, 100, 150, 200, 300],
  defaultTablePrice: "100",
  allowedModes: ["four_corners"],
  allowedTableCounts: [20, 30, 50],
  enabledGames: ["loteria"],
  activeGames: ["loteria"],
  enabledDecks: ["loteria", "worldcup2026"],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseMoneyValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== "string") {
    return NaN;
  }

  const normalizedValue = value.replace(/[$,\s]/g, "");
  return normalizedValue ? Number(normalizedValue) : NaN;
}

function normalizeMoneyArray(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map(parseMoneyValue)
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.round(value)),
    ),
  ).sort((left, right) => left - right);
}

function getAllowedPricesWithRequiredValues(
  allowedPrices: unknown[],
  ...requiredValues: unknown[]
) {
  return normalizeMoneyArray([...allowedPrices, ...requiredValues]);
}

function getBusinessTypeLabel(value: BusinessType) {
  return businessTypeOptions.find((option) => option.value === value)?.label ?? "Otro";
}

function getGameLabel(value: string) {
  if (value === "loteria") {
    return "Loteria";
  }

  return value === "worldcup2026" || value === "fifa2026" ? "FIFA 2026" : value;
}

function toggleNumberValue(values: number[], value: number) {
  const normalizedValues = normalizeMoneyArray(values);
  const normalizedValue = parseMoneyValue(value);

  return normalizedValues.includes(normalizedValue)
    ? normalizedValues.filter((currentValue) => currentValue !== normalizedValue)
    : [...normalizedValues, normalizedValue].sort((left, right) => left - right);
}

function toggleStringValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function toggleModeValue(values: WinMode[], value: WinMode) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function toFormState(restaurant: RestaurantConfig): RestaurantFormState {
  const defaultTablePrice = parseMoneyValue(
    restaurant.defaultTablePrice ?? restaurant.allowedPrices[0] ?? 100,
  );
  const accumulatedTablePrice = parseMoneyValue(restaurant.accumulatedTablePrice);
  const allowedPrices = getAllowedPricesWithRequiredValues(
    restaurant.allowedPrices,
    defaultTablePrice,
    accumulatedTablePrice,
  );

  return {
    name: restaurant.name,
    slug: restaurant.slug,
    logoUrl: restaurant.logoUrl,
    businessType: restaurant.businessType,
    managerName: restaurant.managerName,
    managerWhatsapp: restaurant.managerWhatsapp,
    managerEmail: restaurant.managerEmail,
    ownerName: restaurant.ownerName,
    ownerWhatsapp: restaurant.ownerWhatsapp,
    address: restaurant.address,
    googleMapsUrl: restaurant.googleMapsUrl,
    instagramUrl: restaurant.instagramUrl,
    facebookUrl: restaurant.facebookUrl,
    tiktokUrl: restaurant.tiktokUrl,
    strongDays: restaurant.strongDays,
    audienceType: restaurant.audienceType,
    audienceNotes: restaurant.audienceNotes,
    notes: restaurant.notes,
    restaurantCommissionPercent: String(restaurant.restaurantCommissionPercent),
    hlCommissionMode: restaurant.hlCommissionMode,
    hlCommissionValue: String(restaurant.hlCommissionValue),
    accumulatedEnabled: restaurant.accumulatedEnabled,
    accumulatedAmountPerGame: String(restaurant.accumulatedAmountPerGame),
    accumulatedDay: restaurant.accumulatedDay,
    accumulatedTablePrice: String(accumulatedTablePrice),
    accumulatedTableCount: String(restaurant.accumulatedTableCount),
    activeDeck: restaurant.activeDeck,
    primaryColor: restaurant.primaryColor,
    secondaryColor: restaurant.secondaryColor,
    accentColor: restaurant.accentColor,
    autoplayDefault: restaurant.autoplayDefault,
    autoplayInterval: String(restaurant.autoplayInterval),
    showClock: restaurant.showClock,
    showSponsors: restaurant.showSponsors,
    showPromotions: restaurant.showPromotions,
    showQRPromo: restaurant.showQRPromo,
    promoTitle: restaurant.promoTitle,
    promoSubtitle: restaurant.promoSubtitle,
    promoImageUrl: restaurant.promoImageUrl,
    standbyTitle: restaurant.standbyTitle,
    standbySubtitle: restaurant.standbySubtitle,
    standbyImageUrl: restaurant.standbyImageUrl,
    standbyPromoText: restaurant.standbyPromoText,
    standbyCtaText: restaurant.standbyCtaText,
    standbyCtaQrUrl: restaurant.standbyCtaQrUrl,
    standbyRotatePromotions: restaurant.standbyRotatePromotions,
    instagram: restaurant.instagram,
    facebook: restaurant.facebook,
    tiktok: restaurant.tiktok,
    qrCampaignId: restaurant.qrCampaignId,
    allowedPrices,
    defaultTablePrice: String(defaultTablePrice),
    allowedModes: restaurant.allowedModes,
    allowedTableCounts: restaurant.allowedTableCounts,
    enabledGames: restaurant.activeGames,
    activeGames: restaurant.activeGames,
    enabledDecks: restaurant.enabledDecks,
  };
}

function validateForm(formState: RestaurantFormState) {
  const restaurantCommissionPercent = Number(formState.restaurantCommissionPercent);
  const hlCommissionValue = Number(formState.hlCommissionValue);
  const accumulatedAmountPerGame = parseMoneyValue(formState.accumulatedAmountPerGame);
  const accumulatedTablePrice = parseMoneyValue(formState.accumulatedTablePrice);
  const accumulatedTableCount = Number(formState.accumulatedTableCount);
  const defaultTablePrice = parseMoneyValue(formState.defaultTablePrice);
  const allowedPrices = getAllowedPricesWithRequiredValues(
    formState.allowedPrices,
    defaultTablePrice,
    formState.accumulatedEnabled ? accumulatedTablePrice : undefined,
  );

  console.log("[HOSTER LIVE] validate restaurant prices", {
    rawAllowedPrices: formState.allowedPrices,
    normalizedAllowedPrices: allowedPrices,
    rawDefaultTablePrice: formState.defaultTablePrice,
    normalizedDefaultTablePrice: defaultTablePrice,
  });

  if (!formState.name.trim()) {
    return "El nombre del restaurante es obligatorio.";
  }

  if (!Number.isFinite(restaurantCommissionPercent) || restaurantCommissionPercent < 0) {
    return "La comision del restaurante no puede ser menor a 0%.";
  }

  if (restaurantCommissionPercent > 100) {
    return "La comision del restaurante no puede ser mayor a 100%.";
  }

  if (!Number.isFinite(hlCommissionValue) || hlCommissionValue < 0) {
    return "La comision HL debe ser un valor valido.";
  }

  if (formState.hlCommissionMode === "percent" && hlCommissionValue > 100) {
    return "La comision HL porcentual no puede ser mayor a 100%.";
  }

  if (
    formState.accumulatedEnabled &&
    (!Number.isFinite(accumulatedAmountPerGame) || accumulatedAmountPerGame < 0)
  ) {
    return "El monto acumulado por jugada debe ser valido.";
  }

  if (allowedPrices.length === 0) {
    return "Selecciona al menos un costo permitido.";
  }

  if (!Number.isFinite(defaultTablePrice)) {
    return "Selecciona un costo default valido.";
  }
  
  if (formState.accumulatedEnabled && !Number.isFinite(accumulatedTablePrice)) {
    return "Selecciona un costo de tabla acumulado valido.";
  }

  if (allowedPrices.some((price) => price % 50 !== 0)) {
    return "Todos los precios deben ser multiplos de 50.";
  }

  if (formState.allowedModes.length === 0) {
    return "Selecciona al menos una modalidad.";
  }

  if (formState.allowedTableCounts.length === 0) {
    return "Selecciona al menos una cantidad de tablas.";
  }

  if (formState.accumulatedEnabled && !formState.allowedTableCounts.includes(accumulatedTableCount)) {
    return "La cantidad de tablas del acumulado debe estar permitida.";
  }

  if (formState.activeGames.length === 0) {
    return "Selecciona al menos un juego activo.";
  }

  if (formState.enabledDecks.length === 0) {
    return "Selecciona al menos un deck disponible.";
  }

  return undefined;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("grid gap-2", className)}>
      <span className="text-sm font-semibold text-bone">{label}</span>
      {children}
    </label>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-bone/10 bg-bone/[0.025] p-4">
      <h4 className="font-display text-2xl text-bone">{title}</h4>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function RestaurantesPage() {
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<RestaurantFormState>(emptyForm);
  const [formError, setFormError] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<"all" | BusinessType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [gameFilter, setGameFilter] = useState("all");

  useEffect(() => {
    setRestaurants(getRestaurants());
  }, []);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeForm();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormOpen]);

  const filteredRestaurants = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesBusinessType =
        businessTypeFilter === "all" || restaurant.businessType === businessTypeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? restaurant.active : !restaurant.active);
      const matchesGame =
        gameFilter === "all" ||
        restaurant.activeGames.some((game) => game === gameFilter) ||
        restaurant.enabledDecks.some((deck) => deck === gameFilter);
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        restaurant.name.toLowerCase().includes(normalizedSearchTerm) ||
        restaurant.managerName.toLowerCase().includes(normalizedSearchTerm) ||
        restaurant.managerWhatsapp.toLowerCase().includes(normalizedSearchTerm);

      return matchesBusinessType && matchesStatus && matchesGame && matchesSearch;
    });
  }, [businessTypeFilter, gameFilter, restaurants, searchTerm, statusFilter]);

  const activeRestaurantCount = useMemo(
    () => restaurants.filter((restaurant) => restaurant.active).length,
    [restaurants],
  );

  const averageCommission = useMemo(() => {
    if (restaurants.length === 0) {
      return 0;
    }

    const totalCommission = restaurants.reduce(
      (total, restaurant) => total + restaurant.restaurantCommissionPercent,
      0,
    );

    return Math.round(totalCommission / restaurants.length);
  }, [restaurants]);

  function refreshRestaurants() {
    setRestaurants(getRestaurants());
  }

  function openCreateForm() {
    setEditingRestaurant(null);
    setFormState(emptyForm);
    setFormError(undefined);
    setIsFormOpen(true);
  }

  function openEditForm(restaurant: RestaurantConfig) {
    setEditingRestaurant(restaurant);
    setFormState(toFormState(restaurant));
    setFormError(undefined);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRestaurant(null);
    setFormError(undefined);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const error = validateForm(formState);

    if (error) {
      setFormError(error);
      return;
    }

    const normalizedActiveGames: GameId[] = formState.activeGames.includes("loteria")
      ? ["loteria"]
      : [];
    const normalizedEnabledDecks = formState.enabledDecks.length
      ? formState.enabledDecks
      : (["loteria"] as DeckId[]);
    const normalizedActiveDeck = normalizedEnabledDecks.includes(formState.activeDeck)
      ? formState.activeDeck
      : normalizedEnabledDecks[0];
    const normalizedDefaultTablePrice = parseMoneyValue(formState.defaultTablePrice);
    const normalizedAccumulatedAmountPerGame = parseMoneyValue(formState.accumulatedAmountPerGame);
    const normalizedAccumulatedTablePrice = parseMoneyValue(formState.accumulatedTablePrice);
    const normalizedAllowedPrices = getAllowedPricesWithRequiredValues(
      formState.allowedPrices,
      normalizedDefaultTablePrice,
      formState.accumulatedEnabled ? normalizedAccumulatedTablePrice : undefined,
    );

    const payload = {
      name: formState.name.trim(),
      slug: normalizeRestaurantSlug(formState.slug || formState.name),
      logoUrl: formState.logoUrl.trim(),
      businessType: formState.businessType,
      managerName: formState.managerName.trim(),
      managerWhatsapp: formState.managerWhatsapp.trim(),
      managerEmail: formState.managerEmail.trim(),
      ownerName: formState.ownerName.trim(),
      ownerWhatsapp: formState.ownerWhatsapp.trim(),
      address: formState.address.trim(),
      googleMapsUrl: formState.googleMapsUrl.trim(),
      instagramUrl: formState.instagramUrl.trim(),
      facebookUrl: formState.facebookUrl.trim(),
      tiktokUrl: formState.tiktokUrl.trim(),
      strongDays: formState.strongDays,
      averageHostesses: 0,
      estimatedGamesPerWeek: 0,
      audienceType: formState.audienceType,
      audienceNotes: formState.audienceNotes.trim(),
      notes: formState.notes.trim(),
      restaurantCommissionPercent: Number(formState.restaurantCommissionPercent),
      hlCommissionMode: formState.hlCommissionMode,
      hlCommissionValue: Number(formState.hlCommissionValue),
      hlFixedFee:
        formState.hlCommissionMode === "fixed" ? Number(formState.hlCommissionValue) : 0,
      accumulatedEnabled: formState.accumulatedEnabled,
      accumulatedAmountPerGame: normalizedAccumulatedAmountPerGame,
      accumulatedDay: formState.accumulatedDay,
      accumulatedTablePrice: normalizedAccumulatedTablePrice,
      accumulatedTableCount: Number(formState.accumulatedTableCount),
      activeDeck: normalizedActiveDeck,
      commissionHLPercent:
        formState.hlCommissionMode === "percent" ? Number(formState.hlCommissionValue) : 0,
      commissionRestaurantPercent: Number(formState.restaurantCommissionPercent),
      commissionPercent: Number(formState.restaurantCommissionPercent),
      primaryColor: formState.primaryColor,
      secondaryColor: formState.secondaryColor,
      accentColor: formState.accentColor,
      autoplayDefault: formState.autoplayDefault,
      autoplayInterval: Number(formState.autoplayInterval),
      showClock: formState.showClock,
      showSponsors: formState.showSponsors,
      showPromotions: formState.showPromotions,
      showQRPromo: formState.showQRPromo,
      promoTitle: formState.promoTitle.trim(),
      promoSubtitle: formState.promoSubtitle.trim(),
      promoImageUrl: formState.promoImageUrl.trim(),
      standbyTitle: formState.standbyTitle.trim(),
      standbySubtitle: formState.standbySubtitle.trim(),
      standbyImageUrl: formState.standbyImageUrl.trim(),
      standbyPromoText: formState.standbyPromoText.trim(),
      standbyCtaText: formState.standbyCtaText.trim(),
      standbyCtaQrUrl: formState.standbyCtaQrUrl.trim(),
      standbyRotatePromotions: formState.standbyRotatePromotions,
      instagram: formState.instagram.trim(),
      facebook: formState.facebook.trim(),
      tiktok: formState.tiktok.trim(),
      qrCampaignId: formState.qrCampaignId.trim(),
      allowedPrices: normalizedAllowedPrices,
      defaultTablePrice: normalizedDefaultTablePrice,
      allowedModes: formState.allowedModes,
      allowedTableCounts: formState.allowedTableCounts,
      enabledGames: normalizedActiveGames,
      activeGames: normalizedActiveGames,
      enabledDecks: normalizedEnabledDecks,
      theme: {
        primaryColor: formState.primaryColor,
        secondaryColor: formState.secondaryColor,
      },
    };

    if (editingRestaurant) {
      updateRestaurant(editingRestaurant.id, payload);
    } else {
      createRestaurant(payload);
    }

    refreshRestaurants();
    closeForm();
  }

  function handleToggleRestaurant(restaurantId: string) {
    toggleRestaurant(restaurantId);
    refreshRestaurants();
  }

  async function handleImageFile(
    file: File | undefined,
    key: "logoUrl" | "promoImageUrl" | "standbyImageUrl",
  ) {
    if (!file) {
      return;
    }

    const dataUrl = await readImageFileAsDataUrl(file);
    setFormState((currentState) => ({ ...currentState, [key]: dataUrl }));
  }

  return (
    <Layout title="Restaurantes" eyebrow="Master">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card accent className="overflow-hidden border-mezcal/30 bg-charcoal/88">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
                HOSTER LIVE CRM
              </p>
              <h2 className="mt-3 font-display text-4xl text-bone md:text-5xl">
                Restaurantes configurables
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
                Administra venues, contactos, operacion semanal y configuracion de juego desde una
                fuente persistente en el navegador.
              </p>
            </div>
            <Button onClick={openCreateForm} className="w-full md:w-auto">
              <Plus size={18} />
              Crear restaurante
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card className="bg-bone/[0.045]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">Activos</p>
            <p className="mt-2 font-display text-4xl text-bone">
              {activeRestaurantCount}/{restaurants.length}
            </p>
          </Card>
          <Card className="bg-bone/[0.045]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">
              Comision prom.
            </p>
            <p className="mt-2 font-display text-4xl text-bone">{averageCommission}%</p>
          </Card>
        </div>
      </div>

      <Card className="mb-4 bg-bone/[0.035]">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_0.75fr_0.75fr]">
          <label className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone/35"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, gerente o WhatsApp"
              className={clsx(inputClassName, "w-full pl-10")}
            />
          </label>
          <select
            value={businessTypeFilter}
            onChange={(event) => setBusinessTypeFilter(event.target.value as "all" | BusinessType)}
            className={inputClassName}
          >
            <option value="all">Todos los giros</option>
            {businessTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "inactive")
            }
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select
            value={gameFilter}
            onChange={(event) => setGameFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="all">Todos los juegos</option>
            {[...activeGameOptions, ...deckOptions.filter((deck) => deck !== "loteria")].map((game) => (
              <option key={game} value={game}>
                {getGameLabel(game)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-1 border-b border-bone/10 px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-display text-2xl text-bone">Directorio operativo</h3>
            <p className="mt-1 text-sm text-bone/48">
              {filteredRestaurants.length} de {restaurants.length} restaurantes visibles
            </p>
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead className="bg-bone/[0.035] text-left text-xs uppercase tracking-[0.18em] text-bone/45">
              <tr>
                <th className="px-5 py-4 font-semibold">Nombre</th>
                <th className="px-5 py-4 font-semibold">Giro</th>
                <th className="px-5 py-4 font-semibold">Gerente</th>
                <th className="px-5 py-4 font-semibold">WhatsApp</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Comision</th>
                <th className="px-5 py-4 font-semibold">Juegos</th>
                <th className="px-5 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/10">
              {filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="bg-charcoal/35 transition hover:bg-bone/[0.035]">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-11 w-11 rounded-lg border border-bone/10"
                        style={{
                          background: `linear-gradient(135deg, ${restaurant.theme.primaryColor}, ${restaurant.theme.secondaryColor})`,
                        }}
                      />
                      <div>
                        <p className="font-semibold text-bone">{restaurant.name}</p>
                        <p className="mt-1 text-xs text-bone/45">{restaurant.activeDeck}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-5 text-sm text-bone/70">
                    {getBusinessTypeLabel(restaurant.businessType)}
                  </td>
                  <td className="px-5 py-5 text-sm text-bone/70">{restaurant.managerName}</td>
                  <td className="px-5 py-5 text-sm text-bone/70">{restaurant.managerWhatsapp}</td>
                  <td className="px-5 py-5">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold",
                        restaurant.active
                          ? "bg-agave/16 text-agave ring-1 ring-agave/35"
                          : "bg-bone/8 text-bone/50 ring-1 ring-bone/10",
                      )}
                    >
                      <span
                        className={clsx(
                          "h-2 w-2 rounded-full",
                          restaurant.active ? "bg-agave" : "bg-bone/35",
                        )}
                      />
                      {restaurant.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-5 text-bone">
                    {restaurant.restaurantCommissionPercent}% / HL{" "}
                    {restaurant.hlCommissionMode === "percent"
                      ? `${restaurant.hlCommissionValue}%`
                      : formatCurrency(restaurant.hlCommissionValue)}
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      {[...restaurant.activeGames, ...restaurant.enabledDecks.filter((deck) => deck !== "loteria")].map((game) => (
                        <span
                          key={game}
                          className="inline-flex items-center gap-1 rounded-full bg-mezcal/12 px-3 py-1 text-xs font-semibold text-mezcal ring-1 ring-mezcal/25"
                        >
                          <Gamepad2 size={13} />
                          {getGameLabel(game)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="h-10 w-10 px-0"
                        onClick={() => openEditForm(restaurant)}
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleToggleRestaurant(restaurant.id)}
                        title={restaurant.active ? "Desactivar" : "Activar"}
                        className={clsx(
                          "relative h-10 w-[4.25rem] rounded-full border transition focus:outline-none focus:ring-2 focus:ring-mezcal focus:ring-offset-2 focus:ring-offset-obsidian",
                          restaurant.active
                            ? "border-agave/30 bg-agave/20"
                            : "border-bone/12 bg-bone/8",
                        )}
                      >
                        <span
                          className={clsx(
                            "absolute top-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition",
                            restaurant.active
                              ? "left-[2rem] bg-agave text-obsidian"
                              : "left-1 bg-bone/18 text-bone/70",
                          )}
                        >
                          <Power size={15} />
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 lg:hidden">
          {filteredRestaurants.map((restaurant) => (
            <article
              key={restaurant.id}
              className="rounded-lg border border-bone/10 bg-bone/[0.035] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl text-bone">{restaurant.name}</p>
                  <p className="mt-1 text-sm text-bone/55">
                    {getBusinessTypeLabel(restaurant.businessType)}
                  </p>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    restaurant.active ? "bg-agave/16 text-agave" : "bg-bone/8 text-bone/50",
                  )}
                >
                  {restaurant.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-bone/65">
                <p>Gerente: {restaurant.managerName || "Sin asignar"}</p>
                <p>WhatsApp: {restaurant.managerWhatsapp || "Sin captura"}</p>
                <p>
                  Comision restaurante: {restaurant.restaurantCommissionPercent}% / HL{" "}
                  {restaurant.hlCommissionMode === "percent"
                    ? `${restaurant.hlCommissionValue}%`
                    : formatCurrency(restaurant.hlCommissionValue)}
                </p>
                <p>Juegos: {restaurant.activeGames.map(getGameLabel).join(", ")}</p>
                <p>Decks: {restaurant.enabledDecks.map(getGameLabel).join(", ")}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => openEditForm(restaurant)}
                >
                  <Pencil size={16} />
                  Editar
                </Button>
                <Button
                  variant={restaurant.active ? "danger" : "primary"}
                  className="flex-1"
                  onClick={() => handleToggleRestaurant(restaurant.id)}
                >
                  <Power size={16} />
                  {restaurant.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-obsidian/78 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-lg border border-bone/12 bg-[#100d0b] p-4 shadow-cantina sm:p-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-bone/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
                  {editingRestaurant ? "Editar restaurante" : "Nuevo restaurante"}
                </p>
                <h3 className="mt-2 font-display text-3xl text-bone">Ficha CRM operativa</h3>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-bone/8 text-bone/70 transition hover:bg-bone/12 hover:text-bone"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <FormSection title="Datos del negocio">
                <Field label="Nombre restaurante">
                  <input
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        name: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="Rancho Viejo"
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={formState.slug}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        slug: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="rancho-viejo"
                  />
                </Field>
                <Field label="Logo URL" className="md:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="grid gap-2">
                      <input
                        value={formState.logoUrl}
                        onChange={(event) =>
                          setFormState((currentState) => ({
                            ...currentState,
                            logoUrl: event.target.value,
                          }))
                        }
                        className={inputClassName}
                        placeholder="https://.../logo.png"
                      />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => void handleImageFile(event.target.files?.[0], "logoUrl")}
                        className="text-sm font-semibold text-bone/60 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-mezcal file:px-3 file:text-sm file:font-black file:text-obsidian"
                      />
                    </div>
                    <div className="grid h-16 w-16 place-items-center rounded-lg border border-bone/10 bg-bone/[0.04]">
                      {formState.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formState.logoUrl}
                          alt="Preview logo"
                          className="max-h-14 max-w-14 object-contain"
                        />
                      ) : (
                        <span className="text-xs font-black text-bone/35">PNG</span>
                      )}
                    </div>
                  </div>
                </Field>
                <Field label="Giro">
                  <select
                    value={formState.businessType}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        businessType: event.target.value as BusinessType,
                      }))
                    }
                    className={inputClassName}
                  >
                    {businessTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Direccion" className="md:col-span-2">
                  <input
                    value={formState.address}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        address: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="Calle, numero, colonia, ciudad"
                  />
                </Field>
                <Field label="Google Maps URL" className="md:col-span-2">
                  <input
                    value={formState.googleMapsUrl}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        googleMapsUrl: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="https://maps.google.com/..."
                  />
                </Field>
              </FormSection>

              <FormSection title="Contacto">
                <Field label="Gerente">
                  <input
                    value={formState.managerName}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        managerName: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="WhatsApp gerente">
                  <input
                    value={formState.managerWhatsapp}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        managerWhatsapp: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Email gerente">
                  <input
                    type="email"
                    value={formState.managerEmail}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        managerEmail: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Dueno / propietario">
                  <input
                    value={formState.ownerName}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        ownerName: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="WhatsApp propietario">
                  <input
                    value={formState.ownerWhatsapp}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        ownerWhatsapp: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
              </FormSection>

              <FormSection title="Operacion">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-bone">Dias de operacion</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {dayOptions.map((day) => {
                      const selected = formState.strongDays.includes(day);

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              strongDays: toggleStringValue(currentState.strongDays, day),
                            }))
                          }
                          className={clsx(
                            "flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold capitalize transition",
                            selected
                              ? "border-agave/45 bg-agave/14 text-agave"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {day}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-bone">Tipo de audiencia</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {audienceTypeOptions.map((option) => {
                      const selected = formState.audienceType.includes(option);

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              audienceType: toggleStringValue(currentState.audienceType, option),
                            }))
                          }
                          className={clsx(
                            "flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm font-semibold transition",
                            selected
                              ? "border-agave/45 bg-agave/14 text-agave"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {option}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Notas de audiencia" className="md:col-span-2">
                  <textarea
                    value={formState.audienceNotes}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        audienceNotes: event.target.value,
                      }))
                    }
                    className={textareaClassName}
                    placeholder="Contexto opcional de perfil, horarios o consumo."
                  />
                </Field>
                <Field label="Instagram URL">
                  <input
                    value={formState.instagramUrl}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        instagramUrl: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Facebook URL">
                  <input
                    value={formState.facebookUrl}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        facebookUrl: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="TikTok URL" className="md:col-span-2">
                  <input
                    value={formState.tiktokUrl}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        tiktokUrl: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
              </FormSection>

              <FormSection title="Branding y TV">
                <Field label="Color primario">
                  <input
                    type="color"
                    value={formState.primaryColor}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        primaryColor: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Color secundario">
                  <input
                    type="color"
                    value={formState.secondaryColor}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        secondaryColor: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Color acento">
                  <input
                    type="color"
                    value={formState.accentColor}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        accentColor: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Intervalo autoplay ms">
                  <input
                    type="number"
                    min={3000}
                    step={1000}
                    value={formState.autoplayInterval}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        autoplayInterval: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <div className="grid gap-2 md:col-span-2 sm:grid-cols-2">
                  {[
                    ["autoplayDefault", "Autoplay por default"],
                    ["showClock", "Mostrar reloj"],
                    ["showSponsors", "Mostrar sponsors"],
                    ["showPromotions", "Mostrar promociones"],
                    ["showQRPromo", "Mostrar promo QR"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-bone/10 bg-bone/[0.035] px-3 py-2 text-sm font-semibold text-bone/72"
                    >
                      {label}
                      <input
                        type="checkbox"
                        checked={Boolean(formState[key as keyof RestaurantFormState])}
                        onChange={(event) =>
                          setFormState((currentState) => ({
                            ...currentState,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </FormSection>

              <FormSection title="Promociones y QR">
                <Field label="Titulo promo">
                  <input
                    value={formState.promoTitle}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        promoTitle: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Imagen promocional por URL o archivo">
                  <div className="grid gap-2">
                    <input
                      value={formState.promoImageUrl}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          promoImageUrl: event.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="https://.../promo.png"
                    />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        void handleImageFile(event.target.files?.[0], "promoImageUrl")
                      }
                      className="text-sm font-semibold text-bone/60 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-mezcal file:px-3 file:text-sm file:font-black file:text-obsidian"
                    />
                  </div>
                </Field>
                <Field label="Subtitulo promo" className="md:col-span-2">
                  <textarea
                    value={formState.promoSubtitle}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        promoSubtitle: event.target.value,
                      }))
                    }
                    className={textareaClassName}
                  />
                </Field>
                <Field label="Campana QR">
                  <input
                    value={formState.qrCampaignId}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        qrCampaignId: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Instagram">
                  <input
                    value={formState.instagram}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        instagram: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
              </FormSection>

              <FormSection title="Pantalla Standby TV">
                <Field label="Titulo standby">
                  <input
                    value={formState.standbyTitle}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        standbyTitle: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="HOSTER LIVE"
                  />
                </Field>
                <Field label="Imagen standby por URL o archivo">
                  <div className="grid gap-2">
                    <input
                      value={formState.standbyImageUrl}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          standbyImageUrl: event.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="https://.../standby.png"
                    />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        void handleImageFile(event.target.files?.[0], "standbyImageUrl")
                      }
                      className="text-sm font-semibold text-bone/60 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-mezcal file:px-3 file:text-sm file:font-black file:text-obsidian"
                    />
                  </div>
                </Field>
                <Field label="Subtitulo standby" className="md:col-span-2">
                  <textarea
                    value={formState.standbySubtitle}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        standbySubtitle: event.target.value,
                      }))
                    }
                    className={textareaClassName}
                    placeholder="La proxima jugada esta por comenzar"
                  />
                </Field>
                <Field label="Texto promo" className="md:col-span-2">
                  <textarea
                    value={formState.standbyPromoText}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        standbyPromoText: event.target.value,
                      }))
                    }
                    className={textareaClassName}
                    placeholder="Compra tus tablas con tu hostess"
                  />
                </Field>
                <Field label="CTA">
                  <input
                    value={formState.standbyCtaText}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        standbyCtaText: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="Pide tu tabla ahora"
                  />
                </Field>
                <Field label="Enlace del botón o QR">
                  <input
                    value={formState.standbyCtaQrUrl}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        standbyCtaQrUrl: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <label className="flex items-center justify-between rounded-lg border border-bone/10 bg-bone/[0.035] px-3 py-2 text-sm font-semibold text-bone/72 md:col-span-2">
                  Rotar promociones QR/globales
                  <input
                    type="checkbox"
                    checked={formState.standbyRotatePromotions}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        standbyRotatePromotions: event.target.checked,
                      }))
                    }
                  />
                </label>
                <div className="relative min-h-56 overflow-hidden rounded-lg border border-bone/10 bg-obsidian p-5 md:col-span-2">
                  {formState.standbyImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formState.standbyImageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-25"
                    />
                  ) : null}
                  <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-mezcal">
                      Preview standby
                    </p>
                    <p className="mt-3 font-display text-4xl text-bone">
                      {formState.standbyTitle || "HOSTER LIVE"}
                    </p>
                    <p className="mt-2 max-w-xl text-lg font-semibold text-bone/70">
                      {formState.standbySubtitle || "La proxima jugada esta por comenzar"}
                    </p>
                    <p className="mt-4 inline-flex rounded-lg border border-mezcal/25 bg-mezcal/10 px-4 py-2 text-sm font-black text-mezcal">
                      {formState.standbyPromoText || "Compra tus tablas con tu hostess"}
                    </p>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Configuracion de juego">
                <Field label="Modelo comision HL">
                  <select
                    value={formState.hlCommissionMode}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        hlCommissionMode: event.target.value as "fixed" | "percent",
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="fixed">$ fijo</option>
                    <option value="percent">% de comision</option>
                  </select>
                </Field>
                <Field label={formState.hlCommissionMode === "fixed" ? "Valor HL $" : "Valor HL %"}>
                  <input
                    type="number"
                    min={0}
                    max={formState.hlCommissionMode === "percent" ? 100 : undefined}
                    step={formState.hlCommissionMode === "fixed" ? 50 : 1}
                    value={formState.hlCommissionValue}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        hlCommissionValue: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Comision restaurante %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={formState.restaurantCommissionPercent}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        restaurantCommissionPercent: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <label className="flex items-center justify-between rounded-lg border border-agave/20 bg-agave/10 px-3 py-3 text-sm font-semibold text-bone md:col-span-2">
                  Activar acumulado semanal
                  <input
                    type="checkbox"
                    checked={formState.accumulatedEnabled}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        accumulatedEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <Field label="Monto acumulado por jugada">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={formState.accumulatedAmountPerGame}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        accumulatedAmountPerGame: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Dia de acumulado">
                  <select
                    value={formState.accumulatedDay}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        accumulatedDay: event.target.value as RestaurantFormState["accumulatedDay"],
                      }))
                    }
                    className={inputClassName}
                  >
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Costo tabla acumulado">
                  <select
                    value={formState.accumulatedTablePrice}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        accumulatedTablePrice: String(parseMoneyValue(event.target.value)),
                        allowedPrices: getAllowedPricesWithRequiredValues(
                          currentState.allowedPrices,
                          event.target.value,
                        ),
                      }))
                    }
                    className={inputClassName}
                  >
                    {formState.allowedPrices.map((price) => (
                      <option key={price} value={price}>
                        {formatCurrency(price)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tablas acumulado">
                  <select
                    value={formState.accumulatedTableCount}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        accumulatedTableCount: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    {formState.allowedTableCounts.map((tableCount) => (
                      <option key={tableCount} value={tableCount}>
                        {tableCount}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-lg border border-bone/10 bg-bone/[0.035] p-3 text-sm font-semibold text-bone/65 md:col-span-2">
                  Modalidad acumulado: Tabla llena
                </div>
                <Field label="Deck default">
                  <select
                    value={formState.activeDeck}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        activeDeck: event.target.value as DeckId,
                        enabledDecks: currentState.enabledDecks.includes(event.target.value as DeckId)
                          ? currentState.enabledDecks
                          : [...currentState.enabledDecks, event.target.value as DeckId],
                      }))
                    }
                    className={inputClassName}
                  >
                    {deckOptions.map((deckId) => (
                      <option key={deckId} value={deckId}>
                        {getGameLabel(deckId)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div>
                  <p className="text-sm font-semibold text-bone">Juegos activos</p>
                  <div className="mt-3 grid gap-2">
                    {activeGameOptions.map((game) => {
                      const selected = formState.activeGames.includes(game);

                      return (
                        <button
                          key={game}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              activeGames: toggleStringValue(
                                currentState.activeGames,
                                game,
                              ) as GameId[],
                              enabledGames: toggleStringValue(
                                currentState.activeGames,
                                game,
                              ) as GameId[],
                            }))
                          }
                          className={clsx(
                            "flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
                            selected
                              ? "border-mezcal/45 bg-mezcal/14 text-mezcal"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {getGameLabel(game)}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-bone">Decks disponibles</p>
                  <div className="mt-3 grid gap-2">
                    {deckOptions.map((deckId) => {
                      const selected = formState.enabledDecks.includes(deckId);

                      return (
                        <button
                          key={deckId}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              enabledDecks: selected
                                ? currentState.enabledDecks.filter((item) => item !== deckId)
                                : [...currentState.enabledDecks, deckId],
                              activeDeck:
                                selected && currentState.activeDeck === deckId
                                  ? currentState.enabledDecks.find((item) => item !== deckId) ??
                                    "loteria"
                                  : currentState.activeDeck,
                            }))
                          }
                          className={clsx(
                            "flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
                            selected
                              ? "border-mezcal/45 bg-mezcal/14 text-mezcal"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {getGameLabel(deckId)}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-bone">Costos permitidos</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {priceOptions.map((price) => {
                      const selected = getAllowedPricesWithRequiredValues(
                        formState.allowedPrices,
                        formState.defaultTablePrice,
                        formState.accumulatedEnabled ? formState.accumulatedTablePrice : undefined,
                      ).includes(price);

                      return (
                        <button
                          key={price}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              allowedPrices: toggleNumberValue(
                                currentState.allowedPrices,
                                price,
                              ),
                            }))
                          }
                          className={clsx(
                            "flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
                            selected
                              ? "border-mezcal/45 bg-mezcal/14 text-mezcal"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {formatCurrency(price)}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-3 grid gap-2 sm:max-w-xs">
                    <span className="text-sm font-semibold text-bone">Costo default</span>
                    <select
                      value={formState.defaultTablePrice}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          defaultTablePrice: String(parseMoneyValue(event.target.value)),
                          allowedPrices: getAllowedPricesWithRequiredValues(
                            currentState.allowedPrices,
                            event.target.value,
                          ),
                        }))
                      }
                      className={inputClassName}
                    >
                      {getAllowedPricesWithRequiredValues(
                        formState.allowedPrices,
                        formState.defaultTablePrice,
                      ).map((price) => (
                        <option key={price} value={price}>
                          {formatCurrency(price)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-bone">Modalidades permitidas</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {modeOptions.map((mode) => {
                      const selected = formState.allowedModes.includes(mode.value);

                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              allowedModes: toggleModeValue(
                                currentState.allowedModes,
                                mode.value,
                              ),
                            }))
                          }
                          className={clsx(
                            "flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
                            selected
                              ? "border-agave/45 bg-agave/14 text-agave"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {mode.label}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-bone">Tablas permitidas</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {tableOptions.map((tableCount) => {
                      const selected = formState.allowedTableCounts.includes(tableCount);

                      return (
                        <button
                          key={tableCount}
                          type="button"
                          onClick={() =>
                            setFormState((currentState) => ({
                              ...currentState,
                              allowedTableCounts: toggleNumberValue(
                                currentState.allowedTableCounts,
                                tableCount,
                              ),
                            }))
                          }
                          className={clsx(
                            "flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
                            selected
                              ? "border-bone/35 bg-bone/10 text-bone"
                              : "border-bone/10 bg-bone/[0.035] text-bone/62 hover:bg-bone/[0.06]",
                          )}
                        >
                          {tableCount}
                          {selected ? <Check size={15} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </FormSection>

              <FormSection title="Notas">
                <Field label="Notas internas" className="md:col-span-2">
                  <textarea
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        notes: event.target.value,
                      }))
                    }
                    className={textareaClassName}
                    placeholder="Contexto comercial, acuerdos, restricciones o pendientes."
                  />
                </Field>
              </FormSection>
            </div>

            {formError ? (
              <p className="mt-5 rounded-lg border border-chile/30 bg-chile/10 px-3 py-2 text-sm font-semibold text-[#ff9b91]">
                {formError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-bone/10 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingRestaurant ? "Guardar cambios" : "Crear restaurante"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </Layout>
  );
}

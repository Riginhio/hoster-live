"use client";

import { FormEvent, useEffect, useState } from "react";
import { Megaphone, Pencil, Power, Save } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import {
  createQrCampaign,
  getQrCampaigns,
  toggleQrCampaign,
  updateQrCampaign,
} from "@/lib/qr/qrCampaignStorage";
import type { QrCampaign, RestaurantConfig } from "@/lib/types";
import { readImageFileAsDataUrl } from "@/lib/browserFiles";

const inputClassName =
  "h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";
const textareaClassName =
  "min-h-28 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 py-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";

type FormState = Omit<QrCampaign, "id" | "active" | "appliesToRestaurantIds"> & {
  scope: "all" | "restaurants";
  appliesToRestaurantIds: string[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function emptyForm(restaurants: RestaurantConfig[]): FormState {
  return {
    name: "Campana QR",
    channel: "printed_qr",
    title: "Promocion especial para tu mesa",
    message: "Presenta esta pantalla con tu mesero y conserva tu tabla hasta terminar la jugada.",
    ctaLabel: "Ver promocion",
    ctaUrl: "",
    sponsorName: "HOSTER LIVE",
    sponsorLogoUrl: "",
    bannerImageUrl: "",
    validFrom: today(),
    validTo: nextMonth(),
    scope: "all",
    appliesToRestaurantIds: restaurants[0] ? [restaurants[0].id] : [],
  };
}

function campaignToForm(campaign: QrCampaign): FormState {
  return {
    ...campaign,
    scope: campaign.appliesToRestaurantIds === "all" ? "all" : "restaurants",
    appliesToRestaurantIds:
      campaign.appliesToRestaurantIds === "all" ? [] : campaign.appliesToRestaurantIds,
  };
}

function statusClassName(active: boolean) {
  return active ? "bg-agave/16 text-agave ring-agave/35" : "bg-bone/8 text-bone/52 ring-bone/10";
}

const channelLabels: Record<QrCampaign["channel"], string> = {
  printed_qr: "QR impreso en tablas",
  tv_standby: "Pantalla TV / standby",
  general: "Promocion general",
};

export default function MasterQrCampaignsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(() => emptyForm([]));
  const [error, setError] = useState<string | null>(null);

  function refreshCampaigns() {
    setCampaigns(getQrCampaigns());
  }

  useEffect(() => {
    const loadedRestaurants = getRestaurants();
    setRestaurants(loadedRestaurants);
    setFormState(emptyForm(loadedRestaurants));
    refreshCampaigns();
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((currentState) => ({ ...currentState, [key]: value }));
  }

  function toggleRestaurantSelection(restaurantId: string) {
    setFormState((currentState) => {
      const currentIds = currentState.appliesToRestaurantIds;
      const nextIds = currentIds.includes(restaurantId)
        ? currentIds.filter((id) => id !== restaurantId)
        : [...currentIds, restaurantId];

      return { ...currentState, appliesToRestaurantIds: nextIds };
    });
  }

  function resetForm() {
    setEditingId(null);
    setFormState(emptyForm(restaurants));
    setError(null);
  }

  async function handleImageFile(
    file: File | undefined,
    key: "sponsorLogoUrl" | "bannerImageUrl",
  ) {
    if (!file) {
      return;
    }

    const dataUrl = await readImageFileAsDataUrl(file);
    setField(key, dataUrl);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.name.trim() || !formState.title.trim() || !formState.message.trim()) {
      setError("Nombre, titulo y mensaje son obligatorios.");
      return;
    }

    if (formState.scope === "restaurants" && formState.appliesToRestaurantIds.length === 0) {
      setError("Selecciona al menos un restaurante o usa alcance todos.");
      return;
    }

    const payload = {
      name: formState.name.trim(),
      title: formState.title.trim(),
      message: formState.message.trim(),
      channel: formState.channel,
      ctaLabel: formState.ctaLabel.trim(),
      ctaUrl: formState.ctaUrl.trim(),
      sponsorName: formState.sponsorName.trim(),
      sponsorLogoUrl: formState.sponsorLogoUrl.trim(),
      bannerImageUrl: formState.bannerImageUrl.trim(),
      validFrom: formState.validFrom,
      validTo: formState.validTo,
      appliesToRestaurantIds:
        formState.scope === "all" ? ("all" as const) : formState.appliesToRestaurantIds,
    };

    if (editingId) {
      updateQrCampaign(editingId, payload);
    } else {
      createQrCampaign(payload);
    }

    refreshCampaigns();
    resetForm();
  }

  return (
    <Layout title="QR Marketing" eyebrow="HOSTER LIVE">
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <Card accent className="bg-charcoal/88">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-mezcal/35 bg-mezcal/10 text-mezcal shadow-glow">
              <Megaphone size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
                Validacion + marketing
              </p>
              <h2 className="mt-3 font-display text-4xl text-bone md:text-5xl">
                Campanas dinamicas para QR
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
                Controla el mensaje que ve el cliente al escanear una tabla oficial. El bloque de
                validacion permanece fijo y el contenido comercial cambia por vigencia y restaurante.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-2xl text-bone">
            {editingId ? "Editar campana" : "Crear campana"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <input
              value={formState.name}
              onChange={(event) => setField("name", event.target.value)}
              className={inputClassName}
              placeholder="Nombre interno"
            />
            <input
              value={formState.title}
              onChange={(event) => setField("title", event.target.value)}
              className={inputClassName}
              placeholder="Titulo visible"
            />
            <textarea
              value={formState.message}
              onChange={(event) => setField("message", event.target.value)}
              className={textareaClassName}
              placeholder="Mensaje"
            />
            <select
              value={formState.channel}
              onChange={(event) =>
                setField("channel", event.target.value as QrCampaign["channel"])
              }
              className={inputClassName}
            >
              <option value="printed_qr">QR impreso en tablas</option>
              <option value="tv_standby">Pantalla TV / standby</option>
              <option value="general">Promocion general</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={formState.ctaLabel}
                onChange={(event) => setField("ctaLabel", event.target.value)}
                className={inputClassName}
                placeholder="Texto del boton"
              />
              <input
                value={formState.ctaUrl}
                onChange={(event) => setField("ctaUrl", event.target.value)}
                className={inputClassName}
                placeholder="Enlace destino del boton"
              />
            </div>
            <input
              value={formState.sponsorName}
              onChange={(event) => setField("sponsorName", event.target.value)}
              className={inputClassName}
              placeholder="Patrocinador"
            />
            <input
              value={formState.sponsorLogoUrl}
              onChange={(event) => setField("sponsorLogoUrl", event.target.value)}
              className={inputClassName}
              placeholder="Sponsor logo URL"
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                void handleImageFile(event.target.files?.[0], "sponsorLogoUrl")
              }
              className="text-sm font-semibold text-bone/60 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-mezcal file:px-3 file:text-sm file:font-black file:text-obsidian"
            />
            <input
              value={formState.bannerImageUrl}
              onChange={(event) => setField("bannerImageUrl", event.target.value)}
              className={inputClassName}
              placeholder="Banner image URL"
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                void handleImageFile(event.target.files?.[0], "bannerImageUrl")
              }
              className="text-sm font-semibold text-bone/60 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-mezcal file:px-3 file:text-sm file:font-black file:text-obsidian"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={formState.validFrom}
                onChange={(event) => setField("validFrom", event.target.value)}
                className={inputClassName}
              />
              <input
                type="date"
                value={formState.validTo}
                onChange={(event) => setField("validTo", event.target.value)}
                className={inputClassName}
              />
            </div>
            <select
              value={formState.scope}
              onChange={(event) => setField("scope", event.target.value as FormState["scope"])}
              className={inputClassName}
            >
              <option value="all">Todos los restaurantes</option>
              <option value="restaurants">Restaurantes seleccionados</option>
            </select>
            {formState.scope === "restaurants" ? (
              <div className="grid gap-2 rounded-lg border border-bone/10 bg-obsidian/38 p-3">
                {restaurants.map((restaurant) => (
                  <label
                    key={restaurant.id}
                    className="flex items-center gap-2 text-sm font-semibold text-bone/72"
                  >
                    <input
                      type="checkbox"
                      checked={formState.appliesToRestaurantIds.includes(restaurant.id)}
                      onChange={() => toggleRestaurantSelection(restaurant.id)}
                    />
                    {restaurant.name}
                  </label>
                ))}
              </div>
            ) : null}
            {error ? <p className="text-sm font-semibold text-[#ff9b91]">{error}</p> : null}
            <div className="overflow-hidden rounded-lg border border-mezcal/25 bg-mezcal/12">
              {formState.bannerImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formState.bannerImageUrl} alt="" className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 bg-mezcal/20" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {formState.sponsorLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formState.sponsorLogoUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg bg-bone object-contain p-1"
                    />
                  ) : null}
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-mezcal">
                    {formState.sponsorName || "Sponsor"}
                  </p>
                </div>
                <p className="mt-3 font-display text-3xl text-bone">{formState.title}</p>
                <p className="mt-2 text-sm leading-6 text-bone/65">{formState.message}</p>
                <p className="mt-4 inline-flex rounded-lg bg-mezcal px-3 py-2 text-sm font-black text-obsidian">
                  {formState.ctaLabel || "Ver promocion"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                <Save size={18} />
                {editingId ? "Guardar cambios" : "Crear campana"}
              </Button>
              {editingId ? (
                <Button variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-bone/[0.035]">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-3xl text-bone">{campaign.name}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${statusClassName(
                      campaign.active,
                    )}`}
                  >
                    {campaign.active ? "activa" : "inactiva"}
                  </span>
                  <span className="rounded-full bg-mezcal/12 px-3 py-1 text-xs font-bold uppercase text-mezcal ring-1 ring-mezcal/24">
                    {channelLabels[campaign.channel]}
                  </span>
                  <span className="rounded-full bg-bone/8 px-3 py-1 text-xs font-bold uppercase text-bone/55 ring-1 ring-bone/10">
                    {campaign.appliesToRestaurantIds === "all"
                      ? "Todos"
                      : `${campaign.appliesToRestaurantIds.length} restaurantes`}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-bone">{campaign.title}</p>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-bone/58">
                  {campaign.message}
                </p>
                <div className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-bone/42 md:grid-cols-4">
                  <p>{campaign.validFrom || "Sin inicio"}</p>
                  <p>{campaign.validTo || "Sin fin"}</p>
                  <p>{campaign.sponsorName || "Sin sponsor"}</p>
                  <p>
                    {campaign.appliesToRestaurantIds === "all"
                      ? "Alcance global"
                      : restaurants
                          .filter((restaurant) =>
                            campaign.appliesToRestaurantIds.includes(restaurant.id),
                          )
                          .map((restaurant) => restaurant.name)
                          .join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(campaign.id);
                    setFormState(campaignToForm(campaign));
                    setError(null);
                  }}
                >
                  <Pencil size={16} />
                  Editar
                </Button>
                <Button
                  variant={campaign.active ? "danger" : "secondary"}
                  onClick={() => {
                    toggleQrCampaign(campaign.id);
                    refreshCampaigns();
                  }}
                >
                  <Power size={16} />
                  {campaign.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}

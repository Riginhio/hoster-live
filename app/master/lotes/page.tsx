"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Plus, Power } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import { decks, type DeckId, type GameId } from "@/lib/decks";
import {
  activateBoardBatch,
  createBoardBatch,
  deactivateBoardBatch,
  getBoardBatches,
  refreshBoardBatchesFromSupabase,
  toLoteriaBoards,
  type BoardBatch,
} from "@/lib/boards/boardBatchStorage";
import {
  generateBoardsPdf,
  generateControlSheetPdf,
} from "@/lib/pdf/generateBoardsPdf";

const inputClassName =
  "h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function statusClassName(status: BoardBatch["status"]) {
  if (status === "active") return "bg-agave/16 text-agave ring-agave/35";
  if (status === "archived") return "bg-bone/8 text-bone/52 ring-bone/10";
  return "bg-mezcal/14 text-mezcal ring-mezcal/28";
}

export default function MasterLotesPage() {
  const [batches, setBatches] = useState<BoardBatch[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>(() => getRestaurants());
  const [restaurantId, setRestaurantId] = useState("");
  const [gameId, setGameId] = useState<GameId>("loteria");
  const [deckId, setDeckId] = useState<DeckId>("loteria");
  const [name, setName] = useState("Nombre Lote Operativo");
  const [quantity, setQuantity] = useState(50);
  const [validFrom, setValidFrom] = useState(today());
  const [validTo, setValidTo] = useState(nextMonth());
  const [error, setError] = useState<string | null>(null);
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === restaurantId),
    [restaurantId, restaurants],
  );
  const allowedQuantities = useMemo(
    () =>
      selectedRestaurant?.allowedTableCounts?.length
        ? selectedRestaurant.allowedTableCounts
        : [20, 30, 50],
    [selectedRestaurant],
  );

  function refreshBatches() {
    setBatches(getBoardBatches());
  }

  useEffect(() => {
    const loadedRestaurants = getRestaurants();
    setRestaurants(loadedRestaurants);
    refreshBatches();
    void refreshBoardBatchesFromSupabase().then((result) => setBatches(result.batches));
  }, []);

  useEffect(() => {
    if (!allowedQuantities.includes(quantity)) {
      setQuantity(allowedQuantities[0] ?? 20);
    }
  }, [allowedQuantities, quantity]);

  function handleCreateBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRestaurant) {
      setError("Selecciona un restaurante valido.");
      return;
    }

    if (!selectedRestaurant.enabledDecks.includes(deckId)) {
      setError("El deck seleccionado no esta habilitado para este restaurante.");
      return;
    }

    const activeDuplicate = batches.find(
      (batch) =>
        batch.restaurantId === selectedRestaurant.id &&
        batch.deckId === deckId &&
        batch.status === "active",
    );

    if (activeDuplicate) {
      setError("Ese restaurante ya tiene un lote activo con este deck. Desactivalo o archivalo antes de crear otro.");
      return;
    }

    createBoardBatch({
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      name,
      gameId,
      deckId,
      quantity,
      validFrom,
      validTo,
      activate: true,
    });
    setError(null);
    refreshBatches();
  }

  async function exportBatchPdf(batch: BoardBatch) {
    await generateBoardsPdf({
      boards: toLoteriaBoards(batch.boards),
      session: null,
      restaurantName: batch.restaurantName,
      tablePrice: 0,
      prizeAmount: 0,
      batch,
      validFrom: batch.validFrom,
      validTo: batch.validTo,
    });
  }

  async function exportControlPdf(batch: BoardBatch) {
    await generateControlSheetPdf({
      batch,
      quantity: batch.quantity,
    });
  }

  return (
    <Layout title="Lotes de Tablas" eyebrow="HOSTER LIVE">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_24rem]">
        <Card accent className="bg-charcoal/88">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
            Board batches
          </p>
          <h2 className="mt-3 font-display text-4xl text-bone md:text-5xl">
            Lotes reutilizables por restaurante
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
            Cada restaurante puede tener varios lotes, pero solo uno activo. Las sesiones usan los
            folios del lote activo: 001-020, 001-030 o 001-050 segun tablas activas.
          </p>
        </Card>

        <Card>
          <h3 className="font-display text-2xl text-bone">Crear lote</h3>
          <form onSubmit={handleCreateBatch} className="mt-4 grid gap-3">
            <select
              value={restaurantId}
              onChange={(event) => setRestaurantId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Seleccionar lote</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
            <select
              value={gameId}
              onChange={(event) => setGameId(event.target.value as GameId)}
              className={inputClassName}
            >
              <option value="loteria">Loteria</option>
            </select>
            <select
              value={deckId}
              onChange={(event) => setDeckId(event.target.value as DeckId)}
              className={inputClassName}
              disabled={!selectedRestaurant}
            >
              {(selectedRestaurant?.enabledDecks ?? (Object.keys(decks) as DeckId[])).map((deck) => (
                <option key={deck} value={deck}>
                  {decks[deck].label}
                </option>
              ))}
            </select>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="Nombre Lote Operativo"
            />
            <select
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={inputClassName}
            >
              {allowedQuantities.map((option) => (
                <option key={option} value={option}>
                  {option} tablas
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                className={inputClassName}
              />
              <input
                type="date"
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
                className={inputClassName}
              />
            </div>
            {error ? <p className="text-sm font-semibold text-[#ff9b91]">{error}</p> : null}
            <Button type="submit">
              <Plus size={18} />
              Crear y activar
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4">
        {batches.map((batch) => (
          <Card key={batch.id} className="bg-bone/[0.035]">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-3xl text-bone">{batch.name}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${statusClassName(
                      batch.status,
                    )}`}
                  >
                    {batch.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-bone/62 md:grid-cols-6">
                  <p>{batch.restaurantName}</p>
                  <p>{decks[batch.deckId].label}</p>
                  <p>{batch.quantity} tablas</p>
                  <p>{batch.validFrom}</p>
                  <p>{batch.validTo}</p>
                  <p>Folios HL-001 a HL-{String(batch.quantity).padStart(3, "0")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={batch.status === "active" ? "danger" : "secondary"}
                  onClick={() => {
                    if (batch.status === "active") {
                      deactivateBoardBatch(batch.id);
                    } else {
                      activateBoardBatch(batch.id);
                    }
                    refreshBatches();
                  }}
                  disabled={batch.status === "archived"}
                >
                  {batch.status === "active" ? <Power size={16} /> : <CheckCircle2 size={16} />}
                  {batch.status === "active" ? "Desactivar lote" : "Activar lote"}
                </Button>
                <Button variant="secondary" onClick={() => void exportBatchPdf(batch)}>
                  <Download size={16} />
                  PDF tablas
                </Button>
                <Button variant="secondary" onClick={() => void exportControlPdf(batch)}>
                  <FileText size={16} />
                  Hoja control
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}

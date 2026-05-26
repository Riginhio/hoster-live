"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BoardCard } from "@/components/game/BoardCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { refreshRestaurantsFromSupabase } from "@/lib/restaurants/restaurantStorage";
import {
  getActiveSessionByRestaurantId,
  getSessions,
  type Session,
} from "@/lib/sessions/sessionStorage";
import {
  getLatestRealtimeSessionByRestaurantId,
  realtimeSessionToSession,
  subscribeToRestaurantSession,
} from "@/lib/supabase/sessionRealtime";
import {
  type WinMode,
} from "@/lib/loteria";
import { generateBoardsPdf } from "@/lib/pdf/generateBoardsPdf";
import {
  ensureBoardBatchForSession,
  getBoardBatches,
  refreshBoardBatchesFromSupabase,
  toLoteriaBoards,
  type BoardBatch,
} from "@/lib/boards/boardBatchStorage";
import { decks, type DeckId, type GameId } from "@/lib/decks";

function modeLabel(mode: WinMode) {
  if (mode === "four_corners") {
    return "4 esquinas";
  }

  if (mode === "x_shape") {
    return "Figura X";
  }

  if (mode === "full_card") {
    return "Llena";
  }

  return "Centro 4";
}

function getSessionTime(session?: Session | null) {
  const time = session?.lastUpdatedAt ? new Date(session.lastUpdatedAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function chooseNewestSession(remoteSession: Session | null, localSession?: Session | null) {
  if (!remoteSession) {
    return localSession ?? null;
  }

  if (!localSession) {
    return remoteSession;
  }

  return getSessionTime(remoteSession) >= getSessionTime(localSession) ? remoteSession : localSession;
}

export default function GerenteTablasPage() {
  const { currentUser } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [batches, setBatches] = useState<BoardBatch[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<GameId>("loteria");
  const [selectedDeckId, setSelectedDeckId] = useState<DeckId>("loteria");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [enabledDecks, setEnabledDecks] = useState<DeckId[]>(["loteria"]);
  const [debugSource, setDebugSource] = useState("localStorage");
  const [latestRemoteSession, setLatestRemoteSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function syncTablesState(remoteOverride?: Session | null) {
      const restaurantId = currentUser?.restaurantId;
      const [refreshedRestaurants, refreshedBatches] = await Promise.all([
        refreshRestaurantsFromSupabase(),
        refreshBoardBatchesFromSupabase(),
      ]);
      const restaurant = refreshedRestaurants.restaurants.find((item) => item.id === restaurantId);
      const remoteResult = restaurantId
        ? await getLatestRealtimeSessionByRestaurantId(restaurantId)
        : null;
      const remoteSession =
        remoteOverride ?? (remoteResult?.data ? realtimeSessionToSession(remoteResult.data) : null);
      const activeSession = restaurantId ? getActiveSessionByRestaurantId(restaurantId) : undefined;
      const latestLocalSession = getSessions().find((item) =>
        restaurantId ? item.restaurantId === restaurantId : true,
      );
      const localSession = activeSession ?? latestLocalSession ?? null;
      const nextSession = chooseNewestSession(remoteSession, localSession);
      const source = remoteSession && nextSession?.id === remoteSession.id ? "Supabase" : refreshedRestaurants.source;
      const ensuredBatch = nextSession ? ensureBoardBatchForSession(nextSession) : null;
      const restaurantBatches = getBoardBatches().filter((batch) =>
        restaurantId ? batch.restaurantId === restaurantId : true,
      );
      const allRestaurantBatches =
        ensuredBatch && !restaurantBatches.some((batch) => batch.id === ensuredBatch.id)
          ? [ensuredBatch, ...restaurantBatches]
          : restaurantBatches;
      const defaultBatch =
        ensuredBatch ??
        (nextSession?.batchId
          ? allRestaurantBatches.find((batch) => batch.id === nextSession.batchId)
          : undefined) ??
        allRestaurantBatches.find(
          (batch) =>
            batch.status === "active" &&
            (!nextSession || batch.deckId === nextSession.deckId),
        ) ??
        allRestaurantBatches[0] ??
        null;

      if (!isMounted) {
        return;
      }

      setBatches(allRestaurantBatches);
      setSession(nextSession);
      setLatestRemoteSession(remoteSession);
      setEnabledDecks((restaurant?.enabledDecks?.length ? restaurant.enabledDecks : ["loteria"]) as DeckId[]);
      setDebugSource(source);
      console.info("[HOSTER LIVE][GERENTE TABLAS] debug", {
        user: currentUser?.email ?? currentUser?.name,
        restaurantId,
        enabledDecks: restaurant?.enabledDecks,
        activeGames: restaurant?.activeGames,
        batchesSource: refreshedBatches.source,
        batchCount: allRestaurantBatches.length,
        latestSessionId: nextSession?.id,
        latestSessionBatchId: nextSession?.batchId,
        latestSessionDeckId: nextSession?.deckId,
        updatedAt: nextSession?.lastUpdatedAt,
        drawnCardsCount: nextSession?.calledCards.length ?? 0,
        status: nextSession?.status,
        source,
      });
      if (defaultBatch) {
        setSelectedGameId(defaultBatch.gameId);
        setSelectedDeckId(defaultBatch.deckId);
        setSelectedBatchId((currentId) =>
          !activeSession && currentId && allRestaurantBatches.some((batch) => batch.id === currentId)
            ? currentId
            : defaultBatch.id,
        );
      }
    }

    void syncTablesState();

    const intervalId = globalThis.setInterval(() => void syncTablesState(), 2500);
    const handleStorage = () => void syncTablesState();
    window.addEventListener("storage", handleStorage);
    const unsubscribe = currentUser?.restaurantId
      ? subscribeToRestaurantSession(currentUser.restaurantId, (row) => {
          const remoteSession = row ? realtimeSessionToSession(row) : null;
          console.info("[HOSTER LIVE][GERENTE TABLAS] realtime event", {
            sessionId: row?.id ?? "-",
            status: row?.status ?? "-",
            autoplayStatus: row?.autoplay_status ?? "-",
            drawnCardsCount: row?.called_cards?.length ?? 0,
            updatedAt: row?.last_updated_at ?? "-",
          });
          void syncTablesState(remoteSession);
        })
      : () => undefined;

    return () => {
      isMounted = false;
      globalThis.clearInterval(intervalId);
      window.removeEventListener("storage", handleStorage);
      unsubscribe();
    };
  }, [currentUser?.email, currentUser?.name, currentUser?.restaurantId]);

  const availableDecks = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...enabledDecks,
            ...batches
              .filter((batch) => batch.gameId === selectedGameId)
              .map((batch) => batch.deckId),
          ],
        ),
      ) as DeckId[],
    [batches, enabledDecks, selectedGameId],
  );

  const availableBatches = useMemo(
    () =>
      batches.filter((batch) => batch.gameId === selectedGameId && batch.deckId === selectedDeckId),
    [batches, selectedDeckId, selectedGameId],
  );

  const activeBatch = useMemo(
    () =>
      availableBatches.find((batch) => batch.id === selectedBatchId) ??
      availableBatches.find((batch) => batch.status === "active") ??
      availableBatches[0] ??
      null,
    [availableBatches, selectedBatchId],
  );

  useEffect(() => {
    if (!availableDecks.includes(selectedDeckId) && availableDecks[0]) {
      setSelectedDeckId(availableDecks[0]);
    }
  }, [availableDecks, selectedDeckId]);

  useEffect(() => {
    if (activeBatch && selectedBatchId !== activeBatch.id) {
      setSelectedBatchId(activeBatch.id);
    }
  }, [activeBatch, selectedBatchId]);

  const boards = useMemo(() => {
    if (!activeBatch) {
      return [];
    }

    return toLoteriaBoards(activeBatch.boards).slice(0, session?.activeTables ?? activeBatch.quantity);
  }, [activeBatch, session?.activeTables]);
  const sessionMatchesSelection = Boolean(
    session &&
      activeBatch &&
      session.deckId === activeBatch.deckId &&
      (!session.batchId || session.batchId === activeBatch.id),
  );
  const calledCardIds = sessionMatchesSelection ? session?.calledCards ?? [] : [];
  const lastCalledCardId = calledCardIds[calledCardIds.length - 1];
  const mode = sessionMatchesSelection ? session?.mode ?? "four_corners" : "four_corners";
  const winnerFolio = sessionMatchesSelection ? session?.winnerFolio : undefined;
  const restaurantName = session?.restaurantName ?? currentUser?.restaurantName ?? "Rancho Viejo";
  const tablePrice = sessionMatchesSelection ? session?.tablePrice ?? 100 : 0;
  const prizeAmount = sessionMatchesSelection ? session?.prizeAmount ?? 0 : 0;
  const averageProgress = boards.length
    ? Math.round(
      boards.reduce((total, board) => {
      const matchedCount = board.cards
        .flat()
        .filter((card) => calledCardIds.includes(card.id)).length;
      return total + matchedCount / 16;
      }, 0) /
        boards.length *
        100,
    )
    : 0;

  async function handleExportPdf() {
    setIsExporting(true);

    try {
      await generateBoardsPdf({
        boards: activeBatch ? toLoteriaBoards(activeBatch.boards) : boards,
        session,
        restaurantName,
        tablePrice,
        prizeAmount,
        batch: activeBatch,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Layout title="Tablas Visuales" eyebrow="HOSTER LIVE">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card accent className="bg-charcoal/88">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
            Tablas reales 4x4
          </p>
          <h2 className="mt-3 font-display text-4xl text-bone md:text-5xl">
            Monitoreo de aciertos
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
            Visualiza el progreso de cada tabla con cartas autenticas, aciertos en vivo y estado
            ganador preparado para sesiones persistentes.
          </p>
          <Button onClick={handleExportPdf} disabled={isExporting} className="mt-6">
            <Download size={18} />
            {isExporting ? "Generando PDF..." : "Exportar PDF"}
          </Button>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card className="bg-bone/[0.045]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">Sesion</p>
            <p className="mt-2 font-display text-3xl text-bone">
              {session ? session.status : activeBatch ? activeBatch.status : "Sin lote"}
            </p>
          </Card>
          <Card className="bg-bone/[0.045]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">
              Promedio
            </p>
            <p className="mt-2 font-display text-4xl text-bone">{averageProgress}%</p>
          </Card>
        </div>
      </div>

      <Card className="mb-5 bg-bone/[0.035]">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-bone/70">Juego</span>
            <select
              value={selectedGameId}
              onChange={(event) => setSelectedGameId(event.target.value as GameId)}
              className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
            >
              <option value="loteria">Loteria</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-bone/70">Deck</span>
            <select
              value={selectedDeckId}
              onChange={(event) => setSelectedDeckId(event.target.value as DeckId)}
              className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
            >
              {availableDecks.map((deckId) => (
                <option key={deckId} value={deckId}>
                  {decks[deckId].label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-bone/70">Lote</span>
            <select
              value={activeBatch?.id ?? ""}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
            >
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} / {batch.status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-5">
          <div>
            <p className="text-bone/45">Restaurante</p>
            <p className="mt-1 font-semibold text-bone">{restaurantName}</p>
          </div>
          <div>
            <p className="text-bone/45">Modalidad</p>
            <p className="mt-1 font-semibold text-bone">{modeLabel(mode)}</p>
          </div>
          <div>
            <p className="text-bone/45">Cartas cantadas</p>
            <p className="mt-1 font-semibold text-agave">{calledCardIds.length}/54</p>
          </div>
          <div>
            <p className="text-bone/45">Ganadora</p>
            <p className="mt-1 font-semibold text-mezcal">{winnerFolio ?? "Pendiente"}</p>
          </div>
          <div>
            <p className="text-bone/45">Deck activo</p>
            <p className="mt-1 font-semibold text-bone">
              {decks[(session?.deckId ?? activeBatch?.deckId ?? selectedDeckId) as DeckId]?.label ?? selectedDeckId}
            </p>
          </div>
          <div>
            <p className="text-bone/45">Lote activo</p>
            <p className="mt-1 font-semibold text-bone">{activeBatch?.name ?? "No disponible"}</p>
          </div>
          <div>
            <p className="text-bone/45">Debug sync</p>
            <p className="mt-1 font-semibold text-bone">
              {debugSource} · {latestRemoteSession?.id.slice(0, 8) ?? session?.id.slice(0, 8) ?? "sin sesion"}
            </p>
          </div>
          <div>
            <p className="text-bone/45">Updated at</p>
            <p className="mt-1 font-semibold text-bone">{session?.lastUpdatedAt ?? "-"}</p>
          </div>
          <div>
            <p className="text-bone/45">Status debug</p>
            <p className="mt-1 font-semibold text-bone">
              {session?.status ?? "-"} / {session?.autoplayStatus ?? "-"} / {session?.calledCards.length ?? 0}
            </p>
          </div>
        </div>
      </Card>

      {activeBatch ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boards.map((board) => (
          <BoardCard
            key={`${session?.id ?? "sin-sesion"}-${board.folio}`}
            board={board}
            calledCardIds={calledCardIds}
            lastCalledCardId={lastCalledCardId}
            mode={mode}
            winnerFolio={winnerFolio}
          />
        ))}
      </div>
      ) : (
        <Card className="border-dashed border-bone/15 text-center text-bone/58">
          No hay lote activo para este restaurante. Crea o activa un lote desde Master &gt; Lotes.
        </Card>
      )}
    </Layout>
  );
}

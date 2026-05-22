"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BoardCard } from "@/components/game/BoardCard";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getActiveSession,
  getSessions,
  type Session,
} from "@/lib/sessions/sessionStorage";
import {
  type WinMode,
} from "@/lib/loteria";
import { generateBoardsPdf } from "@/lib/pdf/generateBoardsPdf";
import {
  getActiveBoardBatch,
  toLoteriaBoards,
  type BoardBatch,
} from "@/lib/boards/boardBatchStorage";

function modeLabel(mode: WinMode) {
  if (mode === "four_corners") {
    return "4 esquinas";
  }

  if (mode === "x_shape") {
    return "Figura X";
  }

  return "Centro 4";
}

export default function GerenteTablasPage() {
  const { currentUser } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [activeBatch, setActiveBatch] = useState<BoardBatch | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    function syncTablesState() {
      const restaurantId = currentUser?.restaurantId;
      const batch = restaurantId ? getActiveBoardBatch(restaurantId) : undefined;
      const activeSession = getActiveSession(restaurantId);
      const latestSession = getSessions().find((item) =>
        restaurantId ? item.restaurantId === restaurantId : true,
      );

      setActiveBatch(batch ?? null);
      setSession(activeSession ?? latestSession ?? null);
    }

    syncTablesState();

    const intervalId = globalThis.setInterval(syncTablesState, 900);
    window.addEventListener("storage", syncTablesState);

    return () => {
      globalThis.clearInterval(intervalId);
      window.removeEventListener("storage", syncTablesState);
    };
  }, [currentUser?.restaurantId]);

  const boards = useMemo(() => {
    if (!activeBatch) {
      return [];
    }

    return toLoteriaBoards(activeBatch.boards).slice(0, session?.activeTables ?? activeBatch.quantity);
  }, [activeBatch, session?.activeTables]);
  const calledCardIds = session?.calledCards ?? [];
  const lastCalledCardId = calledCardIds[calledCardIds.length - 1];
  const mode = session?.mode ?? "four_corners";
  const winnerFolio = session?.winnerFolio;
  const restaurantName = session?.restaurantName ?? currentUser?.restaurantName ?? "Rancho Viejo";
  const tablePrice = session?.tablePrice ?? 100;
  const prizeAmount = session?.prizeAmount ?? 9600;
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
              {activeBatch ? activeBatch.status : "Sin lote"}
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
        <div className="grid gap-3 text-sm md:grid-cols-4">
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
            <p className="text-bone/45">Lote activo</p>
            <p className="mt-1 font-semibold text-bone">{activeBatch?.name ?? "No disponible"}</p>
          </div>
        </div>
      </Card>

      {activeBatch ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boards.map((board) => (
          <BoardCard
            key={board.folio}
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

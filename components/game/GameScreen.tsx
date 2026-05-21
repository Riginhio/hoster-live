"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  checkWinner,
  generateBoard,
  getWinPattern,
  type LoteriaBoard,
  type LoteriaCard,
  shuffleCards,
} from "@/lib/loteria";
import {
  configStorageKey,
  createDefaultDemoConfig,
  parseStoredDemoConfig,
  type DemoGameConfig,
} from "@/lib/demoConfig";
import { getRestaurantById } from "@/lib/restaurants";
import type { WinMode } from "@/lib/loteria";

type GameScreenProps = {
  restaurantId: string;
};

type WinnerState = {
  board: LoteriaBoard;
  winningCards: LoteriaCard[];
};

type GameStatus = "idle" | "countdown" | "playing" | "paused" | "finished";
type BrowserAudioWindow = typeof globalThis & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "X",
  center_four: "4 centrales",
};

const autoplayIntervals = [3000, 5000, 8000];
const countdownMessages = [
  "Compren sus tablas",
  "Ultima oportunidad",
  "Preparen sus tablas",
  "La jugada esta por iniciar",
];

function playTone(kind: "card" | "winner") {
  if (typeof window === "undefined") {
    return;
  }

  const audioWindow = globalThis as BrowserAudioWindow;
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.connect(context.destination);

    const playOscillator = (frequency: number, start: number, duration: number) => {
      const oscillator = context.createOscillator();
      oscillator.type = kind === "winner" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration);
    };

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + (kind === "winner" ? 0.7 : 0.18),
    );

    if (kind === "winner") {
      playOscillator(392, 0, 0.18);
      playOscillator(523.25, 0.16, 0.2);
      playOscillator(659.25, 0.34, 0.28);
    } else {
      playOscillator(740, 0, 0.16);
    }

    globalThis.setTimeout(() => {
      void context.close();
    }, kind === "winner" ? 900 : 300);
  } catch {
    // Audio is a progressive enhancement for the local TV screen.
  }
}

export function GameScreen({ restaurantId }: GameScreenProps) {
  const boardsRef = useRef<LoteriaBoard[]>(
    Array.from({ length: 50 }, (_, index) =>
      generateBoard(`HL-${String(index + 1).padStart(3, "0")}`),
    ),
  );
  const [config, setConfig] = useState<DemoGameConfig>(() =>
    createDefaultDemoConfig(restaurantId),
  );
  const [deck, setDeck] = useState<LoteriaCard[]>(() => shuffleCards());
  const [calledCards, setCalledCards] = useState<LoteriaCard[]>([]);
  const [winner, setWinner] = useState<WinnerState | null>(null);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [countdown, setCountdown] = useState(10);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [cardAnimationKey, setCardAnimationKey] = useState(0);

  useEffect(() => {
    try {
      const parsedConfig = parseStoredDemoConfig(
        localStorage.getItem(configStorageKey),
        restaurantId,
      );

      if (parsedConfig.restaurantId === restaurantId) {
        setConfig(parsedConfig);
      } else {
        setConfig(createDefaultDemoConfig(restaurantId));
      }
    } catch {
      setConfig(createDefaultDemoConfig(restaurantId));
    }
  }, [restaurantId]);

  const restaurant = getRestaurantById(restaurantId);
  const activeBoards = boardsRef.current.slice(0, config.activeTables);
  const currentCard = calledCards[calledCards.length - 1] ?? null;
  const nextCard = deck[calledCards.length] ?? null;
  const winningCardIds = new Set(winner?.winningCards.map((card) => card.id) ?? []);
  const patternPositions = getWinPattern(config.mode);
  const previewBoard = winner?.board ?? activeBoards[0];
  const countdownMessage =
    countdownMessages[Math.min(countdownMessages.length - 1, Math.floor((10 - countdown) / 3))];

  const callNextCard = useCallback(() => {
    if (!nextCard || winner) {
      return;
    }

    const nextCalledCards = [...calledCards, nextCard];
    const winningBoard = activeBoards
      .map((board) => ({
        board,
        result: checkWinner(board, nextCalledCards, config.mode),
      }))
      .find(({ result }) => result.hasWon);

    setCalledCards(nextCalledCards);
    setCardAnimationKey((currentKey) => currentKey + 1);
    playTone("card");

    if (winningBoard) {
      setWinner({
        board: winningBoard.board,
        winningCards: winningBoard.result.winningCards,
      });
      setStatus("finished");
      playTone("winner");
    }
  }, [activeBoards, calledCards, config.mode, nextCard, winner]);

  useEffect(() => {
    if (status !== "countdown") {
      return;
    }

    if (countdown <= 0) {
      setStatus("playing");
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      setCountdown((currentCountdown) => currentCountdown - 1);
    }, 1000);

    return () => globalThis.clearTimeout(timerId);
  }, [countdown, status]);

  useEffect(() => {
    if (status !== "playing" || winner || !nextCard) {
      return;
    }

    const timerId = globalThis.setTimeout(callNextCard, intervalMs);

    return () => globalThis.clearTimeout(timerId);
  }, [callNextCard, intervalMs, nextCard, status, winner]);

  useEffect(() => {
    if (!nextCard && status === "playing") {
      setStatus("finished");
    }
  }, [nextCard, status]);

  function startAutoplay() {
    if (winner || !nextCard) {
      return;
    }

    if (status === "paused") {
      setStatus("playing");
      return;
    }

    setCountdown(10);
    setStatus("countdown");
  }

  function pauseAutoplay() {
    if (status === "playing" || status === "countdown") {
      setStatus("paused");
    }
  }

  function resetGame() {
    setDeck(shuffleCards());
    setCalledCards([]);
    setWinner(null);
    setStatus("idle");
    setCountdown(10);
    setCardAnimationKey(0);
  }

  return (
    <div className="screen-safe cantina-grid bg-obsidian p-4 md:p-6">
      <div className="mx-auto grid h-full max-w-[1800px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="order-2 rounded-lg border border-bone/10 bg-obsidian/70 p-4 shadow-cantina backdrop-blur xl:order-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-bone">Historial</h2>
            <span className="rounded-full bg-agave/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-agave">
              {calledCards.length}/54
            </span>
          </div>
          <div className="grid max-h-[56vh] gap-3 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
            {[...calledCards].reverse().map((card, index) => {
              const isLatest = index === 0;

              return (
              <div
                key={card.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                  isLatest
                    ? "border-mezcal bg-mezcal/15 shadow-glow"
                    : "border-bone/10 bg-bone/[0.04]"
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-sm font-black ${
                    isLatest ? "bg-mezcal text-obsidian" : "bg-mezcal/15 text-mezcal"
                  }`}
                >
                  {String(calledCards.length - index).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-bone">{card.name}</p>
                  <p className={isLatest ? "text-xs text-mezcal" : "text-xs text-bone/45"}>
                    {isLatest ? "Carta mas reciente" : `Carta ${String(card.number).padStart(2, "0")}`}
                  </p>
                </div>
              </div>
              );
            })}
            {calledCards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-bone/15 p-5 text-sm text-bone/55">
                Aun no se han cantado cartas.
              </div>
            ) : null}
          </div>
        </aside>

        <main className="order-1 flex min-w-0 flex-col gap-4 xl:order-2">
          <div className="flex flex-col gap-4 rounded-lg border border-bone/10 bg-charcoal/70 px-4 py-3 shadow-cantina backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <BrandMark className="h-12 w-12" textClassName="text-base" />
              <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-mezcal">
                {restaurant.name}
              </p>
              <h1 className="font-display text-3xl text-bone md:text-5xl">HOSTER LIVE</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-bone/45">
                Hospitality Gaming Platform
              </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-agave/14 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-agave">TABLAS</p>
                <p className="text-2xl font-black text-bone">{config.activeTables}</p>
              </div>
              <div className="rounded-lg bg-mezcal/14 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-mezcal">MODO</p>
                <p className="text-lg font-black text-bone">{modeLabels[config.mode]}</p>
              </div>
              <div className="rounded-lg bg-chile/16 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-chile">COSTO TABLA</p>
                <p className="truncate text-lg font-black text-bone">${config.tablePrice}</p>
              </div>
            </div>
          </div>

          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_20%,rgba(217,164,65,0.18),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.98)_100%)] p-5 text-center shadow-cantina md:min-h-[560px]">
            <div className="mb-4 flex flex-wrap justify-center gap-3">
              <Button
                onClick={startAutoplay}
                disabled={!nextCard || Boolean(winner) || status === "playing" || status === "countdown"}
              >
                <Play className="h-4 w-4" />
                {status === "paused" ? "Continuar autoplay" : "Iniciar autoplay"}
              </Button>
              <Button
                variant="secondary"
                onClick={pauseAutoplay}
                disabled={status !== "playing" && status !== "countdown"}
              >
                <Pause className="h-4 w-4" />
                Pausar
              </Button>
              <Button
                variant="secondary"
                onClick={callNextCard}
                disabled={!nextCard || Boolean(winner) || status === "countdown"}
              >
                <Volume2 className="h-4 w-4" />
                Cantar siguiente carta
              </Button>
              <Button variant="secondary" onClick={resetGame}>
                <RotateCcw className="h-4 w-4" />
                Reiniciar demo
              </Button>
            </div>

            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {autoplayIntervals.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIntervalMs(option)}
                  className={`h-9 rounded-lg border px-3 text-xs font-black transition ${
                    intervalMs === option
                      ? "border-agave bg-agave text-obsidian"
                      : "border-bone/10 bg-bone/[0.04] text-bone/70 hover:bg-bone/10"
                  }`}
                >
                  {option / 1000}s
                </button>
              ))}
            </div>

            {status === "countdown" ? (
              <div className="mb-5 grid w-full max-w-xl place-items-center rounded-lg border border-mezcal/35 bg-mezcal/10 p-6 shadow-glow">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-mezcal">
                  {countdownMessage}
                </p>
                <p className="mt-2 font-display text-7xl leading-none text-bone md:text-[8rem]">
                  {countdown}
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bone/10">
                  <div
                    className="h-full rounded-full bg-mezcal transition-all"
                    style={{ width: `${Math.max(0, countdown) * 10}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-mezcal/40 bg-mezcal/15 text-lg font-black text-mezcal md:h-20 md:w-20 md:text-2xl">
              {currentCard ? String(currentCard.number).padStart(2, "0") : "--"}
            </div>
            <div
              key={cardAnimationKey}
              className="loteria-card-reveal relative aspect-[3/4] w-full max-w-[360px] rounded-lg border-2 border-mezcal bg-bone p-3 shadow-glow md:max-w-[440px]"
            >
              <div className="flex h-full flex-col justify-between rounded-md border-2 border-obsidian/85 bg-[linear-gradient(145deg,#f7edd9,#d8b56a)] p-5 text-obsidian">
                <div className="flex items-center justify-between text-sm font-black uppercase tracking-[0.22em]">
                  <span>Hoster Live</span>
                  <span>{currentCard ? String(currentCard.number).padStart(2, "0") : "Demo"}</span>
                </div>
                <div className="grid flex-1 place-items-center">
                  <BrandMark
                    className="h-36 w-36 border-obsidian/65 shadow-none md:h-44 md:w-44"
                    textClassName="text-[4rem] leading-none md:text-[5rem]"
                  />
                </div>
                <h2 className="font-display text-5xl leading-none md:text-7xl">
                  {currentCard?.name ?? "Lista"}
                </h2>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-bone/50">
              Carta actual
            </p>
          </section>

          {winner ? (
            <div className="winner-pulse rounded-lg border border-mezcal/35 bg-[linear-gradient(90deg,rgba(192,57,43,0.35),rgba(217,164,65,0.22),rgba(31,161,135,0.28))] px-5 py-4 shadow-glow">
              <div className="grid gap-3 text-center md:grid-cols-[1fr_auto] md:items-center md:text-left">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-mezcal">
                    Ganador detectado
                  </p>
                  <p className="font-display text-3xl text-bone md:text-4xl">{winner.board.folio}</p>
                </div>
                <div className="text-sm font-semibold text-bone/75">
                  <p className="text-2xl font-black text-bone">${config.calculatedPrize}</p>
                  <p className="mt-1 text-bone/50">
                    Cartas: {winner.winningCards.map((card) => card.name).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        <aside className="order-3 rounded-lg border border-bone/10 bg-charcoal/78 p-4 shadow-cantina backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-agave">
                {winner ? "Tabla ganadora" : "Tabla demo"}
              </p>
              <h2 className="font-display text-3xl text-bone">{previewBoard.folio}</h2>
            </div>
            <span className="rounded-full bg-mezcal/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-mezcal">
              {modeLabels[config.mode]}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {previewBoard.cards.flatMap((row, rowIndex) =>
              row.map((card, colIndex) => {
                const isCalled = calledCards.some((calledCard) => calledCard.id === card.id);
                const isPattern = patternPositions.some(
                  (position) => position.row === rowIndex && position.col === colIndex,
                );
                const isWinningCard = winningCardIds.has(card.id);

                return (
                  <div
                    key={card.id}
                    className={`flex aspect-square min-w-0 flex-col justify-between rounded-lg border p-2 text-center transition ${
                      isWinningCard
                        ? "border-mezcal bg-mezcal text-obsidian shadow-glow"
                        : isCalled
                          ? "border-agave/60 bg-agave/20 text-bone"
                          : isPattern
                            ? "border-mezcal/45 bg-mezcal/10 text-bone"
                            : "border-bone/10 bg-bone/[0.04] text-bone/70"
                    }`}
                  >
                    <span className="text-xs font-black">{String(card.number).padStart(2, "0")}</span>
                    <span className="overflow-hidden text-ellipsis text-xs font-semibold leading-tight">
                      {card.name}
                    </span>
                  </div>
                );
              }),
            )}
          </div>

          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-3">
              <p className="text-bone/45">Tablas live generadas</p>
              <p className="mt-1 text-2xl font-black text-bone">50</p>
            </div>
            <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-3">
              <p className="text-bone/45">Tablas revisadas por carta</p>
              <p className="mt-1 text-2xl font-black text-bone">{activeBoards.length}</p>
            </div>
          </div>
        </aside>
      </div>
      {winner ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-obsidian/88 p-4 backdrop-blur">
          <div className="winner-overlay w-full max-w-4xl rounded-lg border border-mezcal/50 bg-[radial-gradient(circle_at_50%_0%,rgba(217,164,65,0.32),rgba(20,17,15,0.96)_48%,rgba(8,7,6,0.98)_100%)] p-6 text-center shadow-glow md:p-10">
            <p className="text-sm font-black uppercase tracking-[0.36em] text-mezcal md:text-base">
              TABLA GANADORA
            </p>
            <h2 className="mt-4 font-display text-6xl leading-none text-bone md:text-8xl">
              {winner.board.folio}
            </h2>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-agave">
              Premio
            </p>
            <p className="mt-1 text-5xl font-black text-bone md:text-7xl">
              ${config.calculatedPrize}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-sm font-semibold text-bone/65 md:text-base">
              Cartas ganadoras: {winner.winningCards.map((card) => card.name).join(", ")}
            </p>
            <Button className="mt-8" onClick={resetGame}>
              <RotateCcw className="h-4 w-4" />
              Reiniciar demo
            </Button>
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
        Powered by Hoster Live
      </p>
    </div>
  );
}

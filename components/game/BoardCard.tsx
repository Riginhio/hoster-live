"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import {
  checkWinner,
  type LoteriaBoard,
  type WinMode,
} from "@/lib/loteria";

type BoardCardProps = {
  board: LoteriaBoard;
  calledCardIds: string[];
  lastCalledCardId?: string;
  mode: WinMode;
  winnerFolio?: string;
  compact?: boolean;
};

export function BoardCard({
  board,
  calledCardIds,
  lastCalledCardId,
  mode,
  winnerFolio,
  compact = false,
}: BoardCardProps) {
  const calledCardsSet = new Set(calledCardIds);
  const matchedCards = board.cards
    .flat()
    .filter((card) => calledCardsSet.has(card.id));
  const winnerCheck = checkWinner(board, calledCardIds, mode);
  const isWinner = winnerCheck.hasWon || winnerFolio === board.folio;
  const progress = Math.round((matchedCards.length / 16) * 100);

  return (
    <article
      className={clsx(
        "overflow-hidden rounded-lg border bg-charcoal/70 p-4 shadow-cantina transition",
        isWinner
          ? "border-mezcal/70 bg-mezcal/10 shadow-glow"
          : "border-bone/10 hover:border-mezcal/30",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl text-bone">{board.folio}</h3>
            {isWinner ? (
              <span className="rounded-full bg-mezcal px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-obsidian">
                Ganadora
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-bone/55">
            {matchedCards.length}/16 cartas acertadas
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-agave">Progreso</p>
          <p className="mt-1 text-2xl font-black text-bone">{progress}%</p>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-bone/10">
        <div
          className={clsx("h-full rounded-full transition-all", isWinner ? "bg-mezcal" : "bg-agave")}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {board.cards.flat().map((card) => {
          const isMatched = calledCardsSet.has(card.id);
          const isLatestMatch = isMatched && lastCalledCardId === card.id;

          return (
            <div
              key={card.id}
              className={clsx(
                "relative overflow-hidden rounded-lg border bg-bone/[0.04] transition duration-300",
                compact ? "min-h-24" : "min-h-28 sm:min-h-32",
                isMatched
                  ? "border-mezcal/65 shadow-[0_0_24px_rgba(217,164,65,0.30)]"
                  : "border-bone/10",
                isLatestMatch && "latest-board-hit border-mezcal shadow-glow",
              )}
            >
              <Image
                src={card.image}
                alt={card.name}
                width={180}
                height={285}
                className={clsx(
                  "h-full w-full object-cover transition duration-300",
                  isMatched && "brightness-105 saturate-110",
                )}
              />
              <div className="absolute inset-x-0 bottom-0 bg-obsidian/78 px-1.5 py-1 text-center backdrop-blur-sm">
                <p className="truncate text-[10px] font-bold leading-tight text-bone">
                  {card.name}
                </p>
              </div>
              {isMatched ? (
                <div
                  className={clsx(
                    "board-hit-marker absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_46%,rgba(192,57,43,0.58),rgba(192,57,43,0.34)_38%,rgba(8,7,6,0.10)_72%)]",
                    isLatestMatch && "board-hit-marker-latest",
                  )}
                >
                  <span className="absolute inset-2 rounded-full border border-chile/55 bg-chile/28 shadow-[0_0_24px_rgba(217,164,65,0.38)] backdrop-blur-[1px]" />
                  <span className="relative grid h-7 w-7 place-items-center rounded-full border border-mezcal/75 bg-obsidian/82 text-mezcal shadow-glow">
                    <Check size={15} strokeWidth={3.4} />
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

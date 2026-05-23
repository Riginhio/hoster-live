import { cardsCatalog } from "@/lib/cards/catalog";

export type LoteriaCard = {
  id: string;
  number: number;
  slug: string;
  name: string;
  image: string;
  confederation?: string;
  isDebutant?: boolean;
  qualificationType?: string;
};

export type LoteriaBoard = {
  folio: string;
  cards: LoteriaCard[][];
};

export type WinMode = "four_corners" | "x_shape" | "center_four" | "full_card";

export type WinningPosition = {
  row: number;
  col: number;
};

export type WinnerCheck = {
  hasWon: boolean;
  mode: WinMode;
  positions: WinningPosition[];
  winningCards: LoteriaCard[];
};

export const loteriaCards: LoteriaCard[] = cardsCatalog.map((card) => ({
  id: card.slug,
  number: card.id,
  slug: card.slug,
  name: card.name,
  image: card.image,
}));

const winPatterns: Record<WinMode, WinningPosition[]> = {
  four_corners: [
    { row: 0, col: 0 },
    { row: 0, col: 3 },
    { row: 3, col: 0 },
    { row: 3, col: 3 },
  ],
  x_shape: [
    { row: 0, col: 0 },
    { row: 0, col: 3 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
    { row: 3, col: 0 },
    { row: 3, col: 3 },
  ],
  center_four: [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
  full_card: Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (__, col) => ({ row, col })),
  ).flat(),
};

export function shuffleCards(cards: LoteriaCard[] = loteriaCards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export function generateBoard(folio: string): LoteriaBoard {
  const selectedCards = shuffleCards().slice(0, 16);

  return {
    folio,
    cards: [
      selectedCards.slice(0, 4),
      selectedCards.slice(4, 8),
      selectedCards.slice(8, 12),
      selectedCards.slice(12, 16),
    ],
  };
}

export function checkWinner(
  board: LoteriaBoard,
  calledCards: Array<LoteriaCard | string>,
  mode: WinMode,
): WinnerCheck {
  const calledCardIds = new Set(
    calledCards.map((card) => (typeof card === "string" ? card : card.id)),
  );
  const positions = winPatterns[mode];
  const winningCards = positions.map(({ row, col }) => board.cards[row][col]);
  const hasWon = winningCards.every((card) => calledCardIds.has(card.id));

  return {
    hasWon,
    mode,
    positions: hasWon ? positions : [],
    winningCards: hasWon ? winningCards : [],
  };
}

export function getWinPattern(mode: WinMode) {
  return winPatterns[mode];
}

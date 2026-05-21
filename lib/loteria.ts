export type LoteriaCard = {
  id: string;
  number: number;
  name: string;
};

export type LoteriaBoard = {
  folio: string;
  cards: LoteriaCard[][];
};

export type WinMode = "four_corners" | "x_shape" | "center_four";

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

export const loteriaCards: LoteriaCard[] = [
  { id: "el-gallo", number: 1, name: "El Gallo" },
  { id: "el-diablito", number: 2, name: "El Diablito" },
  { id: "la-dama", number: 3, name: "La Dama" },
  { id: "el-catrin", number: 4, name: "El Catrin" },
  { id: "el-paraguas", number: 5, name: "El Paraguas" },
  { id: "la-sirena", number: 6, name: "La Sirena" },
  { id: "la-escalera", number: 7, name: "La Escalera" },
  { id: "la-botella", number: 8, name: "La Botella" },
  { id: "el-barril", number: 9, name: "El Barril" },
  { id: "el-arbol", number: 10, name: "El Arbol" },
  { id: "el-melon", number: 11, name: "El Melon" },
  { id: "el-valiente", number: 12, name: "El Valiente" },
  { id: "el-gorrito", number: 13, name: "El Gorrito" },
  { id: "la-muerte", number: 14, name: "La Muerte" },
  { id: "la-pera", number: 15, name: "La Pera" },
  { id: "la-bandera", number: 16, name: "La Bandera" },
  { id: "el-bandolon", number: 17, name: "El Bandolon" },
  { id: "el-violoncello", number: 18, name: "El Violoncello" },
  { id: "la-garza", number: 19, name: "La Garza" },
  { id: "el-pajaro", number: 20, name: "El Pajaro" },
  { id: "la-mano", number: 21, name: "La Mano" },
  { id: "la-bota", number: 22, name: "La Bota" },
  { id: "la-luna", number: 23, name: "La Luna" },
  { id: "el-cotorro", number: 24, name: "El Cotorro" },
  { id: "el-borracho", number: 25, name: "El Borracho" },
  { id: "el-negrito", number: 26, name: "El Negrito" },
  { id: "el-corazon", number: 27, name: "El Corazon" },
  { id: "la-sandia", number: 28, name: "La Sandia" },
  { id: "el-tambor", number: 29, name: "El Tambor" },
  { id: "el-camaron", number: 30, name: "El Camaron" },
  { id: "las-jaras", number: 31, name: "Las Jaras" },
  { id: "el-musico", number: 32, name: "El Musico" },
  { id: "la-arana", number: 33, name: "La Arana" },
  { id: "el-soldado", number: 34, name: "El Soldado" },
  { id: "la-estrella", number: 35, name: "La Estrella" },
  { id: "el-cazo", number: 36, name: "El Cazo" },
  { id: "el-mundo", number: 37, name: "El Mundo" },
  { id: "el-apache", number: 38, name: "El Apache" },
  { id: "el-nopal", number: 39, name: "El Nopal" },
  { id: "el-alacran", number: 40, name: "El Alacran" },
  { id: "la-rosa", number: 41, name: "La Rosa" },
  { id: "la-calavera", number: 42, name: "La Calavera" },
  { id: "la-campana", number: 43, name: "La Campana" },
  { id: "el-cantarito", number: 44, name: "El Cantarito" },
  { id: "el-venado", number: 45, name: "El Venado" },
  { id: "el-sol", number: 46, name: "El Sol" },
  { id: "la-corona", number: 47, name: "La Corona" },
  { id: "la-chalupa", number: 48, name: "La Chalupa" },
  { id: "el-pino", number: 49, name: "El Pino" },
  { id: "el-pescado", number: 50, name: "El Pescado" },
  { id: "la-palma", number: 51, name: "La Palma" },
  { id: "la-maceta", number: 52, name: "La Maceta" },
  { id: "el-arpa", number: 53, name: "El Arpa" },
  { id: "la-rana", number: 54, name: "La Rana" },
];

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

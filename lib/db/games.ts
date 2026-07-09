import crypto from "crypto";
import { ObjectId } from "bson";
import { trackActivity } from "@/lib/activity";
import { getSqliteStore } from "@/lib/db/sqlite";
import {
  checkWinByGrid,
  createSeededRng,
  generateClassicBingoCard,
  getBingoGridShape,
  getCallPoolForVariant,
  getDefaultWinCondition,
  getFreeSpaceIndexForGrid,
  normalizeBingoVariant,
  type BingoVariant,
  type WinCondition,
} from "@/lib/classic-bingo";

export interface CalledItem {
  item: string;
  calledAt: Date;
}

export interface MarkEvent {
  cellIndex: number;
  markedAt: Date;
}

export interface GamePlayer {
  playerId: string;
  playerTokenHash: string;
  userId?: string;
  email?: string;
  playerName: string;
  cells: string[];
  marked: number[];
  markHistory: MarkEvent[];
  hasBingo: boolean;
  joinedAt: Date;
}

export type CallMode = "random" | "manual" | "auto" | "sequential";
export interface GameSettings {
  callMode: CallMode;
  winCondition: WinCondition;
  allowMultipleWinners: boolean;
  autoCallInterval?: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  callMode: "random",
  winCondition: "standard",
  allowMultipleWinners: false,
};

export interface GameWinner {
  playerId: string;
  playerName: string;
  verificationCode: string;
  claimedAt: Date;
}

export interface GameRoom {
  _id: ObjectId;
  roomCode: string;
  hostUserId: string;
  hostName?: string;
  hostEmail?: string;
  sourceCardId: string;
  title: string;
  wordList: string[];
  size: 3 | 4 | 5;
  rows?: number;
  columns?: number;
  bingoVariant?: BingoVariant;
  freeSpace: boolean;
  calledItems: string[];
  callHistory: CalledItem[];
  players: GamePlayer[];
  status: "waiting" | "active" | "finished";
  settings: GameSettings;
  winners: GameWinner[];
  startedAt?: Date;
  endedAt?: Date;
  winnerId?: string;
  winnerName?: string;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
    headerText?: string;
    footerText?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

function generatePlayerToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function generateWinnerVerificationCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

function updateRoomInSqlite(
  room: GameRoom,
  data: Partial<GameRoom>,
): GameRoom | null {
  return getSqliteStore().findOneAndUpdate<GameRoom>(
    "game_rooms",
    { _id: room._id },
    { $set: data },
    { returnDocument: "after" },
  );
}

function getPlayerIndex(room: GameRoom, playerId: string): number {
  return room.players.findIndex((player) => player.playerId === playerId);
}

export async function createGameRoom(
  hostUserId: string,
  sourceCardId: string,
  title: string,
  wordList: string[],
  size: 3 | 4 | 5,
  freeSpace: boolean,
  style: GameRoom["style"],
  hostName?: string,
  hostEmail?: string,
  options: {
    rows?: number;
    columns?: number;
    bingoVariant?: BingoVariant;
  } = {},
): Promise<GameRoom> {
  const bingoVariant = normalizeBingoVariant(options.bingoVariant);
  const gridShape = getBingoGridShape({
    size,
    rows: options.rows,
    columns: options.columns,
    bingoVariant,
  });
  const callPool = getCallPoolForVariant(
    bingoVariant,
    wordList.filter((w) => w.trim()),
  );

  const store = getSqliteStore();
  let roomCode = generateRoomCode();
  let existing = store.findOne<GameRoom>("game_rooms", {
    roomCode,
    status: { $ne: "finished" },
  });
  while (existing) {
    roomCode = generateRoomCode();
    existing = store.findOne<GameRoom>("game_rooms", {
      roomCode,
      status: { $ne: "finished" },
    });
  }

  const room: Omit<GameRoom, "_id"> = {
    roomCode,
    hostUserId,
    hostName: hostName || undefined,
    hostEmail: hostEmail || undefined,
    sourceCardId,
    title,
    wordList: callPool,
    size,
    rows: gridShape.rows,
    columns: gridShape.columns,
    bingoVariant,
    freeSpace: bingoVariant === "classic90" ? false : freeSpace,
    calledItems: [],
    callHistory: [],
    players: [],
    status: "waiting",
    settings: {
      ...DEFAULT_SETTINGS,
      winCondition: getDefaultWinCondition(bingoVariant),
    },
    winners: [],
    style,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = store.insertOne("game_rooms", room as GameRoom);
  return { ...room, _id: result.insertedId as ObjectId } as GameRoom;
}

export async function getGameRoom(roomCode: string): Promise<GameRoom | null> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", { roomCode });

  if (room && room.status !== "finished") {
    const ageMs = Date.now() - new Date(room.updatedAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      updateRoomInSqlite(room, { status: "finished", updatedAt: new Date() });
      return { ...room, status: "finished" };
    }
  }

  return room;
}

export async function cleanupStaleRooms(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleRooms = getSqliteStore().findMany<GameRoom>("game_rooms", {
    status: { $in: ["waiting", "active"] },
    updatedAt: { $lt: cutoff },
  });

  if (staleRooms.length === 0) return 0;

  const result = getSqliteStore().updateMany<GameRoom>(
    "game_rooms",
    { status: { $in: ["waiting", "active"] }, updatedAt: { $lt: cutoff } },
    { $set: { status: "finished", updatedAt: new Date() } },
  );

  for (const room of staleRooms) {
    const inactivityMinutes = Math.round(
      (Date.now() - new Date(room.updatedAt).getTime()) / 60000,
    );
    trackActivity({
      event: "game_auto_ended",
      source: "server",
      userId: null,
      email: null,
      pathname: null,
      metadata: {
        roomCode: room.roomCode,
        playerCount: room.players?.length || 0,
        calledItemCount: room.calledItems?.length || 0,
        inactivityMinutes,
      },
    }).catch(() => {});
  }

  return result.modifiedCount;
}

function generateCardCells(
  wordList: string[],
  size: number,
  freeSpace: boolean,
): string[] {
  const totalCells = size * size;
  const neededCells = freeSpace ? totalCells - 1 : totalCells;

  const shuffled = shuffleArray(wordList);
  let cells: string[];
  if (shuffled.length >= neededCells) {
    cells = shuffled.slice(0, neededCells);
  } else {
    cells = [];
    for (let i = 0; i < neededCells; i++) {
      cells.push(shuffled[i % shuffled.length]!);
    }
    cells = shuffleArray(cells);
  }

  if (freeSpace) {
    const center = Math.floor(totalCells / 2);
    cells.splice(center, 0, "FREE");
  }

  return cells;
}

function generatePlayerCells(room: GameRoom): string[] {
  const variant = normalizeBingoVariant(room.bingoVariant);
  if (variant === "classic75" || variant === "classic90") {
    const seed = Date.now() ^ crypto.randomInt(0, 0xffffffff);
    return generateClassicBingoCard(variant, createSeededRng(seed));
  }
  return generateCardCells(room.wordList, room.size, room.freeSpace);
}

const MAX_PLAYERS_PER_ROOM = 50;

export async function joinGameRoom(
  roomCode: string,
  playerName: string,
  userId?: string,
  email?: string,
): Promise<{ player: GamePlayer; room: GameRoom; playerToken: string } | null> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", { roomCode });
  if (!room || room.status === "finished") return null;

  if (userId) {
    const existingPlayer = room.players.find(
      (player) => player.userId === userId,
    );
    if (existingPlayer) {
      const { raw: playerToken, hash: playerTokenHash } = generatePlayerToken();
      const updatedPlayer: GamePlayer = {
        ...existingPlayer,
        playerTokenHash,
        playerName: playerName.trim() || existingPlayer.playerName,
        email: email || existingPlayer.email,
      };
      const players = room.players.map((player) =>
        player.playerId === existingPlayer.playerId ? updatedPlayer : player,
      );
      const updatedRoom = updateRoomInSqlite(room, {
        players,
        updatedAt: new Date(),
      });
      if (!updatedRoom) return null;
      return { player: updatedPlayer, room: updatedRoom, playerToken };
    }
  }

  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return null;

  const existingNames = new Set(
    room.players.map((p) => p.playerName.toLowerCase()),
  );
  let finalName = playerName.trim();
  if (existingNames.has(finalName.toLowerCase())) {
    let counter = 2;
    while (existingNames.has(`${finalName} ${counter}`.toLowerCase())) {
      counter++;
    }
    finalName = `${finalName} ${counter}`;
  }

  const gridShape = getBingoGridShape(room);
  const cells = generatePlayerCells(room);
  const freeSpaceIndex = getFreeSpaceIndexForGrid({
    freeSpace: room.freeSpace,
    rows: gridShape.rows,
    columns: gridShape.columns,
    bingoVariant: room.bingoVariant,
  });

  const playerId = new ObjectId().toString();
  const { raw: playerToken, hash: playerTokenHash } = generatePlayerToken();
  const player: GamePlayer = {
    playerId,
    playerTokenHash,
    userId: userId || undefined,
    email: email || undefined,
    playerName: finalName,
    cells,
    marked: freeSpaceIndex >= 0 ? [freeSpaceIndex] : [],
    markHistory: [],
    hasBingo: false,
    joinedAt: new Date(),
  };

  const updatedRoom = updateRoomInSqlite(room, {
    players: [...room.players, player],
    updatedAt: new Date(),
  });
  if (!updatedRoom) return null;
  return { player, room: updatedRoom, playerToken };
}

export async function verifyPlayerToken(
  roomCode: string,
  playerId: string,
  rawToken: string,
): Promise<boolean> {
  if (typeof rawToken !== "string" || rawToken.length !== 64) return false;

  const room = getSqliteStore().findOne<GameRoom>("game_rooms", { roomCode });
  const player = room?.players?.find((entry) => entry.playerId === playerId);
  if (!player || typeof player.playerTokenHash !== "string") return false;

  const suppliedHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const a = Buffer.from(suppliedHash, "hex");
  const b = Buffer.from(player.playerTokenHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function startGame(
  roomCode: string,
  hostUserId: string,
  hostPlaysAlong?: boolean,
): Promise<{ started: boolean; hostPlayer?: GamePlayer }> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", {
    roomCode,
    hostUserId,
    status: "waiting",
  });
  if (!room) return { started: false };

  const now = new Date();
  let hostPlayer: GamePlayer | undefined;
  let players = room.players;

  if (hostPlaysAlong) {
    const gridShape = getBingoGridShape(room);
    const cells = generatePlayerCells(room);
    const freeSpaceIndex = getFreeSpaceIndexForGrid({
      freeSpace: room.freeSpace,
      rows: gridShape.rows,
      columns: gridShape.columns,
      bingoVariant: room.bingoVariant,
    });
    const { hash: hostTokenHash } = generatePlayerToken();
    hostPlayer = {
      playerId: new ObjectId().toString(),
      playerTokenHash: hostTokenHash,
      userId: hostUserId,
      email: room.hostEmail || undefined,
      playerName: (room.hostName || "Host") + " (Host)",
      cells,
      marked: freeSpaceIndex >= 0 ? [freeSpaceIndex] : [],
      markHistory: [],
      hasBingo: false,
      joinedAt: now,
    };
    players = [...room.players, hostPlayer];
  }

  const updated = updateRoomInSqlite(room, {
    status: "active",
    startedAt: now,
    updatedAt: now,
    players,
  });
  if (!updated) return { started: false };
  return { started: true, hostPlayer };
}

export async function callItem(
  roomCode: string,
  hostUserId: string,
  item: string,
): Promise<GameRoom | null> {
  const now = new Date();
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", {
    roomCode,
    hostUserId,
    status: "active",
  });
  if (!room || !room.wordList.includes(item) || room.calledItems.includes(item))
    return null;

  return updateRoomInSqlite(room, {
    calledItems: [...room.calledItems, item],
    callHistory: [...room.callHistory, { item, calledAt: now }],
    updatedAt: now,
  });
}

export async function callRandomItem(
  roomCode: string,
  hostUserId: string,
): Promise<{ item: string; room: GameRoom } | null> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", {
    roomCode,
    hostUserId,
    status: "active",
  });
  if (!room) return null;

  const calledSet = new Set(room.calledItems);
  const uncalled = room.wordList.filter((w) => !calledSet.has(w));
  if (uncalled.length === 0) return null;

  const item = uncalled[Math.floor(Math.random() * uncalled.length)]!;
  const now = new Date();
  const updated = updateRoomInSqlite(room, {
    calledItems: [...room.calledItems, item],
    callHistory: [...room.callHistory, { item, calledAt: now }],
    updatedAt: now,
  });

  return updated ? { item, room: updated } : null;
}

export async function callSequentialItem(
  roomCode: string,
  hostUserId: string,
): Promise<{ item: string; room: GameRoom } | null> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", {
    roomCode,
    hostUserId,
    status: "active",
  });
  if (!room) return null;

  const calledSet = new Set(room.calledItems);
  const nextItem = room.wordList.find((w) => !calledSet.has(w));
  if (!nextItem) return null;

  const now = new Date();
  const updated = updateRoomInSqlite(room, {
    calledItems: [...room.calledItems, nextItem],
    callHistory: [...room.callHistory, { item: nextItem, calledAt: now }],
    updatedAt: now,
  });

  return updated ? { item: nextItem, room: updated } : null;
}

export async function updateGameSettings(
  roomCode: string,
  hostUserId: string,
  settings: Partial<GameSettings>,
): Promise<boolean> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", {
    roomCode,
    hostUserId,
    status: "waiting",
  });
  if (!room) return false;

  const nextSettings = { ...room.settings } as Record<string, unknown>;
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      nextSettings[key] = value;
    }
  }

  return Boolean(
    updateRoomInSqlite(room, {
      settings: nextSettings as unknown as GameSettings,
      updatedAt: new Date(),
    }),
  );
}

export async function markCell(
  roomCode: string,
  playerId: string,
  cellIndex: number,
  rawToken: string,
  bypassTokenCheck = false,
): Promise<boolean> {
  if (
    !bypassTokenCheck &&
    !(await verifyPlayerToken(roomCode, playerId, rawToken))
  )
    return false;

  const room = getSqliteStore().findOne<GameRoom>("game_rooms", { roomCode });
  if (!room) return false;
  const index = getPlayerIndex(room, playerId);
  if (index < 0) return false;

  const now = new Date();
  const players = room.players.map((player) => {
    if (player.playerId !== playerId) return player;
    const marked = player.marked.some((entry) => entry === cellIndex)
      ? player.marked
      : [...player.marked, cellIndex];
    return {
      ...player,
      marked,
      markHistory: [...player.markHistory, { cellIndex, markedAt: now }],
    };
  });

  return Boolean(updateRoomInSqlite(room, { players, updatedAt: now }));
}

export async function unmarkCell(
  roomCode: string,
  playerId: string,
  cellIndex: number,
  rawToken: string,
  bypassTokenCheck = false,
): Promise<boolean> {
  if (
    !bypassTokenCheck &&
    !(await verifyPlayerToken(roomCode, playerId, rawToken))
  )
    return false;

  const room = getSqliteStore().findOne<GameRoom>("game_rooms", { roomCode });
  if (!room) return false;
  const index = getPlayerIndex(room, playerId);
  if (index < 0) return false;

  const players = room.players.map((player) => {
    if (player.playerId !== playerId) return player;
    return {
      ...player,
      marked: player.marked.filter((entry) => entry !== cellIndex),
    };
  });

  return Boolean(updateRoomInSqlite(room, { players, updatedAt: new Date() }));
}

export function checkWinByCondition(
  marked: number[],
  cells: string[],
  rows: number,
  columns: number,
  winCondition: WinCondition,
  variant: BingoVariant = "custom",
): boolean {
  return checkWinByGrid(marked, cells, rows, columns, winCondition, variant);
}

export function detectWinPattern(
  marked: number[],
  cells: string[],
  rows: number,
  columns: number,
  variant: BingoVariant = "custom",
): string | null {
  if (variant === "classic90") {
    const markedSet = new Set(marked);
    const completedRows = Array.from({ length: rows }, (_, row) => {
      const rowIndices = Array.from(
        { length: columns },
        (_, column) => row * columns + column,
      ).filter((index) => (cells[index] || "").trim());
      return (
        rowIndices.length > 0 &&
        rowIndices.every((index) => markedSet.has(index))
      );
    }).filter(Boolean).length;
    if (completedRows >= 3) return "full_house";
    if (completedRows >= 2) return "two_lines";
    if (completedRows >= 1) return "one_line";
    return null;
  }

  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => marked.includes(r * columns + c)),
  );
  // Check rows
  for (let r = 0; r < rows; r++) {
    if (grid[r]?.every(Boolean)) return "row";
  }
  // Check columns
  for (let c = 0; c < columns; c++) {
    if (grid.map((row) => row[c] ?? false).every(Boolean)) return "column";
  }
  // Check main diagonal (top-left to bottom-right)
  if (
    rows === columns &&
    Array.from({ length: rows }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)
  )
    return "diagonal";
  // Check anti-diagonal (top-right to bottom-left)
  if (
    rows === columns &&
    Array.from(
      { length: rows },
      (_, i) => grid[i]?.[columns - 1 - i] ?? false,
    ).every(Boolean)
  )
    return "diagonal";
  // Check four corners
  if (
    grid[0]?.[0] &&
    grid[0]?.[columns - 1] &&
    grid[rows - 1]?.[0] &&
    grid[rows - 1]?.[columns - 1]
  ) {
    return "four_corners";
  }
  return null;
}

export async function claimBingo(
  roomCode: string,
  playerId: string,
  rawToken: string,
  bypassTokenCheck = false,
): Promise<{
  valid: boolean;
  playerName?: string;
  verificationCode?: string;
  gameEnded?: boolean;
}> {
  if (
    !bypassTokenCheck &&
    !(await verifyPlayerToken(roomCode, playerId, rawToken))
  )
    return { valid: false };

  const room = getSqliteStore().findOne<GameRoom>("game_rooms", { roomCode });
  if (!room || room.status !== "active") return { valid: false };

  const player = room.players.find((p) => p.playerId === playerId);
  if (!player) return { valid: false };
  if (player.hasBingo) return { valid: false };

  const settings = room.settings ?? DEFAULT_SETTINGS;
  const variant = normalizeBingoVariant(room.bingoVariant);
  const gridShape = getBingoGridShape(room);
  const calledSet = new Set(room.calledItems);
  const freeIdx = getFreeSpaceIndexForGrid({
    freeSpace: room.freeSpace,
    rows: gridShape.rows,
    columns: gridShape.columns,
    bingoVariant: variant,
  });

  for (const idx of player.marked) {
    if (idx === freeIdx) continue;
    const cellValue = player.cells[idx]!;
    if (!cellValue.trim()) continue;
    if (!calledSet.has(cellValue)) return { valid: false };
  }

  if (
    !checkWinByCondition(
      player.marked,
      player.cells,
      gridShape.rows,
      gridShape.columns,
      settings.winCondition,
      variant,
    )
  )
    return { valid: false };

  const now = new Date();
  const verificationCode = generateWinnerVerificationCode();
  const winner: GameWinner = {
    playerId,
    playerName: player.playerName,
    verificationCode,
    claimedAt: now,
  };
  const isFirstWinner = (room.winners ?? []).length === 0;
  const players = room.players.map((entry) =>
    entry.playerId === playerId ? { ...entry, hasBingo: true } : entry,
  );

  if (settings.allowMultipleWinners) {
    updateRoomInSqlite(room, {
      players,
      winners: [...(room.winners ?? []), winner],
      ...(isFirstWinner
        ? { winnerId: playerId, winnerName: player.playerName }
        : {}),
      updatedAt: now,
    });

    return { valid: true, playerName: player.playerName, verificationCode, gameEnded: false };
  }

  updateRoomInSqlite(room, {
    players,
    status: "finished",
    endedAt: now,
    winnerId: playerId,
    winnerName: player.playerName,
    winners: [...(room.winners ?? []), winner],
    updatedAt: now,
  });

  return { valid: true, playerName: player.playerName, verificationCode, gameEnded: true };
}

export async function endGame(
  roomCode: string,
  hostUserId: string,
): Promise<boolean> {
  const room = getSqliteStore().findOne<GameRoom>("game_rooms", {
    roomCode,
    hostUserId,
  });
  if (!room) return false;

  const now = new Date();
  return Boolean(
    updateRoomInSqlite(room, {
      status: "finished",
      endedAt: now,
      updatedAt: now,
    }),
  );
}

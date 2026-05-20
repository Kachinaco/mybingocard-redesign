import crypto from "crypto";
import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import { trackActivity } from "@/lib/activity";
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
  } = {}
): Promise<GameRoom> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const bingoVariant = normalizeBingoVariant(options.bingoVariant);
  const gridShape = getBingoGridShape({
    size,
    rows: options.rows,
    columns: options.columns,
    bingoVariant,
  });
  const callPool = getCallPoolForVariant(bingoVariant, wordList.filter(w => w.trim()));

  let roomCode = generateRoomCode();
  // Ensure unique
  let existing = await db.collection("game_rooms").findOne({ roomCode, status: { $ne: "finished" } });
  while (existing) {
    roomCode = generateRoomCode();
    existing = await db.collection("game_rooms").findOne({ roomCode, status: { $ne: "finished" } });
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
    settings: { ...DEFAULT_SETTINGS, winCondition: getDefaultWinCondition(bingoVariant) },
    winners: [],
    style,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection<GameRoom>("game_rooms").insertOne(room as GameRoom);
  return { ...room, _id: result.insertedId } as GameRoom;
}

export async function getGameRoom(roomCode: string): Promise<GameRoom | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const room = await db.collection<GameRoom>("game_rooms").findOne({ roomCode });

  // Auto-expire stale rooms on read
  if (room && room.status !== "finished") {
    const ageMs = Date.now() - new Date(room.updatedAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      await db.collection<GameRoom>("game_rooms").updateOne(
        { _id: room._id },
        { $set: { status: "finished", updatedAt: new Date() } }
      );
      return { ...room, status: "finished" };
    }
  }

  return room;
}

export async function cleanupStaleRooms(): Promise<number> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch stale rooms before updating so we can track each one
  const staleRooms = await db.collection<GameRoom>("game_rooms")
    .find({ status: { $in: ["waiting", "active"] }, updatedAt: { $lt: cutoff } })
    .toArray();

  if (staleRooms.length === 0) return 0;

  const result = await db.collection<GameRoom>("game_rooms").updateMany(
    { status: { $in: ["waiting", "active"] }, updatedAt: { $lt: cutoff } },
    { $set: { status: "finished", updatedAt: new Date() } }
  );

  // Track each auto-ended room
  for (const room of staleRooms) {
    const inactivityMinutes = Math.round((Date.now() - new Date(room.updatedAt).getTime()) / 60000);
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

function generateCardCells(wordList: string[], size: number, freeSpace: boolean): string[] {
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
  email?: string
): Promise<{ player: GamePlayer; room: GameRoom; playerToken: string } | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({ roomCode });
  if (!room || room.status === "finished") return null;

  // Reuse an existing signed-in player slot instead of duplicating the same
  // account in the room. Rotate the token so rejoining refreshes the session.
  if (userId) {
    const existingPlayer = room.players.find((player) => player.userId === userId);
    if (existingPlayer) {
      const { raw: playerToken, hash: playerTokenHash } = generatePlayerToken();
      await db.collection<GameRoom>("game_rooms").updateOne(
        { _id: room._id, "players.playerId": existingPlayer.playerId },
        {
          $set: {
            "players.$.playerTokenHash": playerTokenHash,
            "players.$.playerName": playerName.trim() || existingPlayer.playerName,
            "players.$.email": email || existingPlayer.email,
            updatedAt: new Date(),
          },
        }
      );

      const updatedRoom = await db.collection<GameRoom>("game_rooms").findOne({ _id: room._id });
      const updatedPlayer =
        updatedRoom?.players.find((player) => player.playerId === existingPlayer.playerId) ||
        {
          ...existingPlayer,
          playerTokenHash,
          playerName: playerName.trim() || existingPlayer.playerName,
          email: email || existingPlayer.email,
        };

      return { player: updatedPlayer, room: updatedRoom!, playerToken };
    }
  }

  // Enforce player cap
  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return null;

  // Deduplicate player names
  const existingNames = new Set(room.players.map(p => p.playerName.toLowerCase()));
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

  await db.collection<GameRoom>("game_rooms").updateOne(
    { _id: room._id },
    {
      $push: { players: player } as any,
      $set: { updatedAt: new Date() },
    }
  );

  const updatedRoom = await db.collection<GameRoom>("game_rooms").findOne({ _id: room._id });
  return { player, room: updatedRoom!, playerToken };
}

export async function verifyPlayerToken(
  roomCode: string,
  playerId: string,
  rawToken: string
): Promise<boolean> {
  if (typeof rawToken !== "string" || rawToken.length !== 64) return false;

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne(
    { roomCode, "players.playerId": playerId },
    { projection: { "players.$": 1 } }
  );
  const player = room?.players?.[0];
  if (!player || typeof player.playerTokenHash !== "string") return false;

  const suppliedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const a = Buffer.from(suppliedHash, "hex");
  const b = Buffer.from(player.playerTokenHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function startGame(
  roomCode: string,
  hostUserId: string,
  hostPlaysAlong?: boolean
): Promise<{ started: boolean; hostPlayer?: GamePlayer }> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({
    roomCode, hostUserId, status: "waiting",
  });
  if (!room) return { started: false };

  const now = new Date();
  let hostPlayer: GamePlayer | undefined;

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

    const result = await db.collection<GameRoom>("game_rooms").updateOne(
      { _id: room._id, status: "waiting" },
      {
        $set: { status: "active", startedAt: now, updatedAt: now },
        $push: { players: hostPlayer } as any,
      }
    );
    if (result.modifiedCount === 0) return { started: false };
  } else {
    const result = await db.collection<GameRoom>("game_rooms").updateOne(
      { _id: room._id, status: "waiting" },
      { $set: { status: "active", startedAt: now, updatedAt: now } }
    );
    if (result.modifiedCount === 0) return { started: false };
  }

  return { started: true, hostPlayer };
}

export async function callItem(
  roomCode: string,
  hostUserId: string,
  item: string
): Promise<GameRoom | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const now = new Date();

  const room = await db.collection<GameRoom>("game_rooms").findOne({
    roomCode,
    hostUserId,
    status: "active",
  });
  if (!room || !room.wordList.includes(item) || room.calledItems.includes(item)) return null;

  const result = await db.collection<GameRoom>("game_rooms").findOneAndUpdate(
    { _id: room._id },
    {
      $push: {
        calledItems: item,
        callHistory: { item, calledAt: now },
      } as any,
      $set: { updatedAt: now },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function callRandomItem(
  roomCode: string,
  hostUserId: string
): Promise<{ item: string; room: GameRoom } | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({
    roomCode,
    hostUserId,
    status: "active",
  });
  if (!room) return null;

  // Find uncalled items
  const calledSet = new Set(room.calledItems);
  const uncalled = room.wordList.filter(w => !calledSet.has(w));
  if (uncalled.length === 0) return null;

  const item = uncalled[Math.floor(Math.random() * uncalled.length)]!;

  const now = new Date();
  const updated = await db.collection<GameRoom>("game_rooms").findOneAndUpdate(
    { _id: room._id },
    {
      $push: {
        calledItems: item,
        callHistory: { item, calledAt: now },
      } as any,
      $set: { updatedAt: now },
    },
    { returnDocument: "after" }
  );

  return updated ? { item, room: updated } : null;
}

export async function callSequentialItem(
  roomCode: string,
  hostUserId: string
): Promise<{ item: string; room: GameRoom } | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({
    roomCode,
    hostUserId,
    status: "active",
  });
  if (!room) return null;

  const calledSet = new Set(room.calledItems);
  const nextItem = room.wordList.find(w => !calledSet.has(w));
  if (!nextItem) return null;

  const now = new Date();
  const updated = await db.collection<GameRoom>("game_rooms").findOneAndUpdate(
    { _id: room._id },
    {
      $push: {
        calledItems: nextItem,
        callHistory: { item: nextItem, calledAt: now },
      } as any,
      $set: { updatedAt: now },
    },
    { returnDocument: "after" }
  );

  return updated ? { item: nextItem, room: updated } : null;
}

export async function updateGameSettings(
  roomCode: string,
  hostUserId: string,
  settings: Partial<GameSettings>
): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const setFields: Record<string, any> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      setFields[`settings.${key}`] = value;
    }
  }

  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, hostUserId, status: "waiting" },
    { $set: setFields }
  );
  return result.modifiedCount > 0;
}

export async function markCell(
  roomCode: string,
  playerId: string,
  cellIndex: number,
  rawToken: string,
  bypassTokenCheck = false
): Promise<boolean> {
  if (!bypassTokenCheck && !(await verifyPlayerToken(roomCode, playerId, rawToken))) return false;

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const now = new Date();

  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, "players.playerId": playerId },
    {
      $addToSet: { "players.$.marked": cellIndex } as any,
      $push: { "players.$.markHistory": { cellIndex, markedAt: now } } as any,
      $set: { updatedAt: now },
    }
  );
  return result.modifiedCount > 0;
}

export async function unmarkCell(
  roomCode: string,
  playerId: string,
  cellIndex: number,
  rawToken: string,
  bypassTokenCheck = false
): Promise<boolean> {
  if (!bypassTokenCheck && !(await verifyPlayerToken(roomCode, playerId, rawToken))) return false;

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, "players.playerId": playerId },
    {
      $pull: { "players.$.marked": cellIndex } as any,
      $set: { updatedAt: new Date() },
    }
  );
  return result.modifiedCount > 0;
}

export function checkWinByCondition(
  marked: number[],
  cells: string[],
  rows: number,
  columns: number,
  winCondition: WinCondition,
  variant: BingoVariant = "custom"
): boolean {
  return checkWinByGrid(marked, cells, rows, columns, winCondition, variant);
}

export function detectWinPattern(
  marked: number[],
  cells: string[],
  rows: number,
  columns: number,
  variant: BingoVariant = "custom"
): string | null {
  if (variant === "classic90") {
    const markedSet = new Set(marked);
    const completedRows = Array.from({ length: rows }, (_, row) => {
      const rowIndices = Array.from({ length: columns }, (_, column) => row * columns + column)
        .filter((index) => (cells[index] || "").trim());
      return rowIndices.length > 0 && rowIndices.every((index) => markedSet.has(index));
    }).filter(Boolean).length;
    if (completedRows >= 3) return "full_house";
    if (completedRows >= 2) return "two_lines";
    if (completedRows >= 1) return "one_line";
    return null;
  }

  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => marked.includes(r * columns + c))
  );
  // Check rows
  for (let r = 0; r < rows; r++) {
    if (grid[r]?.every(Boolean)) return "row";
  }
  // Check columns
  for (let c = 0; c < columns; c++) {
    if (grid.map(row => row[c] ?? false).every(Boolean)) return "column";
  }
  // Check main diagonal (top-left to bottom-right)
  if (rows === columns && Array.from({ length: rows }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return "diagonal";
  // Check anti-diagonal (top-right to bottom-left)
  if (rows === columns && Array.from({ length: rows }, (_, i) => grid[i]?.[columns - 1 - i] ?? false).every(Boolean)) return "diagonal";
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
  bypassTokenCheck = false
): Promise<{ valid: boolean; playerName?: string; verificationCode?: string; gameEnded?: boolean }> {
  if (!bypassTokenCheck && !(await verifyPlayerToken(roomCode, playerId, rawToken))) return { valid: false };

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({ roomCode });
  if (!room || room.status !== "active") return { valid: false };

  const player = room.players.find(p => p.playerId === playerId);
  if (!player) return { valid: false };

  // Don't allow double-claiming
  if (player.hasBingo) return { valid: false };

  const settings = room.settings ?? DEFAULT_SETTINGS;
  const variant = normalizeBingoVariant(room.bingoVariant);
  const gridShape = getBingoGridShape(room);

  // Verify that all marked cells correspond to called items or free space
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

  // Check win by configured condition
  if (!checkWinByCondition(
    player.marked,
    player.cells,
    gridShape.rows,
    gridShape.columns,
    settings.winCondition,
    variant
  )) return { valid: false };

  const now = new Date();
  const verificationCode = generateWinnerVerificationCode();
  const winner: GameWinner = { playerId, playerName: player.playerName, verificationCode, claimedAt: now };
  const isFirstWinner = (room.winners ?? []).length === 0;

  if (settings.allowMultipleWinners) {
    // Game continues — mark player as won but don't finish
    const updateFields: Record<string, any> = {
      "players.$.hasBingo": true,
      updatedAt: now,
    };
    // Set winnerId/winnerName for the first winner only
    if (isFirstWinner) {
      updateFields.winnerId = playerId;
      updateFields.winnerName = player.playerName;
    }

    await db.collection<GameRoom>("game_rooms").updateOne(
      { _id: room._id, "players.playerId": playerId },
      {
        $set: updateFields,
        $push: { winners: winner } as any,
      }
    );

    return { valid: true, playerName: player.playerName, verificationCode, gameEnded: false };
  } else {
    // Single winner — end the game
    await db.collection<GameRoom>("game_rooms").updateOne(
      { _id: room._id, "players.playerId": playerId },
      {
        $set: {
          "players.$.hasBingo": true,
          status: "finished",
          endedAt: now,
          winnerId: playerId,
          winnerName: player.playerName,
          updatedAt: now,
        },
        $push: { winners: winner } as any,
      }
    );

    return { valid: true, playerName: player.playerName, verificationCode, gameEnded: true };
  }
}

export async function endGame(roomCode: string, hostUserId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const now = new Date();
  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, hostUserId },
    { $set: { status: "finished", endedAt: now, updatedAt: now } }
  );
  return result.modifiedCount > 0;
}

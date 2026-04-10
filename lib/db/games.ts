import crypto from "crypto";
import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import { trackActivity } from "@/lib/activity";

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
export type WinCondition = "standard" | "four_corners" | "blackout";

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
  hostEmail?: string
): Promise<GameRoom> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

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
    wordList: wordList.filter(w => w.trim()),
    size,
    freeSpace,
    calledItems: [],
    callHistory: [],
    players: [],
    status: "waiting",
    settings: { ...DEFAULT_SETTINGS },
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

  const totalCells = room.size * room.size;
  const cells = generateCardCells(room.wordList, room.size, room.freeSpace);

  const playerId = new ObjectId().toString();
  const { raw: playerToken, hash: playerTokenHash } = generatePlayerToken();
  const player: GamePlayer = {
    playerId,
    playerTokenHash,
    userId: userId || undefined,
    email: email || undefined,
    playerName: finalName,
    cells,
    marked: room.freeSpace ? [Math.floor(totalCells / 2)] : [],
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
    const cells = generateCardCells(room.wordList, room.size, room.freeSpace);
    const totalCells = room.size * room.size;
    const { hash: hostTokenHash } = generatePlayerToken();
    hostPlayer = {
      playerId: new ObjectId().toString(),
      playerTokenHash: hostTokenHash,
      userId: hostUserId,
      email: room.hostEmail || undefined,
      playerName: (room.hostName || "Host") + " (Host)",
      cells,
      marked: room.freeSpace ? [Math.floor(totalCells / 2)] : [],
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

  const result = await db.collection<GameRoom>("game_rooms").findOneAndUpdate(
    { roomCode, hostUserId, status: "active" },
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

function checkStandardBingo(marked: number[], size: number): boolean {
  const grid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => marked.includes(r * size + c))
  );
  for (let r = 0; r < size; r++) {
    if (grid[r]?.every(Boolean)) return true;
  }
  for (let c = 0; c < size; c++) {
    if (grid.map(row => row[c] ?? false).every(Boolean)) return true;
  }
  if (Array.from({ length: size }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return true;
  if (Array.from({ length: size }, (_, i) => grid[i]?.[size - 1 - i] ?? false).every(Boolean)) return true;
  return false;
}

function checkFourCorners(marked: number[], size: number): boolean {
  const corners = [0, size - 1, size * (size - 1), size * size - 1];
  return corners.every(idx => marked.includes(idx));
}

function checkBlackout(marked: number[], size: number): boolean {
  return marked.length >= size * size;
}

export function checkWinByCondition(marked: number[], size: number, winCondition: WinCondition): boolean {
  switch (winCondition) {
    case "four_corners": return checkFourCorners(marked, size);
    case "blackout": return checkBlackout(marked, size);
    default: return checkStandardBingo(marked, size);
  }
}

export function detectWinPattern(marked: number[], size: number): string | null {
  const grid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => marked.includes(r * size + c))
  );
  // Check rows
  for (let r = 0; r < size; r++) {
    if (grid[r]?.every(Boolean)) return "row";
  }
  // Check columns
  for (let c = 0; c < size; c++) {
    if (grid.map(row => row[c] ?? false).every(Boolean)) return "column";
  }
  // Check main diagonal (top-left to bottom-right)
  if (Array.from({ length: size }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return "diagonal";
  // Check anti-diagonal (top-right to bottom-left)
  if (Array.from({ length: size }, (_, i) => grid[i]?.[size - 1 - i] ?? false).every(Boolean)) return "diagonal";
  // Check four corners
  if (
    grid[0]?.[0] &&
    grid[0]?.[size - 1] &&
    grid[size - 1]?.[0] &&
    grid[size - 1]?.[size - 1]
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
): Promise<{ valid: boolean; playerName?: string; gameEnded?: boolean }> {
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

  // Verify that all marked cells correspond to called items or free space
  const calledSet = new Set(room.calledItems);
  const freeIdx = room.freeSpace ? Math.floor(room.size * room.size / 2) : -1;

  for (const idx of player.marked) {
    if (idx === freeIdx) continue;
    const cellValue = player.cells[idx]!;
    if (!calledSet.has(cellValue)) return { valid: false };
  }

  // Check win by configured condition
  if (!checkWinByCondition(player.marked, room.size, settings.winCondition)) return { valid: false };

  const now = new Date();
  const winner: GameWinner = { playerId, playerName: player.playerName, claimedAt: now };
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

    return { valid: true, playerName: player.playerName, gameEnded: false };
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

    return { valid: true, playerName: player.playerName, gameEnded: true };
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

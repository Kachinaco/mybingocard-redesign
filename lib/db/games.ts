import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";

export interface GamePlayer {
  playerId: string;
  playerName: string;
  cells: string[];
  marked: number[];
  hasBingo: boolean;
  joinedAt: Date;
}

export interface GameRoom {
  _id: ObjectId;
  roomCode: string;
  hostUserId: string;
  sourceCardId: string;
  title: string;
  wordList: string[];
  size: 3 | 4 | 5;
  freeSpace: boolean;
  calledItems: string[];
  players: GamePlayer[];
  status: "waiting" | "active" | "finished";
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
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
  style: GameRoom["style"]
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
    sourceCardId,
    title,
    wordList: wordList.filter(w => w.trim()),
    size,
    freeSpace,
    calledItems: [],
    players: [],
    status: "waiting",
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
  return db.collection<GameRoom>("game_rooms").findOne({ roomCode });
}

export async function joinGameRoom(
  roomCode: string,
  playerName: string
): Promise<{ player: GamePlayer; room: GameRoom } | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({ roomCode });
  if (!room || room.status === "finished") return null;

  const totalCells = room.size * room.size;
  const neededCells = room.freeSpace ? totalCells - 1 : totalCells;

  // Shuffle word list and pick cells for this player
  const shuffled = shuffleArray(room.wordList);
  let cells: string[];
  if (shuffled.length >= neededCells) {
    cells = shuffled.slice(0, neededCells);
  } else {
    // If not enough words, repeat some
    cells = [];
    for (let i = 0; i < neededCells; i++) {
      cells.push(shuffled[i % shuffled.length]!);
    }
    cells = shuffleArray(cells);
  }

  // Insert free space in center
  if (room.freeSpace) {
    const center = Math.floor(totalCells / 2);
    cells.splice(center, 0, "FREE");
  }

  const playerId = new ObjectId().toString();
  const player: GamePlayer = {
    playerId,
    playerName: playerName.trim(),
    cells,
    marked: room.freeSpace ? [Math.floor(totalCells / 2)] : [],
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
  return { player, room: updatedRoom! };
}

export async function startGame(roomCode: string, hostUserId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, hostUserId, status: "waiting" },
    { $set: { status: "active", updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function callItem(
  roomCode: string,
  hostUserId: string,
  item: string
): Promise<GameRoom | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<GameRoom>("game_rooms").findOneAndUpdate(
    { roomCode, hostUserId, status: "active" },
    {
      $push: { calledItems: item } as any,
      $set: { updatedAt: new Date() },
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

  const updated = await db.collection<GameRoom>("game_rooms").findOneAndUpdate(
    { _id: room._id },
    {
      $push: { calledItems: item } as any,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  return updated ? { item, room: updated } : null;
}

export async function markCell(
  roomCode: string,
  playerId: string,
  cellIndex: number
): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, "players.playerId": playerId },
    {
      $addToSet: { "players.$.marked": cellIndex } as any,
      $set: { updatedAt: new Date() },
    }
  );
  return result.modifiedCount > 0;
}

export async function unmarkCell(
  roomCode: string,
  playerId: string,
  cellIndex: number
): Promise<boolean> {
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

function checkBingoWin(marked: number[], size: number): boolean {
  const grid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => marked.includes(r * size + c))
  );
  // Rows
  for (let r = 0; r < size; r++) {
    if (grid[r]?.every(Boolean)) return true;
  }
  // Cols
  for (let c = 0; c < size; c++) {
    if (grid.map(row => row[c] ?? false).every(Boolean)) return true;
  }
  // Diagonals
  if (Array.from({ length: size }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return true;
  if (Array.from({ length: size }, (_, i) => grid[i]?.[size - 1 - i] ?? false).every(Boolean)) return true;
  return false;
}

export async function claimBingo(
  roomCode: string,
  playerId: string
): Promise<{ valid: boolean; playerName?: string }> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const room = await db.collection<GameRoom>("game_rooms").findOne({ roomCode });
  if (!room || room.status !== "active") return { valid: false };

  const player = room.players.find(p => p.playerId === playerId);
  if (!player) return { valid: false };

  // Verify that all marked cells correspond to called items or free space
  const calledSet = new Set(room.calledItems);
  const freeIdx = room.freeSpace ? Math.floor(room.size * room.size / 2) : -1;

  for (const idx of player.marked) {
    if (idx === freeIdx) continue;
    const cellValue = player.cells[idx]!;
    if (!calledSet.has(cellValue)) return { valid: false };
  }

  // Check if marked cells form a bingo
  if (!checkBingoWin(player.marked, room.size)) return { valid: false };

  // Valid bingo!
  await db.collection<GameRoom>("game_rooms").updateOne(
    { _id: room._id, "players.playerId": playerId },
    {
      $set: {
        "players.$.hasBingo": true,
        status: "finished",
        winnerId: playerId,
        winnerName: player.playerName,
        updatedAt: new Date(),
      },
    }
  );

  return { valid: true, playerName: player.playerName };
}

export async function endGame(roomCode: string, hostUserId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<GameRoom>("game_rooms").updateOne(
    { roomCode, hostUserId },
    { $set: { status: "finished", updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

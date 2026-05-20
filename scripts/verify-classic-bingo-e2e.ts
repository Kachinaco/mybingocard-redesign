import clientPromise from "../lib/mongodb";
import {
  callItem,
  claimBingo,
  createGameRoom,
  joinGameRoom,
  markCell,
  startGame,
} from "../lib/db/games";
import {
  createSeededRng,
  generateClassic75Card,
  generateClassic90Ticket,
  validateClassic75Cells,
  validateClassic90Cells,
} from "../lib/classic-bingo";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function markCalledLine(
  roomCode: string,
  hostUserId: string,
  playerId: string,
  playerToken: string,
  cells: string[],
  indices: number[],
) {
  for (const index of indices) {
    const item = cells[index];
    assert(item && item.trim(), `Cell ${index} is not callable`);
    const calledRoom = await callItem(roomCode, hostUserId, item);
    assert(calledRoom, `Failed to call ${item}`);
    const marked = await markCell(roomCode, playerId, index, playerToken);
    assert(marked, `Failed to mark cell ${index}`);
  }
}

async function main() {
  const hostUserId = `classic-e2e-${Date.now()}`;
  const style = {
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    borderColor: "#cbd5e1",
    fontSize: "14px",
    fontFamily: "Arial",
  };

  try {
    const room75 = await createGameRoom(
      hostUserId,
      "classic-e2e-source-75",
      "75-Ball E2E",
      generateClassic75Card(createSeededRng(75)),
      5,
      true,
      style,
      "E2E Host",
      "e2e@example.com",
      { rows: 5, columns: 5, bingoVariant: "classic75" },
    );

    assert(room75.rows === 5 && room75.columns === 5, "75-ball room shape was not persisted");
    assert(room75.wordList.length === 75, "75-ball call pool should contain 75 calls");
    assert(room75.wordList.includes("B-1") && room75.wordList.includes("O-75"), "75-ball call pool is missing endpoints");

    const joined75 = await joinGameRoom(room75.roomCode, "Classic Alice");
    assert(joined75, "Failed to join 75-ball room");
    assert(validateClassic75Cells(joined75.player.cells), "Joined player did not receive a valid 75-ball card");

    const started75 = await startGame(room75.roomCode, hostUserId, false);
    assert(started75.started, "Failed to start 75-ball game");
    assert(!(await callItem(room75.roomCode, hostUserId, "FREE")), "75-ball game accepted an invalid call");

    await markCalledLine(
      room75.roomCode,
      hostUserId,
      joined75.player.playerId,
      joined75.playerToken,
      joined75.player.cells,
      [0, 1, 2, 3, 4],
    );
    assert(!(await callItem(room75.roomCode, hostUserId, joined75.player.cells[0]!)), "75-ball game accepted a duplicate call");

    const claim75 = await claimBingo(room75.roomCode, joined75.player.playerId, joined75.playerToken);
    assert(claim75.valid && claim75.verificationCode, "75-ball row bingo claim was not accepted");

    const room90 = await createGameRoom(
      hostUserId,
      "classic-e2e-source-90",
      "90-Ball E2E",
      generateClassic90Ticket(createSeededRng(90)),
      3,
      false,
      style,
      "E2E Host",
      "e2e@example.com",
      { rows: 3, columns: 9, bingoVariant: "classic90" },
    );

    assert(room90.rows === 3 && room90.columns === 9, "90-ball room shape was not persisted");
    assert(room90.wordList.length === 90, "90-ball call pool should contain 90 calls");
    assert(room90.settings.winCondition === "one_line", "90-ball default win condition should be one line");

    const joined90 = await joinGameRoom(room90.roomCode, "Classic Bob");
    assert(joined90, "Failed to join 90-ball room");
    assert(validateClassic90Cells(joined90.player.cells), "Joined player did not receive a valid 90-ball ticket");

    const started90 = await startGame(room90.roomCode, hostUserId, false);
    assert(started90.started, "Failed to start 90-ball game");

    const firstRowIndices = joined90.player.cells
      .slice(0, 9)
      .map((cell, index) => (cell.trim() ? index : -1))
      .filter((index) => index >= 0);
    assert(firstRowIndices.length === 5, "90-ball first row did not have five numbers");

    await markCalledLine(
      room90.roomCode,
      hostUserId,
      joined90.player.playerId,
      joined90.playerToken,
      joined90.player.cells,
      firstRowIndices,
    );

    const claim90 = await claimBingo(room90.roomCode, joined90.player.playerId, joined90.playerToken);
    assert(claim90.valid && claim90.verificationCode, "90-ball one-line claim was not accepted");

    console.log("Classic bingo E2E passed", {
      room75: room75.roomCode,
      room90: room90.roomCode,
    });
  } finally {
    const client = await clientPromise;
    await client
      .db("mybingocard")
      .collection("game_rooms")
      .deleteMany({ hostUserId });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

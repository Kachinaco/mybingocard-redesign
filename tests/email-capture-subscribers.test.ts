import { describe, expect, mock, test } from "bun:test";
import { upsertEmailSubscriber } from "@/lib/email-capture/subscribers";

describe("upsertEmailSubscriber", () => {
  test("creates a normalized Mongo subscriber record for a new capture", async () => {
    const now = new Date("2026-04-23T20:30:00.000Z");
    const updateOne = mock(async () => ({ matchedCount: 0, upsertedCount: 1 }));

    const result = await upsertEmailSubscriber(
      { updateOne },
      " TestUser@Example.com ",
      "popup",
      now
    );

    expect(updateOne).toHaveBeenCalledWith(
      { email: "testuser@example.com" },
      {
        $setOnInsert: {
          email: "testuser@example.com",
          source: "popup",
          subscribedAt: now,
          unsubscribedAt: null,
        },
        $set: {
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    expect(result).toEqual({
      email: "testuser@example.com",
      duplicate: false,
    });
  });

  test("treats an existing Mongo subscriber as a duplicate capture", async () => {
    const updateOne = mock(async () => ({ matchedCount: 1, upsertedCount: 0 }));

    const result = await upsertEmailSubscriber(
      { updateOne },
      "repeat@example.com",
      undefined,
      new Date("2026-04-23T20:35:00.000Z")
    );

    expect(result).toEqual({
      email: "repeat@example.com",
      duplicate: true,
    });
  });
});

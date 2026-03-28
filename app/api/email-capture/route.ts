import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { trackActivity, getRequestActivityContext } from "@/lib/activity";

const DB_PATH = path.join(process.cwd(), "bingo.db");

function getDb() {
  const db = new Database(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS email_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'popup',
    subscribed_at TEXT DEFAULT (datetime('now')),
    unsubscribed_at TEXT DEFAULT NULL
  )`);
  return db;
}

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const db = getDb();
    let duplicate = false;
    try {
      const stmt = db.prepare("INSERT OR IGNORE INTO email_subscribers (email, source) VALUES (?, ?)");
      const result = stmt.run(email.toLowerCase().trim(), source || "popup");
      duplicate = result.changes === 0;
    } finally {
      db.close();
    }

    const reqCtx = getRequestActivityContext(request);
    trackActivity({
      event: "email_captured",
      source: "server",
      userId: null,
      email: email.toLowerCase().trim(),
      pathname: "/api/email-capture",
      domain: reqCtx.domain,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
      metadata: {
        source: source || "popup",
        duplicate,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Thanks! Check your email for your free templates." });
  } catch (error) {
    console.error("Email capture error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getUsersForExport } from "@/lib/db/users";

export async function GET() {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersForExport();

    const header =
      "email,name,planType,subscriptionStatus,signupMethod,createdAt,totalCardsCreated,totalExports";

    const rows = users.map((u) => {
      const fields = [
        escapeCsv(u.email || ""),
        escapeCsv(u.name || ""),
        escapeCsv(u.planType || "FREE"),
        escapeCsv(u.subscriptionStatus || "inactive"),
        escapeCsv(u.signupMethod || ""),
        u.createdAt ? new Date(u.createdAt).toISOString() : "",
        String(u.totalCardsCreated ?? 0),
        String(u.totalExports ?? 0),
      ];
      return fields.join(",");
    });

    const csv = [header, ...rows].join("\n");
    const filename = `mybingocard-users-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export users error:", error);
    return NextResponse.json(
      { error: "Failed to export users" },
      { status: 500 }
    );
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { getAdminVisitorsData } from "@/lib/admin-live-visitors";
import AdminVisitorsClient from "./AdminVisitorsClient";

function numberParam(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringParam(value: string | undefined) {
  return value && value.trim() ? value.trim().slice(0, 128) : null;
}

export default async function AdminVisitorsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    anonymousId?: string;
    sessionId?: string;
    visitorKey?: string;
    periodHours?: string;
    limit?: string;
  }>;
}) {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const initialData = await getAdminVisitorsData({
    liveWindowMinutes: 5,
    periodHours: numberParam(params?.periodHours, 24),
    limit: numberParam(params?.limit, 100),
    anonymousId: stringParam(params?.anonymousId),
    sessionId: stringParam(params?.sessionId),
    visitorKey: stringParam(params?.visitorKey),
  });

  return <AdminVisitorsClient initialData={initialData} />;
}

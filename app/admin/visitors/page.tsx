import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { getAdminVisitorsData } from "@/lib/admin-live-visitors";
import AdminVisitorsClient from "./AdminVisitorsClient";

export default async function AdminVisitorsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const initialData = await getAdminVisitorsData({
    liveWindowMinutes: 5,
    periodHours: 24,
    limit: 100,
  });

  return <AdminVisitorsClient initialData={initialData} />;
}

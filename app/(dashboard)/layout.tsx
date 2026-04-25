import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { headers } from "next/headers";

export default async function DashboardGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") ?? "ID";

  return <DashboardLayout country={country}>{children}</DashboardLayout>;
}
